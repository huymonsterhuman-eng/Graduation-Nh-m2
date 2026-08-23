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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Goods Receipt (Admin)", description = "Phiếu nhập kho — chỉ admin/staff")
@RestController
@RequestMapping("/api/admin/goods-receipts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_goods_receipt')")
public class AdminGoodsReceiptController {

    private final GoodsReceiptService goodsReceiptService;

    @Operation(summary = "Danh sách phiếu nhập (mới nhất trước)")
    @GetMapping
    public ApiResponse<PagedResponse<GoodsReceiptListItemDto>> list(
            @RequestParam(required = false) Long supplierId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.ok(goodsReceiptService.list(supplierId, pageable));
    }

    @Operation(summary = "Chi tiết phiếu nhập")
    @GetMapping("/{id}")
    public ApiResponse<GoodsReceiptDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(goodsReceiptService.findById(id));
    }

    @Operation(summary = "Tạo phiếu nhập kho mới")
    @PostMapping
    public ApiResponse<GoodsReceiptDto> create(
            @AuthenticationPrincipal UserPrincipal me,
            @Valid @RequestBody GoodsReceiptCreateRequest req) {
        return ApiResponse.ok("Tạo phiếu nhập thành công",
                goodsReceiptService.create(me.getId(), req));
    }
}
