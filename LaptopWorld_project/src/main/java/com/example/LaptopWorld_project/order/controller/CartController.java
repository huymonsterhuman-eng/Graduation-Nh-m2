package com.example.LaptopWorld_project.order.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.order.dto.AddToCartRequest;
import com.example.LaptopWorld_project.order.dto.CartDto;
import com.example.LaptopWorld_project.order.dto.UpdateCartItemRequest;
import com.example.LaptopWorld_project.order.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Cart", description = "Giỏ hàng của user hiện tại")
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @Operation(summary = "Xem giỏ hàng hiện tại")
    @GetMapping
    public ApiResponse<CartDto> myCart(@AuthenticationPrincipal UserPrincipal me) {
        return ApiResponse.ok(cartService.getMyCart(me.getId()));
    }

    @Operation(summary = "Thêm sản phẩm vào giỏ (nếu đã có, cộng dồn số lượng)")
    @PostMapping("/items")
    public ApiResponse<CartDto> addItem(@AuthenticationPrincipal UserPrincipal me,
                                        @Valid @RequestBody AddToCartRequest req) {
        return ApiResponse.ok("Đã thêm vào giỏ hàng", cartService.addItem(me.getId(), req));
    }

    @Operation(summary = "Cập nhật số lượng của 1 item")
    @PutMapping("/items/{itemId}")
    public ApiResponse<CartDto> updateItem(@AuthenticationPrincipal UserPrincipal me,
                                           @PathVariable Long itemId,
                                           @Valid @RequestBody UpdateCartItemRequest req) {
        return ApiResponse.ok("Đã cập nhật", cartService.updateItemQuantity(me.getId(), itemId, req.quantity()));
    }

    @Operation(summary = "Xóa 1 item khỏi giỏ")
    @DeleteMapping("/items/{itemId}")
    public ApiResponse<CartDto> removeItem(@AuthenticationPrincipal UserPrincipal me,
                                           @PathVariable Long itemId) {
        return ApiResponse.ok("Đã xóa khỏi giỏ", cartService.removeItem(me.getId(), itemId));
    }

    @Operation(summary = "Xóa toàn bộ giỏ hàng")
    @DeleteMapping
    public ApiResponse<Void> clear(@AuthenticationPrincipal UserPrincipal me) {
        cartService.clearCart(me.getId());
        return ApiResponse.message("Đã xóa toàn bộ giỏ hàng");
    }
}
