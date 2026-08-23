package com.example.LaptopWorld_project.user.dto;

import java.time.OffsetDateTime;

public record AddressDto(
        Long id,
        String name,
        String phone,
        String address,
        String ward,
        String district,
        String province,
        boolean isDefault,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
