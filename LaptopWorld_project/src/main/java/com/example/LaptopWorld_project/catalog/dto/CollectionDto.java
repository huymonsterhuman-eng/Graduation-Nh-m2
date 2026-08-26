package com.example.LaptopWorld_project.catalog.dto;

import com.example.LaptopWorld_project.catalog.entity.HomePosition;

import java.time.OffsetDateTime;

public record CollectionDto(
        Long id,
        String name,
        String slug,
        String image,
        String description,
        Long parentId,
        boolean isActive,
        HomePosition homePosition,
        boolean isFeatured,
        int sortOrder,
        int productCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
