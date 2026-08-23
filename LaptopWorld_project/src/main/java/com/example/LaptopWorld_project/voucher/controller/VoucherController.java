package com.example.LaptopWorld_project.voucher.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.voucher.dto.VoucherCheckResponse;
import com.example.LaptopWorld_project.voucher.dto.VoucherDto;
import com.example.LaptopWorld_project.voucher.service.VoucherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@Tag(name = "Voucher", description = "User lưu / xem / check voucher")
@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    @Operation(summary = "Danh sách voucher đang public (còn hạn + active). Có flag isSaved nếu user đã lưu.")
    @GetMapping("/available")
    public ApiResponse<List<VoucherDto>> available(@AuthenticationPrincipal UserPrincipal me) {
        return ApiResponse.ok(voucherService.listAvailable(me.getId()));
    }

    @Operation(summary = "Voucher tôi đã lưu (chưa dùng)")
    @GetMapping("/mine")
    public ApiResponse<List<VoucherDto>> mine(@AuthenticationPrincipal UserPrincipal me) {
        return ApiResponse.ok(voucherService.listMySaved(me.getId()));
    }

    @Operation(summary = "Lưu voucher vào tài khoản")
    @PostMapping("/{code}/save")
    public ApiResponse<VoucherDto> save(@AuthenticationPrincipal UserPrincipal me,
                                        @PathVariable String code) {
        return ApiResponse.ok("Đã lưu voucher", voucherService.saveVoucher(me.getId(), code));
    }

    @Operation(summary = "Preview áp voucher trước khi checkout (không mark used)")
    @GetMapping("/{code}/check")
    public ApiResponse<VoucherCheckResponse> check(@PathVariable String code,
                                                   @RequestParam BigDecimal subtotal) {
        return ApiResponse.ok(voucherService.check(code, subtotal));
    }
}
