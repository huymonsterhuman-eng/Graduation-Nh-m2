package com.example.LaptopWorld_project.auth.dto;

import java.util.List;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,       // "Bearer"
        long   expiresInSeconds,
        UserInfo user
) {
    public record UserInfo(
            Long id,
            String username,
            String email,
            String fullName,
            String avatar,
            List<String> roles,
            /**
             * List permission code (VD: "access_admin", "view_products").
             * FE cần field này để `hasPermission()` gate đúng cho STAFF ngay sau login,
             * không phải chờ call /auth/me riêng.
             */
            List<String> permissions
    ) {}
}
