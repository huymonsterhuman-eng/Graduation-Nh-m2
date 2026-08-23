package com.example.LaptopWorld_project.admin.controller;

import com.example.LaptopWorld_project.admin.dto.DashboardDtos.*;
import com.example.LaptopWorld_project.admin.service.AdminDashboardService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueStatus;
import com.example.LaptopWorld_project.inventory.repository.GoodsIssueRepository;
import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

/**
 * Admin dashboard aggregate endpoints. Chỉ đọc, mỗi endpoint là một widget.
 * Range mặc định 30 ngày gần nhất nếu client không truyền from/to.
 */
@Tag(name = "Admin Dashboard", description = "Số liệu tổng hợp cho trang quản trị")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('view_reports')")
public class AdminDashboardController {

    private final OrderRepository orderRepository;
    private final GoodsIssueRepository goodsIssueRepository;
    private final AdminDashboardService dashboardService;

    // -------- Pending counts (Sprint 9A) --------

    @Operation(summary = "Số phiếu/đơn đang chờ xử lý — dùng cho badge sidebar")
    @GetMapping("/pending-counts")
    public ApiResponse<Map<String, Long>> pendingCounts() {
        long ordersPending = orderRepository.countByStatus(OrderStatus.pending);
        long ordersPreparing = orderRepository.countByStatus(OrderStatus.preparing);
        long issuesPending = goodsIssueRepository.countByStatus(GoodsIssueStatus.pending);
        return ApiResponse.ok(Map.of(
                "ordersPending", ordersPending,
                "ordersPreparing", ordersPreparing,
                "goodsIssuesPending", issuesPending
        ));
    }

    // -------- KPI --------

    @Operation(summary = "6 KPI chính (doanh thu + đơn + user mới + cảnh báo tồn)")
    @GetMapping("/dashboard/kpi")
    public ApiResponse<KpiSummary> kpi(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        var range = normalize(from, to);
        return ApiResponse.ok(dashboardService.getKpi(range[0], range[1]));
    }

    // -------- Revenue timeseries --------

    @Operation(summary = "Doanh thu theo bucket ngày/tuần/tháng — cho LineChart")
    @GetMapping("/dashboard/revenue-timeseries")
    public ApiResponse<List<TimeseriesPoint>> revenueTimeseries(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        var range = normalize(from, to);
        return ApiResponse.ok(dashboardService.getRevenueTimeseries(range[0], range[1]));
    }

    // -------- Stock movement --------

    @Operation(summary = "Hàng nhập / hàng bán theo bucket — cho BarChart 2 series")
    @GetMapping("/dashboard/stock-movement")
    public ApiResponse<List<StockMovementPoint>> stockMovement(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        var range = normalize(from, to);
        return ApiResponse.ok(dashboardService.getStockMovement(range[0], range[1]));
    }

    // -------- Sales by category --------

    @Operation(summary = "Doanh số theo danh mục — cho PieChart")
    @GetMapping("/dashboard/sales-by-category")
    public ApiResponse<List<SalesByCategory>> salesByCategory(
            @RequestParam(defaultValue = "5") int limit) {
        return ApiResponse.ok(dashboardService.getSalesByCategory(limit));
    }

    // -------- Top products --------

    @Operation(summary = "Top SP bán chạy")
    @GetMapping("/dashboard/top-products")
    public ApiResponse<List<TopProduct>> topProducts(
            @RequestParam(defaultValue = "5") int limit) {
        return ApiResponse.ok(dashboardService.getTopProducts(limit));
    }

    // -------- Dead stock --------

    @Operation(summary = "SP tồn > 0 nhưng N ngày qua không có đơn")
    @GetMapping("/dashboard/dead-stock")
    public ApiResponse<List<DeadStock>> deadStock(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "5") int limit) {
        return ApiResponse.ok(dashboardService.getDeadStock(days, limit));
    }

    // -------- Low rated --------

    @Operation(summary = "SP rating ≤ 3 cần chú ý")
    @GetMapping("/dashboard/low-rated")
    public ApiResponse<List<LowRated>> lowRated(
            @RequestParam(defaultValue = "5") int limit) {
        return ApiResponse.ok(dashboardService.getLowRated(limit));
    }

    // -------- Latest orders --------

    @Operation(summary = "Đơn mới nhất trong khoảng")
    @GetMapping("/dashboard/latest-orders")
    public ApiResponse<List<LatestOrder>> latestOrders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "8") int limit) {
        var range = normalize(from, to);
        return ApiResponse.ok(dashboardService.getLatestOrders(range[0], range[1], limit));
    }

    // -------- Chatbot stats --------

    @Operation(summary = "KPI Chatbot: sessions / messages / login rate / avg response time")
    @GetMapping("/dashboard/chatbot-stats")
    public ApiResponse<ChatbotStats> chatbotStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        var range = normalize(from, to);
        return ApiResponse.ok(dashboardService.getChatbotStats(range[0], range[1]));
    }

    // -------- Top questions --------

    @Operation(summary = "Câu hỏi hay gặp của khách trong N ngày qua")
    @GetMapping("/dashboard/chatbot-top-questions")
    public ApiResponse<List<ChatbotTopQuestion>> chatbotTopQuestions(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.ok(dashboardService.getChatbotTopQuestions(days, limit));
    }

    // ================== helpers ==================

    /**
     * Chuẩn hóa range: nếu từ/đến null → mặc định 30 ngày gần nhất (tính đến hôm nay 23:59:59).
     * Trả về [fromDateTime, toDateTime] ở offset system default.
     */
    private OffsetDateTime[] normalize(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now();
        LocalDate f = from != null ? from : today.minusDays(29);
        LocalDate t = to != null ? to : today;
        if (t.isBefore(f)) t = f;
        ZoneOffset offset = OffsetDateTime.now().getOffset();
        return new OffsetDateTime[]{
                f.atStartOfDay().atOffset(offset),
                t.atTime(23, 59, 59, 999_000_000).atOffset(offset)
        };
    }
}
