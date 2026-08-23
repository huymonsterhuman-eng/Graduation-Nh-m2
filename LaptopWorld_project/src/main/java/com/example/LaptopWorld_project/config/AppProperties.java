package com.example.LaptopWorld_project.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cac config chung khac (khong thuoc jwt / cors / mail).
 * Prefix: "app".
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Frontend frontend,
        Mail mail,
        Verification verification,
        PasswordReset passwordReset
) {
    public record Frontend(String url) {}
    public record Mail(String from, String fromName) {}
    public record Verification(long tokenTtlHours) {}
    public record PasswordReset(long tokenTtlMinutes) {}
}
