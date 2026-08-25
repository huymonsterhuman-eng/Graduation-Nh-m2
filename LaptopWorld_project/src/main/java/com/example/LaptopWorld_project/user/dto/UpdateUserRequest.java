package com.example.LaptopWorld_project.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Body cho PUT /api/admin/users/{id} — chỉ update thông tin cá nhân.
 * KHÔNG update username / email / password / status / roles — mỗi thứ có endpoint riêng
 * hoặc không hỗ trợ (chốt Sprint 9G-B3: không đổi email vì cần re-verify).
 */
public record UpdateUserRequest(
        @Size(max = 150)
        String fullName,

        @Pattern(regexp = "^$|^[0-9+()\\-\\s]{8,20}$", message = "Số điện thoại không hợp lệ")
        String phone,

        @Pattern(regexp = "^$|^(male|female|other)$", message = "Giới tính không hợp lệ")
        String gender,

        LocalDate birthday
) {}
