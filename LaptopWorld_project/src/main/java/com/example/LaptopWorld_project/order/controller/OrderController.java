package com.example.LaptopWorld_project.order.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.order.dto.CheckoutRequest;
import com.example.LaptopWorld_project.order.dto.CheckoutResponse;
import com.example.LaptopWorld_project.order.dto.OrderDetailDto;
import com.example.LaptopWorld_project.order.dto.OrderListItemDto;
import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.order.service.CheckoutService;
import com.example.LaptopWorld_project.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Order (User)", description = "Đặt hàng, xem đơn của tôi, hủy đơn")
@RestController
@RequiredArgsConstructor
public class OrderController {

    private final CheckoutService checkoutService;
    private final OrderService orderService;

    @Operation(summary = "Đặt hàng từ giỏ hàng hiện tại — trả kèm paymentUrl nếu VNPay/MoMo")
    @PostMapping("/api/checkout")
    public ApiResponse<CheckoutResponse> checkout(@AuthenticationPrincipal UserPrincipal me,
                                                  @Valid @RequestBody CheckoutRequest req,
                                                  jakarta.servlet.http.HttpServletRequest request) {
        String clientIp = extractClientIp(request);
        return ApiResponse.ok("Đặt hàng thành công",
                checkoutService.placeOrder(me.getId(), req, clientIp));
    }

    private static String extractClientIp(jakarta.servlet.http.HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        String real = req.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) return real;
        return req.getRemoteAddr();
    }

    @Operation(summary = "Danh sách đơn của tôi (filter theo status)")
    @GetMapping("/api/orders")
    public ApiResponse<PagedResponse<OrderListItemDto>> myOrders(
            @AuthenticationPrincipal UserPrincipal me,
            @RequestParam(required = false) OrderStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.ok(orderService.myOrders(me.getId(), status, pageable));
    }

    @Operation(summary = "Chi tiết đơn theo mã (VD ORD-20260817-001)")
    @GetMapping("/api/orders/{code}")
    public ApiResponse<OrderDetailDto> detail(@AuthenticationPrincipal UserPrincipal me,
                                              @PathVariable String code) {
        return ApiResponse.ok(orderService.myOrderByCode(me.getId(), code));
    }

    @Operation(summary = "Hủy đơn — chỉ được khi status=pending")
    @PostMapping("/api/orders/{code}/cancel")
    public ApiResponse<OrderDetailDto> cancel(@AuthenticationPrincipal UserPrincipal me,
                                              @PathVariable String code) {
        return ApiResponse.ok("Đã hủy đơn hàng", orderService.userCancel(me.getId(), code));
    }
}
