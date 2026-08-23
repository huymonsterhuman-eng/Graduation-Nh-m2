package com.example.LaptopWorld_project.admin.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Tập DTO cho các endpoint dashboard admin — gom vào 1 file cho dễ đọc.
 * Dùng record để immutable + gọn.
 */
public final class DashboardDtos {
    private DashboardDtos() {}

    /** 6 KPI chính. criticalStock/outOfStock là realtime — không phụ thuộc range. */
    public record KpiSummary(
            BigDecimal revenue,
            long orders,
            long newUsers,
            long ordersInRange,
            long criticalStock,   // stock 1-4
            long outOfStock       // stock <= 0
    ) {}

    /** Một điểm trên biểu đồ theo bucket (day/week/month). */
    public record TimeseriesPoint(
            String label,
            BigDecimal value
    ) {}

    /** Điểm biến động kho: hàng nhập vs hàng bán. */
    public record StockMovementPoint(
            String label,
            long incoming,
            long outgoing
    ) {}

    /** Doanh số theo danh mục — cho PieChart. */
    public record SalesByCategory(
            String categoryName,
            long totalSold
    ) {}

    /** SP bán chạy (top). */
    public record TopProduct(
            Long id,
            String name,
            String slug,
            String primaryImage,
            long totalSold,
            int currentStock,
            BigDecimal price
    ) {}

    /** SP tồn cao nhưng không có đơn trong N ngày qua. */
    public record DeadStock(
            Long id,
            String name,
            String slug,
            String primaryImage,
            int stock,
            BigDecimal price,
            OffsetDateTime createdAt
    ) {}

    /** SP rating thấp cần chú ý. */
    public record LowRated(
            Long id,
            String name,
            String slug,
            String primaryImage,
            String categoryName,
            BigDecimal avgRating,
            long reviewCount
    ) {}

    /** Đơn mới nhất. */
    public record LatestOrder(
            Long id,
            String code,
            String username,
            String shippingName,
            BigDecimal total,
            String status,
            String paymentStatus,
            OffsetDateTime createdAt
    ) {}

    /** KPI riêng cho AI chat. */
    public record ChatbotStats(
            long sessions,
            long messages,
            long loggedInSessions,
            double loggedInRate,
            int avgResponseMs
    ) {}

    /** Câu hỏi hay gặp — group theo prefix. */
    public record ChatbotTopQuestion(
            String question,
            long askCount,
            OffsetDateTime lastAsked
    ) {}

    /** Wrapper cho các list nhỏ. Không dùng — giữ trực tiếp List<T>. */
    public record ListWrapper<T>(List<T> items) {}
}
