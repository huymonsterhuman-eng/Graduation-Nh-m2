package com.example.LaptopWorld_project.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AddressRequest(
        @NotBlank(message = "Tên người nhận không được để trống")
        @Size(max = 150)
        String name,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(regexp = "^[0-9+()\\-\\s]{8,20}$", message = "Số điện thoại không hợp lệ")
        String phone,

        @NotBlank(message = "Địa chỉ không được để trống")
        @Size(max = 500)
        String address,

        @Size(max = 100) String ward,
        @Size(max = 100) String district,
        @Size(max = 100) String province,

        Boolean isDefault
) {}
