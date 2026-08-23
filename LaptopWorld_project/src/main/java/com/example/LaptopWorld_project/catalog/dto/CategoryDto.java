package com.example.LaptopWorld_project.catalog.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record CategoryDto(
        Long id,
        String name,
        String slug,
        Long parentId,
        String parentName,
        String description,
        String image,
        List<Map<String, Object>> specTemplate,
        boolean isActive,
        int sortOrder,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
