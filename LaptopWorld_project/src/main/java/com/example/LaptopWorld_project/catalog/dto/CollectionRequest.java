package com.example.LaptopWorld_project.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CollectionRequest(
        @NotBlank(message = "Tên collection không được để trống")
        @Size(max = 150)
        String name,

        @Size(max = 160)
        String slug,

        @Size(max = 500)
        String image,

        String description,

        Long parentId,

        Boolean isActive,

        Boolean showOnHome,

        Integer sortOrder
) {}
