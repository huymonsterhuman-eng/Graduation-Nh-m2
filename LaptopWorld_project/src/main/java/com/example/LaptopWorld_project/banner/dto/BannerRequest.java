package com.example.LaptopWorld_project.banner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BannerRequest(
        @Size(max = 255)
        String title,

        @NotBlank(message = "Ảnh banner không được để trống")
        @Size(max = 500)
        String image,

        @Size(max = 500)
        String link,

        Integer sortOrder,   // null = 0

        Boolean isActive     // null = true (khi create); giữ nguyên khi update
) {}
