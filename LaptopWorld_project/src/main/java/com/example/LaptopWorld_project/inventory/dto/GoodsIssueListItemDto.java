package com.example.LaptopWorld_project.inventory.dto;

import com.example.LaptopWorld_project.inventory.entity.GoodsIssueStatus;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record GoodsIssueListItemDto(
        Long id,
        String code,
        String orderCode,
        GoodsIssueType type,
        GoodsIssueStatus status,
        String authorName,
        BigDecimal totalCogs,
        OffsetDateTime createdAt
) {}
