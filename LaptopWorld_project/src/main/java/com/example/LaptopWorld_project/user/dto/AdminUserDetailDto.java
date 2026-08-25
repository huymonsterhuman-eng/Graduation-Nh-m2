package com.example.LaptopWorld_project.user.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Chi tiết user cho admin — kèm stats (orderCount, reviewCount, totalSpent)
 * và list vai trò dạng gọn (id + name + description) để FE hiển thị chips.
 * totalSpent = SUM(orders.total_amount) khi status='delivered'.
 */
public record AdminUserDetailDto(
        Long id,
        String username,
        String email,
        boolean emailVerified,
        OffsetDateTime emailVerifiedAt,
        String fullName,
        String phone,
        String avatar,
        String gender,
        LocalDate birthday,
        String status,
        List<RoleRef> roles,
        Stats stats,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public record RoleRef(Long id, String name, String description) {}

    public record Stats(long orderCount, long reviewCount, BigDecimal totalSpent) {}
}
