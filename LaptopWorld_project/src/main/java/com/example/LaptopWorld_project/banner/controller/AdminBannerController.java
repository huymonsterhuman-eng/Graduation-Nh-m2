package com.example.LaptopWorld_project.banner.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.banner.dto.BannerDto;
import com.example.LaptopWorld_project.banner.dto.BannerRequest;
import com.example.LaptopWorld_project.banner.service.BannerService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Banner (Admin)", description = "CRUD banner trang chủ")
@RestController
@RequestMapping("/api/admin/banners")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_banners')")
public class AdminBannerController {

    private final BannerService bannerService;

    @Operation(summary = "Danh sách tất cả banner (bao gồm inactive)")
    @GetMapping
    public ApiResponse<List<BannerDto>> list() {
        return ApiResponse.ok(bannerService.adminListAll());
    }

    @Operation(summary = "Chi tiết banner")
    @GetMapping("/{id}")
    public ApiResponse<BannerDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(bannerService.adminFindById(id));
    }

    @Operation(summary = "Tạo banner mới")
    @PostMapping
    public ApiResponse<BannerDto> create(@AuthenticationPrincipal UserPrincipal me,
                                         @Valid @RequestBody BannerRequest req) {
        return ApiResponse.ok("Tạo banner thành công", bannerService.adminCreate(me.getId(), req));
    }

    @Operation(summary = "Cập nhật banner")
    @PutMapping("/{id}")
    public ApiResponse<BannerDto> update(@PathVariable Long id,
                                         @Valid @RequestBody BannerRequest req) {
        return ApiResponse.ok("Cập nhật thành công", bannerService.adminUpdate(id, req));
    }

    @Operation(summary = "Xóa banner")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        bannerService.adminDelete(id);
        return ApiResponse.message("Đã xóa banner");
    }
}
