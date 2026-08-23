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
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
