package com.example.LaptopWorld_project.blog.dto;

import java.time.OffsetDateTime;

public record PostCategoryDto(
        Long id,
        String name,
        String slug,
        String description,
        long postCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
