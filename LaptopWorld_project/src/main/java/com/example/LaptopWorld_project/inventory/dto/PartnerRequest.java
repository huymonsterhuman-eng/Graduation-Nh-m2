package com.example.LaptopWorld_project.inventory.dto;

import com.example.LaptopWorld_project.inventory.entity.PartnerType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PartnerRequest(
        @NotBlank(message = "Tên đối tác không được để trống")
        @Size(max = 150)
        String name,

        /** Mã ĐVVC — 2-5 ký tự in hoa (để trống sẽ tự sinh từ tên). */
        @Size(max = 10, message = "Mã tối đa 10 ký tự")
        String code,

        @NotNull(message = "Loại đối tác không được để trống")
        PartnerType type,

        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
        String phone,

        @Email(message = "Email không hợp lệ")
        @Size(max = 150)
        String email,

        String address,

        Boolean isActive
) {}
