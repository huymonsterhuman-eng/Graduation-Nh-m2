package com.example.LaptopWorld_project.order.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.order.dto.OrderDetailDto;
import com.example.LaptopWorld_project.order.dto.OrderListItemDto;
import com.example.LaptopWorld_project.order.dto.UpdateOrderStatusRequest;
import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Tag(name = "Order (Admin)", description = "Quản lý đơn hàng — admin/staff")
@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderService orderService;
    private final com.example.LaptopWorld_project.admin.service.AdminOrderCreateService adminOrderCreateService;

    @Operation(summary = "Đếm số đơn theo status — dùng cho tabs")
    @GetMapping("/status-counts")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_orders')")
    public ApiResponse<java.util.Map<String, Long>> statusCounts() {
        java.util.Map<String, Long> m = new java.util.LinkedHashMap<>();
        for (OrderStatus s : OrderStatus.values()) {
            m.put(s.name(), orderService.countByStatus(s));
        }
        return ApiResponse.ok(m);
    }

    @Operation(summary = "Danh sách đơn — filter keyword/status/date range")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_orders')")
    public ApiResponse<PagedResponse<OrderListItemDto>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        ZoneOffset off = OffsetDateTime.now().getOffset();
        OffsetDateTime fromDt = from != null ? from.atStartOfDay().atOffset(off) : null;
        OffsetDateTime toDt   = to   != null ? to.atTime(23, 59, 59, 999_000_000).atOffset(off) : null;
        return ApiResponse.ok(orderService.adminSearch(keyword, status, fromDt, toDt, pageable));
    }

    @Operation(summary = "Chi tiết đơn theo id")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_orders')")
    public ApiResponse<OrderDetailDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(orderService.adminFindById(id));
    }

    @Operation(summary = "Cập nhật trạng thái đơn (kèm ghi chú + mã vận đơn)")
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_orders')")
    public ApiResponse<OrderDetailDto> updateStatus(@PathVariable Long id,
                                                    @Valid @RequestBody UpdateOrderStatusRequest req,
                                                    @AuthenticationPrincipal UserPrincipal me) {
        return ApiResponse.ok("Cập nhật trạng thái thành công",
                orderService.adminUpdateStatus(id, req, me.getId()));
    }

    @Operation(summary = "Admin tạo đơn thay khách hàng — status = confirmed")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('create_orders_manual')")
    public ApiResponse<OrderDetailDto> create(
            @Valid @RequestBody com.example.LaptopWorld_project.admin.dto.AdminCreateOrderRequest req) {
        return ApiResponse.ok("Đã tạo đơn hàng", adminOrderCreateService.create(req));
    }
}
