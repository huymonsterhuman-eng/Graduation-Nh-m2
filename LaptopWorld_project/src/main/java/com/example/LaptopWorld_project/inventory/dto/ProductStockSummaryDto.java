package com.example.LaptopWorld_project.inventory.dto;

import java.util.List;

public record ProductStockSummaryDto(
        Long productId,
        String productName,
        String productSku,
        int cachedStock,
        int totalRemaining,
        int batchCount,
        List<BatchDto> batches
) {}
