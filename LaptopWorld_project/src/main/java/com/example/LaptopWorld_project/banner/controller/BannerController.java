package com.example.LaptopWorld_project.banner.controller;

import com.example.LaptopWorld_project.banner.dto.BannerDto;
import com.example.LaptopWorld_project.banner.service.BannerService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Banner (Public)", description = "Danh sách banner active cho trang chủ")
@RestController
@RequestMapping("/api/banners")
@RequiredArgsConstructor
public class BannerController {

    private final BannerService bannerService;

    @Operation(summary = "Danh sách banner đang bật ở carousel chính")
    @GetMapping
    public ApiResponse<List<BannerDto>> listActive() {
        return ApiResponse.ok(bannerService.publicListActive());
    }

    @Operation(summary = "Banner đang bật ở slot cụ thể (VD sidebar_phone, sidebar_laptop). Trả null nếu chưa có.")
    @GetMapping("/slot/{position}")
    public ApiResponse<BannerDto> bySlot(@PathVariable String position) {
        return ApiResponse.ok(bannerService.findActiveBySlot(position).orElse(null));
    }
}
