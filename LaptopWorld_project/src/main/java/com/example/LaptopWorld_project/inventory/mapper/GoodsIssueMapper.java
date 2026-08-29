package com.example.LaptopWorld_project.inventory.mapper;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.entity.ProductImage;
import com.example.LaptopWorld_project.inventory.dto.GoodsIssueDetailDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsIssueDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsIssueListItemDto;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssue;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueDetail;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptDetail;
import org.mapstruct.Mapper;

@Mapper
public interface GoodsIssueMapper {

    default GoodsIssueDto toDto(GoodsIssue entity) {
        if (entity == null) return null;
        return new GoodsIssueDto(
                entity.getId(),
                entity.getCode(),
                entity.getOrder() != null ? entity.getOrder().getId() : null,
                entity.getOrder() != null ? entity.getOrder().getCode() : null,
                entity.getType(),
                entity.getStatus(),
                entity.getAuthor() != null ? entity.getAuthor().getId() : null,
                entity.getAuthor() != null ? entity.getAuthor().getFullName() : null,
                entity.getTotalCogs(),
                entity.getNote(),
                entity.getDetails().stream().map(this::toDetailDto).toList(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    default GoodsIssueListItemDto toListItem(GoodsIssue entity) {
        if (entity == null) return null;
        return new GoodsIssueListItemDto(
                entity.getId(),
                entity.getCode(),
                entity.getOrder() != null ? entity.getOrder().getCode() : null,
                entity.getType(),
                entity.getStatus(),
                entity.getAuthor() != null ? entity.getAuthor().getFullName() : null,
                entity.getTotalCogs(),
                entity.getCreatedAt()
        );
    }

    default GoodsIssueDetailDto toDetailDto(GoodsIssueDetail d) {
        if (d == null) return null;
        GoodsReceiptDetail grd = d.getGoodsReceiptDetail();
        Product p = d.getProduct();
        return new GoodsIssueDetailDto(
                d.getId(),
                grd != null ? grd.getId() : null,
                grd != null && grd.getGoodsReceipt() != null ? grd.getGoodsReceipt().getCode() : null,
                p != null ? p.getId() : null,
                p != null ? p.getName() : null,
                p != null ? primaryImagePath(p.getImages()) : null,
                d.getQuantity(),
                d.getImportPrice(),
                d.getTotalPrice()
        );
    }

    /** Ảnh primary của SP — fallback về ảnh đầu tiên, null nếu chưa có ảnh. */
    default String primaryImagePath(java.util.List<ProductImage> images) {
        if (images == null || images.isEmpty()) return null;
        return images.stream()
                .filter(ProductImage::isPrimary)
                .map(ProductImage::getPath)
                .findFirst()
                .orElse(images.get(0).getPath());
    }
}
