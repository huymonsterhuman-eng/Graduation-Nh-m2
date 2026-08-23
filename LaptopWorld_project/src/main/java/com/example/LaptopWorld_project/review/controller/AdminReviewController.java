package com.example.LaptopWorld_project.review.controller;

import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.review.dto.AdminReplyRequest;
import com.example.LaptopWorld_project.review.dto.HideRequest;
import com.example.LaptopWorld_project.review.dto.ReviewDto;
import com.example.LaptopWorld_project.review.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Review (Admin)", description = "Kiểm duyệt review — ẩn, phản hồi, xóa")
@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
public class AdminReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "Danh sách review (filter is_hidden)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('view_reviews','manage_reviews')")
    public ApiResponse<PagedResponse<ReviewDto>> list(
            @RequestParam(required = false) Boolean isHidden,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.ok(reviewService.adminList(isHidden, pageable));
    }

    @Operation(summary = "Ẩn/hiện review — body {\"hidden\": true|false}")
    @PutMapping("/{id}/hide")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_reviews')")
    public ApiResponse<ReviewDto> setHidden(@PathVariable Long id,
                                            @Valid @RequestBody HideRequest req) {
        return ApiResponse.ok(req.hidden() ? "Đã ẩn review" : "Đã hiện lại review",
                reviewService.adminSetHidden(id, req.hidden()));
    }

    @Operation(summary = "Phản hồi review — body {\"reply\": \"...\"}")
    @PutMapping("/{id}/reply")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_reviews')")
    public ApiResponse<ReviewDto> reply(@PathVariable Long id,
                                        @Valid @RequestBody AdminReplyRequest req) {
        return ApiResponse.ok("Đã gửi phản hồi", reviewService.adminReply(id, req));
    }

    @Operation(summary = "Xóa review vĩnh viễn")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_reviews')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        reviewService.adminDelete(id);
        return ApiResponse.message("Đã xóa review");
    }
}
