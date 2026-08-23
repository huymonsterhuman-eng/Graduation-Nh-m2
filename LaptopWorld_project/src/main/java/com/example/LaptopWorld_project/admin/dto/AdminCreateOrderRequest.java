package com.example.LaptopWorld_project.admin.dto;

import com.example.LaptopWorld_project.order.entity.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Body cho POST /api/admin/orders — tạo đơn thay khách hàng.
 * Đơn giản hóa: không voucher, shipping mặc định.
 */
public record AdminCreateOrderRequest(
        @NotNull(message = "Chưa chọn khách hàng")
        Long userId,

        /** Nếu chọn từ address book của khách. Nullable — có thể nhập thủ công qua manual*. */
        Long addressId,

        /** Địa chỉ thủ công — dùng khi khách chưa có address, addressId null. */
        String manualName,
        String manualPhone,
        String manualAddress,

        @NotEmpty(message = "Đơn phải có ít nhất 1 sản phẩm")
        @Valid
        List<OrderItemInput> items,

        @NotNull(message = "Chưa chọn phương thức thanh toán")
        PaymentMethod paymentMethod,

        String adminNote
) {
    public record OrderItemInput(
            @NotNull Long productId,
            @NotNull @Min(1) Integer quantity
    ) {}
}
