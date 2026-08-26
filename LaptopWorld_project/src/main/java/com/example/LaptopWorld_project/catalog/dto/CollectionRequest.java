package com.example.LaptopWorld_project.catalog.dto;

import com.example.LaptopWorld_project.catalog.entity.HomePosition;
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

        /** Null → không đổi vị trí; NONE → gỡ khỏi chip. */
        HomePosition homePosition,

        /** Toggle nổi bật — độc lập với homePosition. */
        Boolean isFeatured,

        Integer sortOrder
) {}
