package com.example.LaptopWorld_project.banner.dto;

import java.time.OffsetDateTime;

public record BannerDto(
        Long id,
        String title,
        String image,
        String link,
        int sortOrder,
        boolean isActive,
        Long authorId,
        String authorName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
