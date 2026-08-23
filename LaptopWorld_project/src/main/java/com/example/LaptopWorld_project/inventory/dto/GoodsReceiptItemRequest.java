package com.example.LaptopWorld_project.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record GoodsReceiptItemRequest(
        @NotNull(message = "Sản phẩm không được để trống")
        Long productId,

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        Integer quantity,

        @NotNull(message = "Giá nhập không được để trống")
        @DecimalMin(value = "0.0", inclusive = true, message = "Giá nhập không được âm")
        BigDecimal importPrice
) {}
