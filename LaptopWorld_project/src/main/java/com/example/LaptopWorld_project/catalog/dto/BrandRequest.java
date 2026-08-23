package com.example.LaptopWorld_project.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BrandRequest(
        @NotBlank(message = "Tên thương hiệu không được để trống")
        @Size(max = 150)
        String name,

        @Size(max = 160)
        String slug,

        @Size(max = 500)
        String logo,

        String description,

        Boolean isActive
) {}
