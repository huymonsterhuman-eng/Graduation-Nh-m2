package com.example.LaptopWorld_project.order.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateCartItemRequest(
        @NotNull @Min(value = 1, message = "Số lượng phải >= 1")
        Integer quantity
) {}
