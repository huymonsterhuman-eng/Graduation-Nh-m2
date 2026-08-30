package com.example.LaptopWorld_project.inventory.service;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.inventory.dto.BatchDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsIssueDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsIssueListItemDto;
import com.example.LaptopWorld_project.inventory.dto.ProductStockSummaryDto;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssue;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueStatus;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptDetail;
import com.example.LaptopWorld_project.inventory.mapper.GoodsIssueMapper;
import com.example.LaptopWorld_project.inventory.repository.GoodsIssueRepository;
import com.example.LaptopWorld_project.inventory.repository.GoodsReceiptDetailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryQueryService {

    private final GoodsReceiptDetailRepository goodsReceiptDetailRepository;
    private final GoodsIssueRepository goodsIssueRepository;
    private final ProductRepository productRepository;
    private final GoodsIssueMapper goodsIssueMapper;

    @Transactional(readOnly = true)
    public ProductStockSummaryDto getProductBatches(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", productId));
        List<GoodsReceiptDetail> batches = goodsReceiptDetailRepository.findRemainingBatches(productId);

        List<BatchDto> batchDtos = batches.stream().map(b -> new BatchDto(
                b.getId(),
                b.getGoodsReceipt().getId(),
                b.getGoodsReceipt().getCode(),
                b.getGoodsReceipt().getSupplier().getId(),
                b.getGoodsReceipt().getSupplier().getName(),
                b.getQuantity(),
                b.getRemainingQuantity(),
                b.getImportPrice(),
                b.getCreatedAt()
        )).toList();

        int totalRemaining = batches.stream().mapToInt(GoodsReceiptDetail::getRemainingQuantity).sum();

        return new ProductStockSummaryDto(
                product.getId(),
                product.getName(),
                product.getSku(),
                product.getStock(),
                totalRemaining,
                batchDtos.size(),
                batchDtos
        );
    }

    @Transactional(readOnly = true)
    public PagedResponse<GoodsIssueListItemDto> listIssues(GoodsIssueStatus status, Pageable pageable) {
        return listIssues(status, null, null, null, pageable);
    }

    /** Overload thêm filter type (auto/manual) + khoảng ngày createdAt. */
    @Transactional(readOnly = true)
    public PagedResponse<GoodsIssueListItemDto> listIssues(GoodsIssueStatus status,
                                                           com.example.LaptopWorld_project.inventory.entity.GoodsIssueType type,
                                                           java.time.OffsetDateTime from,
                                                           java.time.OffsetDateTime to,
                                                           Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<GoodsIssue> spec = (root, query, cb) -> {
            java.util.List<jakarta.persistence.criteria.Predicate> preds = new java.util.ArrayList<>();
            if (status != null) preds.add(cb.equal(root.get("status"), status));
            if (type != null) preds.add(cb.equal(root.get("type"), type));
            if (from != null) preds.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null)   preds.add(cb.lessThan(root.get("createdAt"), to));
            return cb.and(preds.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        Page<GoodsIssue> page = goodsIssueRepository.findAll(spec, pageable);
        return PagedResponse.from(page, goodsIssueMapper::toListItem);
    }

    /** Đếm để hiển thị badge trong tabs. */
    public java.util.Map<String, Long> countByTypeAndStatus() {
        java.util.Map<String, Long> m = new java.util.LinkedHashMap<>();
        // Tổng theo type
        m.put("auto",       goodsIssueRepository.countByType(com.example.LaptopWorld_project.inventory.entity.GoodsIssueType.auto));
        m.put("manual",     goodsIssueRepository.countByType(com.example.LaptopWorld_project.inventory.entity.GoodsIssueType.manual));
        // Pending theo type — để badge cảnh báo
        m.put("autoPending",   goodsIssueRepository.countByTypeAndStatus(com.example.LaptopWorld_project.inventory.entity.GoodsIssueType.auto, GoodsIssueStatus.pending));
        m.put("manualPending", goodsIssueRepository.countByTypeAndStatus(com.example.LaptopWorld_project.inventory.entity.GoodsIssueType.manual, GoodsIssueStatus.pending));
        return m;
    }

    @Transactional(readOnly = true)
    public GoodsIssueDto findIssueById(Long id) {
        GoodsIssue issue = goodsIssueRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GoodsIssue", id));
        return goodsIssueMapper.toDto(issue);
    }
}
