package com.example.LaptopWorld_project.admin.service;

import com.example.LaptopWorld_project.admin.dto.AdminCreateOrderRequest;
import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.entity.ProductImage;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.order.dto.OrderDetailDto;
import com.example.LaptopWorld_project.order.entity.*;
import com.example.LaptopWorld_project.order.mapper.OrderMapper;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import com.example.LaptopWorld_project.order.service.OrderCodeGenerator;
import com.example.LaptopWorld_project.user.entity.Address;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.AddressRepository;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Admin tạo đơn thay khách. Đơn giản hóa so với checkout user:
 *   - Không phụ thuộc cart
 *   - Không voucher
 *   - Shipping fee = 0 (admin có thể chỉnh sau nếu cần)
 *   - Status ban đầu = confirmed (admin đã "xác nhận" luôn khi tạo)
 *   - COD/manual → payment_status = unpaid; VNPay/MoMo → paid (giả định admin đã thu tiền)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminOrderCreateService {

    private static final int MAX_CODE_RETRY = 5;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final OrderCodeGenerator codeGenerator;
    private final OrderMapper orderMapper;

    @Transactional
    public OrderDetailDto create(AdminCreateOrderRequest req) {
        // 1. User
        User user = userRepository.findById(req.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User", req.userId()));

        // 2. Địa chỉ — priority: addressId (từ address book) > manual fields
        String shipName, shipPhone, shipAddr;
        if (req.addressId() != null) {
            Address address = addressRepository.findByIdAndUserId(req.addressId(), req.userId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Địa chỉ không tồn tại hoặc không thuộc khách hàng này"));
            shipName  = address.getName();
            shipPhone = address.getPhone();
            shipAddr  = buildFullAddress(address);
        } else {
            if (req.manualName() == null || req.manualName().isBlank()
                    || req.manualPhone() == null || req.manualPhone().isBlank()
                    || req.manualAddress() == null || req.manualAddress().isBlank()) {
                throw new BusinessException("ADDRESS_REQUIRED",
                        "Chưa có địa chỉ giao hàng. Chọn từ sổ hoặc nhập thủ công (họ tên + SĐT + địa chỉ).");
            }
            shipName  = req.manualName().trim();
            shipPhone = req.manualPhone().trim();
            shipAddr  = req.manualAddress().trim();
        }

        // 3. Build order + reserve stock từng SP (race-safe qua pessimistic lock)
        Order order = new Order();
        order.setUser(user);
        BigDecimal subtotal = BigDecimal.ZERO;

        for (AdminCreateOrderRequest.OrderItemInput it : req.items()) {
            Product p = productRepository.findByIdForUpdate(it.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", it.productId()));
            if (!p.isActive()) {
                throw new BusinessException("PRODUCT_INACTIVE",
                        "Sản phẩm '" + p.getName() + "' đã ngừng bán");
            }
            int available = p.getAvailableStock();
            if (it.quantity() > available) {
                throw new BusinessException("INSUFFICIENT_STOCK",
                        "Sản phẩm '" + p.getName() + "' không đủ tồn (còn " + available + ")");
            }
            OrderDetail d = new OrderDetail();
            d.setProduct(p);
            d.setProductName(p.getName());
            d.setProductImage(primaryImagePath(p));
            d.setQuantity(it.quantity());
            d.setPriceAtPurchase(p.getEffectivePrice());
            order.addDetail(d);
            subtotal = subtotal.add(d.getLineTotal());

            // Reserve
            p.setReservedStock(p.getReservedStock() + it.quantity());
            productRepository.save(p);
        }

        order.setSubtotal(subtotal);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setShippingFee(BigDecimal.ZERO);
        order.setTotal(subtotal);

        // 4. Shipping snapshot
        order.setShippingName(shipName);
        order.setShippingPhone(shipPhone);
        order.setShippingAddress(shipAddr);
        order.setShippingMethod("standard");

        // 5. Payment
        order.setPaymentMethod(req.paymentMethod());
        if (req.paymentMethod() == PaymentMethod.vnpay || req.paymentMethod() == PaymentMethod.momo) {
            order.setPaymentStatus(PaymentStatus.paid);
        } else {
            order.setPaymentStatus(PaymentStatus.unpaid);
        }

        // 6. Admin tạo đơn = đã xác nhận
        order.setStatus(OrderStatus.confirmed);
        if (req.adminNote() != null && !req.adminNote().isBlank()) {
            order.setAdminNote(req.adminNote());
        }

        Order saved = saveWithUniqueCode(order);
        log.info("Admin tạo đơn thành công: code={} userId={} total={}",
                saved.getCode(), user.getId(), saved.getTotal());
        return orderMapper.toDetail(saved);
    }

    private Order saveWithUniqueCode(Order order) {
        for (int i = 0; i < MAX_CODE_RETRY; i++) {
            try {
                order.setCode(codeGenerator.next());
                return orderRepository.saveAndFlush(order);
            } catch (DataIntegrityViolationException ex) {
                log.warn("Order code collision, retry {}/{}", i + 1, MAX_CODE_RETRY);
            }
        }
        throw new BusinessException("ORDER_CODE_COLLISION",
                "Không sinh được mã đơn duy nhất sau " + MAX_CODE_RETRY + " lần thử");
    }

    private String buildFullAddress(Address a) {
        StringBuilder sb = new StringBuilder(a.getAddress());
        if (a.getWard()     != null && !a.getWard().isBlank())     sb.append(", ").append(a.getWard());
        if (a.getDistrict() != null && !a.getDistrict().isBlank()) sb.append(", ").append(a.getDistrict());
        if (a.getProvince() != null && !a.getProvince().isBlank()) sb.append(", ").append(a.getProvince());
        return sb.toString();
    }

    private String primaryImagePath(Product p) {
        return p.getImages().stream()
                .filter(ProductImage::isPrimary)
                .map(ProductImage::getPath)
                .findFirst()
                .orElseGet(() -> p.getImages().isEmpty() ? null : p.getImages().get(0).getPath());
    }
}
