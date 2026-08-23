package com.example.LaptopWorld_project.user.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record RoleDetailDto(
        Long id,
        String name,
        String description,
        List<String> permissions,   // list permission codes
        long userCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
