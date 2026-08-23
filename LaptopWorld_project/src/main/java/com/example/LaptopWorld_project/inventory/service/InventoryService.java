package com.example.LaptopWorld_project.inventory.service;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.inventory.dto.CreateManualIssueRequest;
import com.example.LaptopWorld_project.inventory.dto.ManualIssueItemRequest;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssue;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueDetail;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueStatus;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueType;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptDetail;
import com.example.LaptopWorld_project.inventory.repository.GoodsIssueRepository;
import com.example.LaptopWorld_project.inventory.repository.GoodsReceiptDetailRepository;
import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.entity.OrderDetail;
import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Quản lý kho theo FIFO — trừ hàng từ batch nhập sớm nhất trước.
 *
 * Vòng đời phiếu xuất kho (goods_issue):
 *   pending → completed (kho duyệt, FIFO chạy)
 *           → cancelled (kho từ chối HOẶC đơn hàng bị hủy sau khi đã trừ kho)
 *
 * Hai cách phiếu pending được tạo:
 *   - AUTO: OrderService gọi createPendingIssueForOrder khi order chuyển confirmed → preparing
 *   - MANUAL: admin tạo tay qua createManualPendingIssue (Sprint 6 bước 7)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final GoodsReceiptDetailRepository goodsReceiptDetailRepository;
    private final GoodsIssueRepository goodsIssueRepository;
    private final ProductRepository productRepository;
    private final com.example.LaptopWorld_project.inventory.repository.PartnerRepository partnerRepository;

    // ==================== TẠO PHIẾU PENDING (chưa trừ kho) ====================

    /**
     * Được gọi khi order chuyển confirmed → preparing.
     * Tạo phiếu xuất kho type=auto status=pending kèm stub details (goodsReceiptDetail=NULL).
     * KHÔNG chạy FIFO, KHÔNG trừ kho — kho cần duyệt phiếu để trừ.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public GoodsIssue createPendingIssueForOrder(Order order, User author) {
        Optional<GoodsIssue> pending = goodsIssueRepository
                .findByOrderIdAndStatus(order.getId(), GoodsIssueStatus.pending);
        if (pending.isPresent()) {
            log.warn("Order {} đã có phiếu xuất pending #{}, bỏ qua tạo mới",
                    order.getCode(), pending.get().getId());
            return pending.get();
        }
        Optional<GoodsIssue> completed = goodsIssueRepository
                .findByOrderIdAndStatus(order.getId(), GoodsIssueStatus.completed);
        if (completed.isPresent()) {
            log.warn("Order {} đã có phiếu xuất completed #{}, bỏ qua",
                    order.getCode(), completed.get().getId());
            return completed.get();
        }

        GoodsIssue issue = new GoodsIssue();
        issue.setOrder(order);
        issue.setType(GoodsIssueType.auto);
        issue.setAuthor(author);
        issue.setStatus(GoodsIssueStatus.pending);
        issue.setCode(generateCode());

        for (OrderDetail od : order.getDetails()) {
            if (od.getProduct() == null) {
                throw new BusinessException("PRODUCT_MISSING",
                        "Sản phẩm '" + od.getProductName() + "' đã bị xóa, không thể tạo phiếu xuất");
            }
            issue.addDetail(buildStub(od.getProduct(), od.getQuantity()));
        }

        GoodsIssue saved = goodsIssueRepository.save(issue);
        log.info("Tạo phiếu xuất pending {} cho đơn {}", saved.getCode(), order.getCode());
        return saved;
    }

    /**
     * Admin tạo phiếu xuất manual (không gắn đơn hàng) — vd xuất hủy hàng lỗi, tặng quà.
     * Phiếu ở trạng thái pending, cần đi qua approveIssue để FIFO chạy và trừ kho.
     */
    @Transactional
    public GoodsIssue createManualPendingIssue(CreateManualIssueRequest req, User author) {
        GoodsIssue issue = new GoodsIssue();
        issue.setOrder(null);
        issue.setType(GoodsIssueType.manual);
        issue.setAuthor(author);
        issue.setStatus(GoodsIssueStatus.pending);
        issue.setNote(req.note());
        issue.setCode(generateCode());

        for (ManualIssueItemRequest item : req.items()) {
            Product product = productRepository.findById(item.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", item.productId()));
            issue.addDetail(buildStub(product, item.quantity()));
        }

        GoodsIssue saved = goodsIssueRepository.save(issue);
        log.info("Tạo phiếu xuất manual pending {} bởi {}",
                saved.getCode(), author != null ? author.getUsername() : "system");
        return saved;
    }

    // ==================== KHO DUYỆT / TỪ CHỐI PHIẾU ====================

    /**
     * Kho duyệt phiếu xuất: chạy FIFO, trừ kho, chuyển phiếu sang completed.
     * Nếu phiếu là auto (gắn với order), tự động chuyển order sang shipping.
     */
    @Transactional
    public GoodsIssue approveIssue(Long issueId, User actor) {
        return approveIssue(issueId, actor, null);
    }

    /**
     * Approve với option chỉ định ĐVVC cho auto issue.
     * - Nếu type=auto: bắt buộc phải có ĐVVC (từ param hoặc order đã gán trước đó).
     *   Sinh tracking number tự động theo format {partnerCode}{yyMMdd}{5 digits}.
     */
    @Transactional
    public GoodsIssue approveIssue(Long issueId, User actor, Long shippingPartnerId) {
        GoodsIssue issue = goodsIssueRepository.findWithDetailsById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("GoodsIssue", issueId));

        if (issue.getStatus() != GoodsIssueStatus.pending) {
            throw new BusinessException("ISSUE_NOT_PENDING",
                    "Phiếu xuất không ở trạng thái chờ duyệt (hiện tại: " + issue.getStatus() + ")");
        }

        // Bàn giao ĐVVC — chỉ áp dụng cho auto issue (gắn với order)
        com.example.LaptopWorld_project.inventory.entity.Partner shippingPartner = null;
        if (issue.getType() == GoodsIssueType.auto && issue.getOrder() != null) {
            Order order = issue.getOrder();
            Long effectivePartnerId = shippingPartnerId != null ? shippingPartnerId : order.getPartnerId();
            if (effectivePartnerId == null) {
                throw new BusinessException("SHIPPING_PARTNER_REQUIRED",
                        "Cần chọn đơn vị vận chuyển trước khi bàn giao.");
            }
            shippingPartner = partnerRepository.findById(effectivePartnerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Partner", effectivePartnerId));
            if (shippingPartner.getType() != com.example.LaptopWorld_project.inventory.entity.PartnerType.shipping_provider) {
                throw new BusinessException("PARTNER_NOT_SHIPPING",
                        "Đối tác đã chọn không phải đơn vị vận chuyển.");
            }
        }

        // Snapshot danh sách sản phẩm cần xuất TRƯỚC khi xóa stub
        List<TargetItem> targets = collectTargets(issue);

        // Xóa stub details cũ (goodsReceiptDetail = NULL)
        issue.getDetails().clear();

        // Chạy FIFO cho từng target — trong 1 pass, thất bại giữa chừng rollback tất cả
        BigDecimal totalCogs = BigDecimal.ZERO;
        for (TargetItem t : targets) {
            totalCogs = totalCogs.add(consumeBatchesFifo(issue, t.product, t.quantity));
        }

        issue.setTotalCogs(totalCogs);
        issue.setStatus(GoodsIssueStatus.completed);
        if (issue.getAuthor() == null && actor != null) {
            issue.setAuthor(actor);
        }

        // Auto: đẩy order sang shipping + gán ĐVVC + sinh tracking
        if (issue.getType() == GoodsIssueType.auto && issue.getOrder() != null && shippingPartner != null) {
            Order order = issue.getOrder();
            order.setStatus(OrderStatus.shipping);
            order.setPartnerId(shippingPartner.getId());
            // Sinh tracking nếu order chưa có (không ghi đè khi đã set từ user checkout)
            if (order.getTrackingNumber() == null || order.getTrackingNumber().isBlank()) {
                order.setTrackingNumber(
                        com.example.LaptopWorld_project.inventory.util.TrackingNumberGenerator
                                .generate(shippingPartner.getCode()));
            }
            log.info("Order {} tự chuyển preparing → shipping | ĐVVC={} | tracking={}",
                    order.getCode(), shippingPartner.getCode(), order.getTrackingNumber());
        }

        GoodsIssue saved = goodsIssueRepository.save(issue);
        log.info("Đã duyệt phiếu xuất {}, COGS = {}", saved.getCode(), totalCogs);
        return saved;
    }

    /**
     * Kho từ chối phiếu xuất: đánh dấu cancelled, KHÔNG trừ kho (chưa trừ mà).
     * Nếu phiếu là auto (gắn với order), tự động đưa order về confirmed để sales xử lý lại.
     */
    @Transactional
    public GoodsIssue rejectIssue(Long issueId, String reason) {
        GoodsIssue issue = goodsIssueRepository.findWithDetailsById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("GoodsIssue", issueId));

        if (issue.getStatus() != GoodsIssueStatus.pending) {
            throw new BusinessException("ISSUE_NOT_PENDING",
                    "Phiếu xuất không ở trạng thái chờ duyệt (hiện tại: " + issue.getStatus() + ")");
        }

        issue.setStatus(GoodsIssueStatus.cancelled);
        if (reason != null && !reason.isBlank()) {
            String prev = issue.getNote() != null ? issue.getNote() + "\n" : "";
            issue.setNote(prev + "[Từ chối] " + reason);
        }

        if (issue.getType() == GoodsIssueType.auto && issue.getOrder() != null) {
            Order order = issue.getOrder();
            order.setStatus(OrderStatus.confirmed);
            log.info("Order {} tự chuyển preparing → confirmed do phiếu xuất {} bị từ chối",
                    order.getCode(), issue.getCode());
        }

        GoodsIssue saved = goodsIssueRepository.save(issue);
        log.info("Đã từ chối phiếu xuất {}", saved.getCode());
        return saved;
    }

    // ==================== HOÀN KHO KHI HỦY ĐƠN ĐÃ SHIPPING ====================

    /**
     * Hoàn kho khi cancel order đã shipping/delivered. Đảo remaining_quantity từng batch
     * và tăng lại products.stock. Đánh dấu issue status=cancelled.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void rollbackStockForOrder(Order order) {
        GoodsIssue issue = goodsIssueRepository
                .findByOrderIdAndStatus(order.getId(), GoodsIssueStatus.completed)
                .orElse(null);
        if (issue == null) {
            log.debug("Order {} không có phiếu xuất completed, bỏ qua rollback", order.getCode());
            return;
        }

        for (GoodsIssueDetail gid : issue.getDetails()) {
            GoodsReceiptDetail batch = gid.getGoodsReceiptDetail();
            if (batch != null) {
                batch.setRemainingQuantity(batch.getRemainingQuantity() + gid.getQuantity());
            }
            Product product = gid.getProduct();
            product.setStock(product.getStock() + gid.getQuantity());
        }
        issue.setStatus(GoodsIssueStatus.cancelled);
        goodsIssueRepository.save(issue);
        log.info("Đã hoàn kho phiếu xuất {} cho đơn {} (cancel)", issue.getCode(), order.getCode());
    }

    /**
     * Nếu order còn phiếu pending (chưa duyệt), hủy phiếu đó khi cancel order.
     * Không hoàn kho vì FIFO chưa chạy.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void cancelPendingIssueForOrder(Order order) {
        GoodsIssue issue = goodsIssueRepository
                .findByOrderIdAndStatus(order.getId(), GoodsIssueStatus.pending)
                .orElse(null);
        if (issue == null) return;
        issue.setStatus(GoodsIssueStatus.cancelled);
        goodsIssueRepository.save(issue);
        log.info("Đã hủy phiếu xuất pending {} do đơn {} bị hủy", issue.getCode(), order.getCode());
    }

    /**
     * Release reserved_stock cho các SP trong đơn — dùng khi cancel đơn ở giai đoạn
     * pending/confirmed/preparing (trước khi FIFO chạy). Stock chưa trừ, chỉ trả lại reserved.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseReservedStockForOrder(Order order) {
        for (com.example.LaptopWorld_project.order.entity.OrderDetail od : order.getDetails()) {
            Product p = od.getProduct();
            int newReserved = Math.max(0, p.getReservedStock() - od.getQuantity());
            p.setReservedStock(newReserved);
        }
        log.info("Đã release reserved stock cho đơn {}", order.getCode());
    }

    // ==================== helpers ====================

    private record TargetItem(Product product, int quantity) {}

    /**
     * Lấy danh sách sản phẩm cần xuất kho từ phiếu pending.
     * - Auto: ưu tiên đọc từ orderDetails (tin cậy hơn stub, đề phòng stub sai)
     * - Manual: đọc từ stub details do admin nhập
     */
    private List<TargetItem> collectTargets(GoodsIssue issue) {
        List<TargetItem> targets = new ArrayList<>();
        if (issue.getType() == GoodsIssueType.auto && issue.getOrder() != null) {
            for (OrderDetail od : issue.getOrder().getDetails()) {
                if (od.getProduct() == null) {
                    throw new BusinessException("PRODUCT_MISSING",
                            "Sản phẩm '" + od.getProductName()
                                    + "' đã bị xóa, không thể duyệt phiếu xuất");
                }
                targets.add(new TargetItem(od.getProduct(), od.getQuantity()));
            }
        } else {
            for (GoodsIssueDetail gid : issue.getDetails()) {
                if (gid.getProduct() == null) {
                    throw new BusinessException("PRODUCT_MISSING",
                            "Một sản phẩm trong phiếu đã bị xóa, không thể duyệt");
                }
                targets.add(new TargetItem(gid.getProduct(), gid.getQuantity()));
            }
        }
        return targets;
    }

    private GoodsIssueDetail buildStub(Product product, int quantity) {
        GoodsIssueDetail gid = new GoodsIssueDetail();
        gid.setGoodsReceiptDetail(null);
        gid.setProduct(product);
        gid.setQuantity(quantity);
        gid.setImportPrice(BigDecimal.ZERO);
        gid.setTotalPrice(BigDecimal.ZERO);
        return gid;
    }

    /**
     * Chạy FIFO cho 1 sản phẩm cần xuất `neededQty`. Trả về COGS của phần đã xuất.
     */
    private BigDecimal consumeBatchesFifo(GoodsIssue issue, Product product, int neededQty) {
        List<GoodsReceiptDetail> batches = goodsReceiptDetailRepository
                .findFifoBatchesForUpdate(product.getId());

        BigDecimal cogs = BigDecimal.ZERO;
        int remaining = neededQty;

        for (GoodsReceiptDetail batch : batches) {
            if (remaining <= 0) break;
            int take = Math.min(remaining, batch.getRemainingQuantity());
            if (take <= 0) continue;

            batch.setRemainingQuantity(batch.getRemainingQuantity() - take);

            BigDecimal linePrice = batch.getImportPrice().multiply(BigDecimal.valueOf(take));
            cogs = cogs.add(linePrice);

            GoodsIssueDetail gid = new GoodsIssueDetail();
            gid.setGoodsReceiptDetail(batch);
            gid.setProduct(product);
            gid.setQuantity(take);
            gid.setImportPrice(batch.getImportPrice());
            gid.setTotalPrice(linePrice);
            issue.addDetail(gid);

            remaining -= take;
        }

        if (remaining > 0) {
            throw new BusinessException("INSUFFICIENT_STOCK",
                    "Không đủ tồn kho cho sản phẩm '" + product.getName()
                            + "'. Còn thiếu " + remaining + " sản phẩm.");
        }

        product.setStock(product.getStock() - neededQty);
        // Release reserved đồng thời — khớp available_stock giữa trước/sau approve
        int newReserved = Math.max(0, product.getReservedStock() - neededQty);
        product.setReservedStock(newReserved);
        return cogs;
    }

    private String generateCode() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime startOfNextDay = startOfDay.plusDays(1);
        long todayCount = goodsIssueRepository.countByCreatedDate(startOfDay, startOfNextDay);
        return "GI-" + DATE_FMT.format(now) + "-" + String.format("%03d", todayCount + 1);
    }
}
