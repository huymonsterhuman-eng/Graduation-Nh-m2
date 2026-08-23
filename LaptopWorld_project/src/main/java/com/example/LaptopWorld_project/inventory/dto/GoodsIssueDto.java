package com.example.LaptopWorld_project.inventory.dto;

import com.example.LaptopWorld_project.inventory.entity.GoodsIssueStatus;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record GoodsIssueDto(
        Long id,
        String code,
        Long orderId,
        String orderCode,
        GoodsIssueType type,
        GoodsIssueStatus status,
        Long authorId,
        String authorName,
        BigDecimal totalCogs,
        String note,
        List<GoodsIssueDetailDto> items,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
