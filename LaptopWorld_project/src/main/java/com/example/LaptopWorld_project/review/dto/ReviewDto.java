package com.example.LaptopWorld_project.review.dto;

import java.time.OffsetDateTime;

public record ReviewDto(
        Long id,
        Long userId,
        String username,
        String userFullName,
        Long productId,
        String productName,
        int rating,
        String comment,
        String image,          // URL ảnh (nullable) — hiện chỉ hỗ trợ 1 ảnh
        boolean isHidden,
        String adminReply,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
