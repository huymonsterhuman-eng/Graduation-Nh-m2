package com.example.LaptopWorld_project.review.dto;

import jakarta.validation.constraints.NotNull;

public record HideRequest(
        @NotNull(message = "Trạng thái ẩn không được để trống")
        Boolean hidden
) {}
