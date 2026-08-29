package com.example.LaptopWorld_project.inventory.mapper;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.entity.ProductImage;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptDetailDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptListItemDto;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceipt;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptDetail;
import org.mapstruct.Mapper;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface GoodsReceiptMapper {

    default GoodsReceiptDto toDto(GoodsReceipt entity) {
        if (entity == null) return null;
        return new GoodsReceiptDto(
                entity.getId(),
                entity.getCode(),
                entity.getStatus(),
                entity.getSupplier() != null ? entity.getSupplier().getId() : null,
                entity.getSupplier() != null ? entity.getSupplier().getName() : null,
                entity.getUser() != null ? entity.getUser().getId() : null,
                entity.getUser() != null ? entity.getUser().getFullName() : null,
                entity.getTotalAmount(),
                entity.getNote(),
                entity.getDetails().stream().map(this::toDetailDto).toList(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    default GoodsReceiptListItemDto toListItem(GoodsReceipt entity) {
        if (entity == null) return null;
        return new GoodsReceiptListItemDto(
                entity.getId(),
                entity.getCode(),
                entity.getStatus(),
                entity.getSupplier() != null ? entity.getSupplier().getName() : null,
                entity.getUser() != null ? entity.getUser().getFullName() : null,
                entity.getTotalAmount(),
                entity.getCreatedAt()
        );
    }

    default GoodsReceiptDetailDto toDetailDto(GoodsReceiptDetail d) {
        if (d == null) return null;
        BigDecimal totalPrice = d.getImportPrice()
                .multiply(BigDecimal.valueOf(d.getQuantity()));
        Product p = d.getProduct();
        return new GoodsReceiptDetailDto(
                d.getId(),
                p != null ? p.getId() : null,
                p != null ? p.getName() : null,
                p != null ? p.getSku() : null,
                p != null ? primaryImagePath(p.getImages()) : null,
                d.getQuantity(),
                d.getRemainingQuantity(),
                d.getImportPrice(),
                totalPrice
        );
    }

    /** Ảnh primary — fallback về ảnh đầu, null nếu chưa có. */
    default String primaryImagePath(List<ProductImage> images) {
        if (images == null || images.isEmpty()) return null;
        return images.stream()
                .filter(ProductImage::isPrimary)
                .map(ProductImage::getPath)
                .findFirst()
                .orElse(images.get(0).getPath());
    }
}
