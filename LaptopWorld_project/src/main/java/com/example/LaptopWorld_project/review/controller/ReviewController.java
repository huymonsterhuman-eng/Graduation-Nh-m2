package com.example.LaptopWorld_project.review.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.review.dto.CreateReviewRequest;
import com.example.LaptopWorld_project.review.dto.ReviewDto;
import com.example.LaptopWorld_project.review.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Review", description = "Đánh giá sản phẩm — chỉ khách đã mua & nhận hàng mới được đăng")
@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "Đăng đánh giá sản phẩm (yêu cầu login + đã có đơn delivered chứa SP)")
    @PostMapping("/api/reviews")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<ReviewDto> create(@AuthenticationPrincipal UserPrincipal me,
                                         @Valid @RequestBody CreateReviewRequest req) {
        return ApiResponse.ok("Cảm ơn bạn đã đánh giá sản phẩm", reviewService.createReview(me.getId(), req));
    }

    @Operation(summary = "Danh sách đánh giá công khai của 1 sản phẩm (chưa bị ẩn) — path dưới /api/catalog để public")
    @GetMapping("/api/catalog/products/{productId}/reviews")
    public ApiResponse<PagedResponse<ReviewDto>> listByProduct(
            @PathVariable Long productId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.ok(reviewService.listByProduct(productId, pageable));
    }
}
