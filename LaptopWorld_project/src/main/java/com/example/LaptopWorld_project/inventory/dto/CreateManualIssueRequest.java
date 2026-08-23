package com.example.LaptopWorld_project.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateManualIssueRequest(
        @NotBlank(message = "Lý do xuất kho không được để trống")
        @Size(max = 500)
        String note,

        @NotEmpty(message = "Phiếu xuất phải có ít nhất 1 sản phẩm")
        @Valid
        List<ManualIssueItemRequest> items
) {}
