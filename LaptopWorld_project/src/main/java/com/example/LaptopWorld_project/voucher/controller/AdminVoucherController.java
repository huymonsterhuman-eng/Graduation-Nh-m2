package com.example.LaptopWorld_project.voucher.controller;

import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.voucher.dto.VoucherDto;
import com.example.LaptopWorld_project.voucher.dto.VoucherRequest;
import com.example.LaptopWorld_project.voucher.service.VoucherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Voucher (Admin)", description = "CRUD voucher — chỉ admin/staff")
@RestController
@RequestMapping("/api/admin/vouchers")
@RequiredArgsConstructor
public class AdminVoucherController {

    private final VoucherService voucherService;

    @Operation(summary = "Danh sách tất cả voucher")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('view_vouchers','manage_vouchers')")
    public ApiResponse<List<VoucherDto>> list() {
        return ApiResponse.ok(voucherService.adminListAll());
    }

    @Operation(summary = "Chi tiết voucher")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('view_vouchers','manage_vouchers')")
    public ApiResponse<VoucherDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(voucherService.adminFindById(id));
    }

    @Operation(summary = "Tạo voucher mới")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_vouchers')")
    public ApiResponse<VoucherDto> create(@Valid @RequestBody VoucherRequest req) {
        return ApiResponse.ok("Tạo voucher thành công", voucherService.adminCreate(req));
    }

    @Operation(summary = "Cập nhật voucher")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_vouchers')")
    public ApiResponse<VoucherDto> update(@PathVariable Long id,
                                          @Valid @RequestBody VoucherRequest req) {
        return ApiResponse.ok("Cập nhật thành công", voucherService.adminUpdate(id, req));
    }

    @Operation(summary = "Xóa voucher (chỉ khi chưa có ai dùng)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_vouchers')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        voucherService.adminDelete(id);
        return ApiResponse.message("Đã xóa voucher");
    }
}
