package com.example.LaptopWorld_project.catalog.controller;

import com.example.LaptopWorld_project.catalog.dto.BrandDto;
import com.example.LaptopWorld_project.catalog.dto.BrandRequest;
import com.example.LaptopWorld_project.catalog.service.BrandService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Brand", description = "Thương hiệu — public read + admin CRUD")
@RestController
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @Operation(summary = "Danh sách brand đang active")
    @GetMapping("/api/catalog/brands")
    public ApiResponse<List<BrandDto>> list() {
        return ApiResponse.ok(brandService.findAllActive());
    }

    @Operation(summary = "Chi tiết brand theo slug")
    @GetMapping("/api/catalog/brands/{slug}")
    public ApiResponse<BrandDto> detail(@PathVariable String slug) {
        return ApiResponse.ok(brandService.findBySlug(slug));
    }

    @Operation(summary = "[Admin] Danh sách toàn bộ brand")
    @GetMapping("/api/admin/brands")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_brands')")
    public ApiResponse<List<BrandDto>> listAll() {
        return ApiResponse.ok(brandService.findAll());
    }

    @Operation(summary = "[Admin] Tạo brand mới")
    @PostMapping("/api/admin/brands")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_brands')")
    public ApiResponse<BrandDto> create(@Valid @RequestBody BrandRequest req) {
        return ApiResponse.ok("Tạo thương hiệu thành công", brandService.create(req));
    }

    @Operation(summary = "[Admin] Cập nhật brand")
    @PutMapping("/api/admin/brands/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_brands')")
    public ApiResponse<BrandDto> update(@PathVariable Long id,
                                        @Valid @RequestBody BrandRequest req) {
        return ApiResponse.ok("Cập nhật thành công", brandService.update(id, req));
    }

    @Operation(summary = "[Admin] Xóa brand")
    @DeleteMapping("/api/admin/brands/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_brands')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        brandService.delete(id);
        return ApiResponse.message("Đã xóa thương hiệu");
    }
}
