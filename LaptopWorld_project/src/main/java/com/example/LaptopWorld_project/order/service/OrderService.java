package com.example.LaptopWorld_project.order.service;

import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.inventory.service.InventoryService;
import com.example.LaptopWorld_project.order.dto.OrderDetailDto;
import com.example.LaptopWorld_project.order.dto.OrderListItemDto;
import com.example.LaptopWorld_project.order.dto.UpdateOrderStatusRequest;
import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.order.mapper.OrderMapper;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import com.example.LaptopWorld_project.voucher.entity.UserVoucher;
import com.example.LaptopWorld_project.voucher.entity.Voucher;
import com.example.LaptopWorld_project.voucher.repository.UserVoucherRepository;
import com.example.LaptopWorld_project.voucher.repository.VoucherRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    /**
     * Bảng transition hợp lệ khi user/admin gọi tay.
     *
     * confirmed → shipping và preparing → confirmed KHÔNG nằm trong bảng này —
     * hai transition đó do hệ thống tự chạy khi kho duyệt hoặc từ chối phiếu xuất
     * (xem {@code com.example.LaptopWorld_project.inventory.service.InventoryService}).
     */
    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = new EnumMap<>(OrderStatus.class);
    static {
        ALLOWED.put(OrderStatus.pending,   Set.of(OrderStatus.confirmed, OrderStatus.cancelled));
        ALLOWED.put(OrderStatus.confirmed, Set.of(OrderStatus.preparing, OrderStatus.cancelled));
        ALLOWED.put(OrderStatus.preparing, Set.of(OrderStatus.cancelled));
        ALLOWED.put(OrderStatus.shipping,  Set.of(OrderStatus.delivered, OrderStatus.cancelled));
        ALLOWED.put(OrderStatus.delivered, Set.of());
        ALLOWED.put(OrderStatus.cancelled, Set.of());
    }

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final InventoryService inventoryService;
    private final UserRepository userRepository;

    // ==================== USER ====================
    @Transactional(readOnly = true)
    public PagedResponse<OrderListItemDto> myOrders(Long userId, OrderStatus status, Pageable pageable) {
        Page<Order> page = status != null
                ? orderRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, status, pageable)
                : orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return PagedResponse.from(page, orderMapper::toListItem);
    }

    @Transactional(readOnly = true)
    public OrderDetailDto myOrderByCode(Long userId, String code) {
        Order order = orderRepository.findWithDetailsByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn: " + code));
        if (!order.getUser().getId().equals(userId)) {
            throw new BusinessException("FORBIDDEN", "Đơn hàng không thuộc về bạn");
        }
        return orderMapper.toDetail(order);
    }

    /**
     * User tự cancel — chỉ được cancel khi status = pending.
     */
    @Transactional
    public OrderDetailDto userCancel(Long userId, String code) {
        Order order = orderRepository.findWithDetailsByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn: " + code));
        if (!order.getUser().getId().equals(userId)) {
            throw new BusinessException("FORBIDDEN", "Đơn hàng không thuộc về bạn");
        }
        if (order.getStatus() != OrderStatus.pending) {
            throw new BusinessException("CANNOT_CANCEL",
                    "Chỉ có thể hủy đơn ở trạng thái chờ xử lý");
        }
        // User cancel chỉ khi pending → chưa có phiếu xuất, không cần author
        doTransition(order, OrderStatus.cancelled, null);
        return orderMapper.toDetail(orderRepository.save(order));
    }

    // ==================== ADMIN ====================
    @Transactional(readOnly = true)
    public long countByStatus(OrderStatus status) {
        return orderRepository.countByStatus(status);
    }

    @Transactional(readOnly = true)
    public PagedResponse<OrderListItemDto> adminSearch(String keyword,
                                                       OrderStatus status,
                                                       OffsetDateTime from,
                                                       OffsetDateTime to,
                                                       Pageable pageable) {
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (keyword != null && !keyword.isBlank()) {
                String p = "%" + keyword.toLowerCase() + "%";
                preds.add(cb.or(
                        cb.like(cb.lower(root.get("code")), p),
                        cb.like(cb.lower(root.get("shippingName")), p),
                        cb.like(root.get("shippingPhone"), p)
                ));
            }
            if (status != null) preds.add(cb.equal(root.get("status"), status));
            if (from != null) preds.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null)   preds.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(preds.toArray(new Predicate[0]));
        };
        Page<Order> page = orderRepository.findAll(spec, pageable);
        return PagedResponse.from(page, orderMapper::toListItem);
    }

    @Transactional(readOnly = true)
    public OrderDetailDto adminFindById(Long id) {
        return orderMapper.toDetail(orderRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id)));
    }

    @Transactional
    public OrderDetailDto adminUpdateStatus(Long id, UpdateOrderStatusRequest req, Long actorUserId) {
        Order order = orderRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));

        // Chặn 2 target chỉ được set bởi hệ thống (không cho phép admin gửi tay)
        if (req.status() == OrderStatus.shipping) {
            throw new BusinessException("MUST_APPROVE_ISSUE_FIRST",
                    "Không thể chuyển sang Đang giao hàng thủ công. Kho cần duyệt phiếu xuất trước.");
        }
        if (req.status() == OrderStatus.confirmed && order.getStatus() == OrderStatus.preparing) {
            throw new BusinessException("USE_REJECT_ISSUE",
                    "Không thể chuyển về Đã xác nhận thủ công. Vui lòng từ chối phiếu xuất kho.");
        }

        User actor = actorUserId != null
                ? userRepository.findById(actorUserId).orElse(null)
                : null;
        doTransition(order, req.status(), actor);
        if (req.adminNote() != null)      order.setAdminNote(req.adminNote());
        if (req.trackingNumber() != null) order.setTrackingNumber(req.trackingNumber());
        return orderMapper.toDetail(orderRepository.save(order));
    }

    // ==================== helpers ====================
    private void doTransition(Order order, OrderStatus target, User actor) {
        OrderStatus current = order.getStatus();
        if (!ALLOWED.getOrDefault(current, Set.of()).contains(target)) {
            throw new BusinessException("INVALID_TRANSITION",
                    "Không thể chuyển từ " + current + " sang " + target);
        }
        order.setStatus(target);

        // confirmed → preparing: tạo phiếu xuất kho pending (chờ kho duyệt). CHƯA trừ kho.
        if (current == OrderStatus.confirmed && target == OrderStatus.preparing) {
            order.setPreparingAt(OffsetDateTime.now());
            inventoryService.createPendingIssueForOrder(order, actor);
        }

        if (target == OrderStatus.delivered) {
            order.setDeliveredAt(OffsetDateTime.now());
            // COD: khi giao thành công thì mặc định đã thu tiền → paid
            if (order.getPaymentMethod() == com.example.LaptopWorld_project.order.entity.PaymentMethod.cod
                    && order.getPaymentStatus() != com.example.LaptopWorld_project.order.entity.PaymentStatus.paid) {
                order.setPaymentStatus(com.example.LaptopWorld_project.order.entity.PaymentStatus.paid);
            }
        }

        if (target == OrderStatus.cancelled) {
            order.setCancelledAt(OffsetDateTime.now());
            refundVoucherIfAny(order);
            // preparing → cancelled: hủy phiếu xuất pending (không hoàn kho, chưa trừ mà)
            if (current == OrderStatus.preparing) {
                inventoryService.cancelPendingIssueForOrder(order);
            }
            // Trạng thái pre-FIFO (pending / confirmed / preparing): release reserved stock
            if (current == OrderStatus.pending || current == OrderStatus.confirmed
                    || current == OrderStatus.preparing) {
                inventoryService.releaseReservedStockForOrder(order);
            }
            // shipping/delivered → cancelled: hoàn kho theo phiếu xuất completed
            if (current == OrderStatus.shipping || current == OrderStatus.delivered) {
                inventoryService.rollbackStockForOrder(order);
            }
        }

        log.info("Order {} transitioned: {} -> {}", order.getCode(), current, target);
    }

    /** Trả voucher lại khi hủy đơn: giảm used_count + unmark user_voucher. */
    private void refundVoucherIfAny(Order order) {
        Voucher v = order.getVoucher();
        if (v == null) return;
        v.decrementUsed();
        voucherRepository.save(v);

        UserVoucher uv = userVoucherRepository
                .findByUserIdAndVoucherId(order.getUser().getId(), v.getId())
                .orElse(null);
        if (uv != null && uv.getOrderId() != null && uv.getOrderId().equals(order.getId())) {
            uv.setUsed(false);
            uv.setUsedAt(null);
            uv.setOrderId(null);
            userVoucherRepository.save(uv);
        }
    }
}
