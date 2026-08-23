package com.example.LaptopWorld_project.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

/**
 * Dùng cho cả create và update.
 * - slug: tùy chọn, nếu null sẽ tự sinh từ name.
 * - specTemplate: JSONB, có thể null.
 */
public record CategoryRequest(
        @NotBlank(message = "Tên danh mục không được để trống")
        @Size(max = 150)
        String name,

        @Size(max = 160)
        String slug,

        Long parentId,

        String description,

        @Size(max = 500)
        String image,

        List<Map<String, Object>> specTemplate,

        Boolean isActive,

        Integer sortOrder
) {}
