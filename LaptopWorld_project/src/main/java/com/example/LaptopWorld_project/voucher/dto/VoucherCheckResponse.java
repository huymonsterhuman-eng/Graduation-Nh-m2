package com.example.LaptopWorld_project.voucher.dto;

import java.math.BigDecimal;

/**
 * Trả về khi user check voucher tại checkout preview.
 */
public record VoucherCheckResponse(
        boolean valid,
        String code,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal totalAfterDiscount,
        String message
) {}
