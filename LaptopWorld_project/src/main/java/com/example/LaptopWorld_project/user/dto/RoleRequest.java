package com.example.LaptopWorld_project.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RoleRequest(
        @NotBlank(message = "Tên vai trò không được để trống")
        @Size(max = 50)
        String name,

        @Size(max = 255)
        String description,

        List<String> permissions   // list permission codes; null = không đổi permissions (chỉ khi update)
) {}
