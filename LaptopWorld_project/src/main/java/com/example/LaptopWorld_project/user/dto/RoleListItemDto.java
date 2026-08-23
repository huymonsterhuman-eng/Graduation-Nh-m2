package com.example.LaptopWorld_project.user.dto;

import java.time.OffsetDateTime;

public record RoleListItemDto(
        Long id,
        String name,
        String description,
        int permissionCount,
        long userCount,
        OffsetDateTime createdAt
) {}
