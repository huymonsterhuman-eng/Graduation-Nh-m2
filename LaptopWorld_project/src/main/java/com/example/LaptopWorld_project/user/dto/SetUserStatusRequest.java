package com.example.LaptopWorld_project.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Body cho POST /api/admin/users/{id}/status.
 * Nhận chuỗi lowercase để khớp enum UserStatus (active|banned|unverified).
 */
public record SetUserStatusRequest(
        @NotBlank(message = "Trạng thái không được để trống")
        @Pattern(regexp = "^(active|banned|unverified)$",
                 message = "Trạng thái không hợp lệ (chỉ nhận active|banned|unverified)")
        String status
) {}
