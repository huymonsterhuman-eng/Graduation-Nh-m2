package com.example.LaptopWorld_project.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostCategoryRequest(
        @NotBlank(message = "Tên danh mục không được để trống")
        @Size(max = 150)
        String name,

        @Size(max = 160)
        String slug,     // optional — nếu blank, service tự sinh từ name

        String description
) {}
