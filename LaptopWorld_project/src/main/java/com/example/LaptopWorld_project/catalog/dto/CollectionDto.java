package com.example.LaptopWorld_project.catalog.dto;

import java.time.OffsetDateTime;

public record CollectionDto(
        Long id,
        String name,
        String slug,
        String image,
        String description,
        Long parentId,
        boolean isActive,
        boolean showOnHome,
        int sortOrder,
        int productCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
