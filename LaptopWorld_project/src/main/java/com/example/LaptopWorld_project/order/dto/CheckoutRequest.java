package com.example.LaptopWorld_project.order.dto;

import com.example.LaptopWorld_project.order.entity.PaymentMethod;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record CheckoutRequest(
        @NotNull(message = "Vui lòng chọn địa chỉ giao hàng")
        Long addressId,

        @NotNull(message = "Vui lòng chọn phương thức thanh toán")
        PaymentMethod paymentMethod,

        String voucherCode,

        @Size(max = 50)
        String shippingMethod,

        @NotNull(message = "Phí ship không được để trống")
        @DecimalMin(value = "0.0", inclusive = true)
        BigDecimal shippingFee,

        String customerNote
) {}
