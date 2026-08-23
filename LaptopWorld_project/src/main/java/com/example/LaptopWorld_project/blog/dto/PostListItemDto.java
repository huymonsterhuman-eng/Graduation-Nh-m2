package com.example.LaptopWorld_project.blog.dto;

import java.time.OffsetDateTime;

/** DTO gọn cho list/grid trang blog — không có content full. */
public record PostListItemDto(
        Long id,
        String title,
        String slug,
        String image,
        String excerpt,
        Long postCategoryId,
        String postCategoryName,
        String authorName,
        boolean isPublished,
        OffsetDateTime publishedAt,
        int views,
        OffsetDateTime createdAt
) {}
