package com.example.LaptopWorld_project.user.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Item hiển thị trong list Users admin. `status` là chuỗi lowercase khớp
 * enum UserStatus (active/banned/unverified) để client hiển thị badge.
 */
public record AdminUserListItemDto(
        Long id,
        String username,
        String email,
        boolean emailVerified,
        String fullName,
        String phone,
        String avatar,
        String status,
        List<String> roleNames,
        OffsetDateTime createdAt
) {}
