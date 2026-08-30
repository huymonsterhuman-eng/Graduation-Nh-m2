package com.example.LaptopWorld_project.inventory.service;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptCreateRequest;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptItemRequest;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptListItemDto;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceipt;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptDetail;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptStatus;
import com.example.LaptopWorld_project.inventory.entity.Partner;
import com.example.LaptopWorld_project.inventory.entity.PartnerType;
import com.example.LaptopWorld_project.inventory.mapper.GoodsReceiptMapper;
import com.example.LaptopWorld_project.inventory.repository.GoodsReceiptRepository;
import com.example.LaptopWorld_project.inventory.repository.PartnerRepository;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class GoodsReceiptService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final GoodsReceiptRepository goodsReceiptRepository;
    private final PartnerRepository partnerRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final GoodsReceiptMapper goodsReceiptMapper;

    @Transactional(readOnly = true)
    public PagedResponse<GoodsReceiptListItemDto> list(Long supplierId, Pageable pageable) {
        return list(supplierId, null, null, pageable);
    }

    /** Overload có filter khoảng ngày createdAt [from 00:00, to 24:00). */
    @Transactional(readOnly = true)
    public PagedResponse<GoodsReceiptListItemDto> list(Long supplierId,
                                                       OffsetDateTime from,
                                                       OffsetDateTime to,
                                                       Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<GoodsReceipt> spec = (root, query, cb) -> {
            java.util.List<jakarta.persistence.criteria.Predicate> preds = new java.util.ArrayList<>();
            if (supplierId != null) preds.add(cb.equal(root.get("supplier").get("id"), supplierId));
            if (from != null) preds.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null)   preds.add(cb.lessThan(root.get("createdAt"), to));
            return cb.and(preds.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        Page<GoodsReceipt> page = goodsReceiptRepository.findAll(spec, pageable);
        return PagedResponse.from(page, goodsReceiptMapper::toListItem);
    }

    @Transactional(readOnly = true)
    public GoodsReceiptDto findById(Long id) {
        GoodsReceipt receipt = goodsReceiptRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GoodsReceipt", id));
        return goodsReceiptMapper.toDto(receipt);
    }

    /**
     * Tạo phiếu nhập ở trạng thái <b>pending</b> — chưa cộng stock, {@code remaining_quantity=0}
     * (FIFO tự động skip vì query lọc {@code remaining > 0}).
     * Chờ admin gọi {@link #approve(Long, Long)} để cộng kho + kích hoạt lô cho FIFO.
     */
    @Transactional
    public GoodsReceiptDto create(Long currentUserId, GoodsReceiptCreateRequest req) {
        Partner supplier = partnerRepository.findById(req.supplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Partner", req.supplierId()));
        if (supplier.getType() != PartnerType.supplier) {
            throw new BusinessException("INVALID_SUPPLIER",
                    "Đối tác được chọn không phải nhà cung cấp");
        }
        if (!supplier.isActive()) {
            throw new BusinessException("SUPPLIER_INACTIVE",
                    "Nhà cung cấp đang bị vô hiệu hóa");
        }

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", currentUserId));

        GoodsReceipt receipt = new GoodsReceipt();
        receipt.setSupplier(supplier);
        receipt.setUser(user);
        receipt.setNote(req.note());
        receipt.setCode(generateCode());
        receipt.setStatus(GoodsReceiptStatus.pending);

        BigDecimal total = BigDecimal.ZERO;
        for (GoodsReceiptItemRequest item : req.items()) {
            Product product = productRepository.findById(item.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", item.productId()));

            // Ràng buộc: import_price ≤ price (không thể nhập giá vốn > giá bán)
            if (item.importPrice().compareTo(product.getPrice()) > 0) {
                throw new BusinessException("IMPORT_PRICE_TOO_HIGH",
                        "Giá nhập của '" + product.getName() + "' (" + item.importPrice()
                                + "đ) cao hơn giá bán (" + product.getPrice() + "đ) — không được phép.");
            }

            GoodsReceiptDetail detail = new GoodsReceiptDetail();
            detail.setProduct(product);
            detail.setQuantity(item.quantity());
            // remaining = 0 vì phiếu pending — FIFO tự skip. Sẽ set = quantity khi approve.
            detail.setRemainingQuantity(0);
            detail.setImportPrice(item.importPrice());
            receipt.addDetail(detail);

            total = total.add(item.importPrice().multiply(BigDecimal.valueOf(item.quantity())));
        }
        receipt.setTotalAmount(total);

        GoodsReceipt saved = goodsReceiptRepository.save(receipt);
        return goodsReceiptMapper.toDto(saved);
    }

    /**
     * Admin duyệt phiếu pending: chuyển sang <b>completed</b>, cộng stock,
     * kích hoạt lô cho FIFO ({@code remaining_quantity = quantity}).
     */
    @Transactional
    public GoodsReceiptDto approve(Long id, Long actorUserId) {
        GoodsReceipt receipt = goodsReceiptRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GoodsReceipt", id));
        if (receipt.getStatus() != GoodsReceiptStatus.pending) {
            throw new BusinessException("INVALID_STATUS",
                    "Chỉ duyệt được phiếu đang chờ (pending). Phiếu hiện tại: " + receipt.getStatus());
        }
        for (GoodsReceiptDetail d : receipt.getDetails()) {
            d.setRemainingQuantity(d.getQuantity());
            Product p = d.getProduct();
            p.setStock(p.getStock() + d.getQuantity());
        }
        receipt.setStatus(GoodsReceiptStatus.completed);
        return goodsReceiptMapper.toDto(receipt);
    }

    /**
     * Admin hủy phiếu pending — không đụng stock (do stock chưa cộng).
     * Đã completed rồi phát hiện nhầm → dùng Phiếu xuất manual để cân đối, không rollback.
     */
    @Transactional
    public GoodsReceiptDto cancel(Long id, Long actorUserId, String reason) {
        GoodsReceipt receipt = goodsReceiptRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GoodsReceipt", id));
        if (receipt.getStatus() != GoodsReceiptStatus.pending) {
            throw new BusinessException("INVALID_STATUS",
                    "Chỉ hủy được phiếu đang chờ (pending). Đã duyệt rồi thì tạo phiếu xuất manual để cân đối kho.");
        }
        receipt.setStatus(GoodsReceiptStatus.cancelled);
        if (reason != null && !reason.isBlank()) {
            String prev = receipt.getNote();
            String note = "[Hủy] " + reason;
            receipt.setNote(prev == null || prev.isBlank() ? note : prev + "\n" + note);
        }
        return goodsReceiptMapper.toDto(receipt);
    }

    /**
     * Sinh mã phiếu theo định dạng GR-YYYYMMDD-NNN (NNN là số thứ tự trong ngày, base 1).
     * Race condition ở đây chấp nhận được: nếu 2 admin tạo cùng thời điểm, unique constraint
     * trên goods_receipts.code sẽ throw và caller retry.
     */
    private String generateCode() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime startOfNextDay = startOfDay.plusDays(1);
        long todayCount = goodsReceiptRepository.countByCreatedDate(startOfDay, startOfNextDay);
        return "GR-" + DATE_FMT.format(now) + "-" + String.format("%03d", todayCount + 1);
    }
}
