package com.example.LaptopWorld_project.inventory.mapper;

import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptDetailDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptListItemDto;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceipt;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptDetail;
import org.mapstruct.Mapper;

import java.math.BigDecimal;

@Mapper
public interface GoodsReceiptMapper {

    default GoodsReceiptDto toDto(GoodsReceipt entity) {
        if (entity == null) return null;
        return new GoodsReceiptDto(
                entity.getId(),
                entity.getCode(),
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
                entity.getSupplier() != null ? entity.getSupplier().getName() : null,
                entity.getUser() != null ? entity.getUser().getFullName() : null,
                entity.getTotalAmount(),
                entity.getCreatedAt()
        );
    }

    default GoodsReceiptDetailDto toDetailDto(GoodsReceiptDetail d) {
        if (d == null) return null;
        BigDecimal lineTotal = d.getImportPrice()
                .multiply(BigDecimal.valueOf(d.getQuantity()));
        return new GoodsReceiptDetailDto(
                d.getId(),
                d.getProduct() != null ? d.getProduct().getId() : null,
                d.getProduct() != null ? d.getProduct().getName() : null,
                d.getProduct() != null ? d.getProduct().getSku() : null,
                d.getQuantity(),
                d.getRemainingQuantity(),
                d.getImportPrice(),
                lineTotal
        );
    }
}
