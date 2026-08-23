package com.example.LaptopWorld_project.auth.dto;

import com.example.LaptopWorld_project.user.entity.Gender;
import com.example.LaptopWorld_project.user.entity.UserStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record MeResponse(
        Long id,
        String username,
        String email,
        boolean emailVerified,
        String fullName,
        String phone,
        String avatar,
        Gender gender,
        LocalDate birthday,
        UserStatus status,
        List<String> roles,
        List<String> permissions,
        OffsetDateTime createdAt
) {}
