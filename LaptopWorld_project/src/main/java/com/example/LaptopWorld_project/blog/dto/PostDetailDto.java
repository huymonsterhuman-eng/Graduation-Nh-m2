package com.example.LaptopWorld_project.blog.dto;

import java.time.OffsetDateTime;

public record PostDetailDto(
        Long id,
        String title,
        String slug,
        String image,
        String excerpt,
        String content,
        Long postCategoryId,
        String postCategoryName,
        String postCategorySlug,
        Long authorId,
        String authorName,
        boolean isPublished,
        OffsetDateTime publishedAt,
        int views,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
