package com.example.LaptopWorld_project.user.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Body cho POST /api/admin/users/{id}/roles — replace toàn bộ role của user.
 * Cho phép list rỗng (gỡ hết role — tương đương "không có quyền gì").
 */
public record SetUserRolesRequest(
        @NotNull(message = "roleIds không được null")
        List<Long> roleIds
) {}
