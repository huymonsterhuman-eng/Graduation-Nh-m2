package com.example.LaptopWorld_project.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record GoodsReceiptCreateRequest(
        @NotNull(message = "Nhà cung cấp không được để trống")
        Long supplierId,

        String note,

        @NotEmpty(message = "Phiếu nhập phải có ít nhất 1 sản phẩm")
        @Valid
        List<GoodsReceiptItemRequest> items
) {}
