package com.example.LaptopWorld_project.voucher.dto;

import com.example.LaptopWorld_project.voucher.entity.VoucherType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record VoucherRequest(
        @NotBlank(message = "Mã voucher không được để trống")
        @Size(max = 50)
        String code,

        @NotBlank(message = "Tên voucher không được để trống")
        @Size(max = 150)
        String name,

        @NotNull(message = "Loại voucher không được để trống")
        VoucherType type,

        @NotNull(message = "Giá trị giảm không được để trống")
        @DecimalMin(value = "0.0", inclusive = false, message = "Giá trị giảm phải > 0")
        BigDecimal discountAmount,

        @DecimalMin(value = "0.0", inclusive = true)
        BigDecimal minOrderValue,

        @DecimalMin(value = "0.0", inclusive = true)
        BigDecimal maxDiscount,

        OffsetDateTime startedAt,
        OffsetDateTime expiresAt,

        @Min(value = 1)
        Integer usageLimit,

        Boolean isActive
) {}
