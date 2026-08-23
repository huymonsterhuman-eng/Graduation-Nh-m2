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
            List<String> roles
    ) {}
}
