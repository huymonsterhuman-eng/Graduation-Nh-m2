package com.example.LaptopWorld_project.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReviewRequest(
        @NotNull(message = "Sản phẩm không được để trống")
        Long productId,

        @NotNull(message = "Số sao đánh giá không được để trống")
        @Min(value = 1, message = "Số sao phải từ 1 đến 5")
        @Max(value = 5, message = "Số sao phải từ 1 đến 5")
        Integer rating,

        @Size(max = 1000, message = "Nội dung đánh giá tối đa 1000 ký tự")
        String comment,

        @Size(max = 500)
        String image
) {}
