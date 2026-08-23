package com.example.LaptopWorld_project.inventory.mapper;

import com.example.LaptopWorld_project.inventory.dto.GoodsIssueDetailDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsIssueDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsIssueListItemDto;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssue;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueDetail;
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
        return new GoodsIssueDetailDto(
                d.getId(),
                d.getGoodsReceiptDetail() != null ? d.getGoodsReceiptDetail().getId() : null,
                d.getProduct() != null ? d.getProduct().getId() : null,
                d.getProduct() != null ? d.getProduct().getName() : null,
                d.getQuantity(),
                d.getImportPrice(),
                d.getTotalPrice()
        );
    }
}
