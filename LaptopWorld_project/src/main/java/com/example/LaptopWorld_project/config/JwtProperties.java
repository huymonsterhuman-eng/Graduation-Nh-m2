package com.example.LaptopWorld_project.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Map tu prefix "app.jwt" trong application-*.properties.
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret,
        long accessTokenTtlMinutes,
        long refreshTokenTtlDays,
        String issuer
) {}
