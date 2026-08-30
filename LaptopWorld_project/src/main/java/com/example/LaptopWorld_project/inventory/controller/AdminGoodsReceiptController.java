package com.example.LaptopWorld_project.inventory.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptCreateRequest;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsReceiptListItemDto;
import com.example.LaptopWorld_project.inventory.service.GoodsReceiptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Tag(name = "Goods Receipt (Admin)", description = "Phiếu nhập kho — chỉ admin/staff")
@RestController
@RequestMapping("/api/admin/goods-receipts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_goods_receipt')")
public class AdminGoodsReceiptController {

    private final GoodsReceiptService goodsReceiptService;

    @Operation(summary = "Danh sách phiếu nhập (mới nhất trước) — filter theo NCC + khoảng ngày")
    @GetMapping
    public ApiResponse<PagedResponse<GoodsReceiptListItemDto>> list(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "createdAt",
                    direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        OffsetDateTime fromTs = from != null ? from.atStartOfDay().atOffset(ZoneOffset.UTC) : null;
        OffsetDateTime toTs   = to   != null ? to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC) : null;
        return ApiResponse.ok(goodsReceiptService.list(supplierId, fromTs, toTs, pageable));
    }

    @Operation(summary = "Chi tiết phiếu nhập")
    @GetMapping("/{id}")
    public ApiResponse<GoodsReceiptDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(goodsReceiptService.findById(id));
    }

    @Operation(summary = "Tạo phiếu nhập kho mới (trạng thái pending, chưa cộng stock)")
    @PostMapping
    public ApiResponse<GoodsReceiptDto> create(
            @AuthenticationPrincipal UserPrincipal me,
            @Valid @RequestBody GoodsReceiptCreateRequest req) {
        return ApiResponse.ok("Đã tạo phiếu nhập — chờ duyệt",
                goodsReceiptService.create(me.getId(), req));
    }

    @Operation(summary = "Duyệt phiếu nhập — cộng stock + kích hoạt lô cho FIFO")
    @PostMapping("/{id}/approve")
    public ApiResponse<GoodsReceiptDto> approve(
            @AuthenticationPrincipal UserPrincipal me,
            @PathVariable Long id) {
        return ApiResponse.ok("Đã duyệt phiếu nhập — kho đã được cộng thêm",
                goodsReceiptService.approve(id, me.getId()));
    }

    @Operation(summary = "Hủy phiếu nhập (chỉ khi pending) — không đụng stock")
    @PostMapping("/{id}/cancel")
    public ApiResponse<GoodsReceiptDto> cancel(
            @AuthenticationPrincipal UserPrincipal me,
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ApiResponse.ok("Đã hủy phiếu nhập",
                goodsReceiptService.cancel(id, me.getId(), reason));
    }
}
