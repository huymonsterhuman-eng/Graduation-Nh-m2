package com.example.LaptopWorld_project.order.dto;

import com.example.LaptopWorld_project.order.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateOrderStatusRequest(
        @NotNull(message = "Trạng thái không được để trống")
        OrderStatus status,

        String adminNote,

        String trackingNumber
) {}
