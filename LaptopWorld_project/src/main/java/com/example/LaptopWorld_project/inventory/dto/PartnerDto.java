package com.example.LaptopWorld_project.inventory.dto;

import com.example.LaptopWorld_project.inventory.entity.PartnerType;

import java.time.OffsetDateTime;

public record PartnerDto(
        Long id,
        String name,
        String code,
        PartnerType type,
        String phone,
        String email,
        String address,
        boolean isActive,
        long receiptCount,  // Số phiếu nhập (chỉ có nghĩa khi type=supplier)
        long orderCount,    // Số đơn hàng (chỉ có nghĩa khi type=shipping_provider)
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
