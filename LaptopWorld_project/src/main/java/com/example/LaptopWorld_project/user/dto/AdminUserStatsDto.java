package com.example.LaptopWorld_project.user.dto;

/**
 * KPI cards trên trang danh sách người dùng — Sprint 9G Bước B1.
 * `newThisWeek` = số user tạo từ 00:00 thứ Hai của tuần hiện tại (theo múi giờ VN).
 */
public record AdminUserStatsDto(
        long total,
        long active,
        long banned,
        long unverified,
        long newThisWeek
) {}
