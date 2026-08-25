package com.example.LaptopWorld_project.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * Body cho POST /api/admin/users — admin tạo user mới với password nhập tay.
 * Auto set emailVerifiedAt = now (admin tạo → xem như đã xác thực).
 * Default status = active nếu không truyền.
 */
public record CreateUserRequest(
        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Size(min = 3, max = 60, message = "Tên đăng nhập từ 3 đến 60 ký tự")
        @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Tên đăng nhập chỉ chứa chữ, số, dấu gạch dưới")
        String username,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        @Size(max = 150)
        String email,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 8, max = 100, message = "Mật khẩu từ 8 đến 100 ký tự")
        String password,

        @Size(max = 150)
        String fullName,

        @Pattern(regexp = "^$|^[0-9+()\\-\\s]{8,20}$", message = "Số điện thoại không hợp lệ")
        String phone,

        @Pattern(regexp = "^$|^(male|female|other)$", message = "Giới tính không hợp lệ")
        String gender,

        LocalDate birthday,

        @Pattern(regexp = "^$|^(active|banned|unverified)$", message = "Trạng thái không hợp lệ")
        String status,   // null / "" → active

        List<Long> roleIds
) {}
