package com.example.LaptopWorld_project.catalog.dto;

import java.time.OffsetDateTime;

public record BrandDto(
        Long id,
        String name,
        String slug,
        String logo,
        String description,
        boolean isActive,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        long productCount
) {}
