package com.example.LaptopWorld_project.catalog.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record ProductRequest(
        @NotBlank(message = "Tên sản phẩm không được để trống")
        @Size(max = 255)
        String name,

        @Size(max = 280)
        String slug,

        @Size(max = 80)
        String sku,

        @Size(max = 500)
        String shortDescription,

        String description,

        @NotNull(message = "Giá không được để trống")
        @DecimalMin(value = "0.0", inclusive = true, message = "Giá phải >= 0")
        BigDecimal price,

        @DecimalMin(value = "0.0", inclusive = true)
        BigDecimal salePrice,

        /** Giá vốn cơ sở — nullable. Ràng buộc: costPrice ≤ price. */
        @DecimalMin(value = "0.0", inclusive = true, message = "Giá vốn phải >= 0")
        BigDecimal costPrice,

        Long brandId,

        Long categoryId,

        /** Thông số kỹ thuật theo template category. VD: {"cpu":"i7","ram":"16GB"} */
        Map<String, Object> specs,

        @Min(value = 0, message = "Tồn kho không âm")
        Integer stock,

        Boolean isFeatured,

        Boolean isActive,

        /** URL ảnh — tạo bằng /api/admin/media/upload (Sprint 3D) rồi truyền vào đây. */
        List<ImageInput> images
) {
    public record ImageInput(
            String path,
            String alt,
            Integer sortOrder,
            Boolean isPrimary
    ) {}
}
