package com.example.LaptopWorld_project.catalog.controller;

import com.example.LaptopWorld_project.catalog.dto.CategoryDto;
import com.example.LaptopWorld_project.catalog.dto.CategoryRequest;
import com.example.LaptopWorld_project.catalog.dto.CategoryTreeDto;
import com.example.LaptopWorld_project.catalog.service.CategoryService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Category", description = "Danh mục sản phẩm — public read + admin CRUD")
@RestController
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    // ---------- Public ----------
    @Operation(summary = "Danh sách category đang active (phẳng)")
    @GetMapping("/api/catalog/categories")
    public ApiResponse<List<CategoryDto>> list() {
        return ApiResponse.ok(categoryService.findAllActive());
    }

    @Operation(summary = "Cây danh mục (nested children)")
    @GetMapping("/api/catalog/categories/tree")
    public ApiResponse<List<CategoryTreeDto>> tree() {
        return ApiResponse.ok(categoryService.getTree());
    }

    @Operation(summary = "Chi tiết category theo slug")
    @GetMapping("/api/catalog/categories/{slug}")
    public ApiResponse<CategoryDto> detail(@PathVariable String slug) {
        return ApiResponse.ok(categoryService.findBySlug(slug));
    }

    // ---------- Admin ----------
    @Operation(summary = "[Admin] Danh sách toàn bộ category (kể cả inactive)")
    @GetMapping("/api/admin/categories")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_categories')")
    public ApiResponse<List<CategoryDto>> listAll() {
        return ApiResponse.ok(categoryService.findAll());
    }

    @Operation(summary = "[Admin] Tạo category mới")
    @PostMapping("/api/admin/categories")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_categories')")
    public ApiResponse<CategoryDto> create(@Valid @RequestBody CategoryRequest req) {
        return ApiResponse.ok("Tạo danh mục thành công", categoryService.create(req));
    }

    @Operation(summary = "[Admin] Cập nhật category")
    @PutMapping("/api/admin/categories/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_categories')")
    public ApiResponse<CategoryDto> update(@PathVariable Long id,
                                           @Valid @RequestBody CategoryRequest req) {
        return ApiResponse.ok("Cập nhật thành công", categoryService.update(id, req));
    }

    @Operation(summary = "[Admin] Xóa category (chặn nếu còn danh mục con)")
    @DeleteMapping("/api/admin/categories/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_categories')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ApiResponse.message("Đã xóa danh mục");
    }

    @Operation(summary = "[Admin] Đếm SP đang dùng từng field spec — dùng để khoá UI đổi kiểu/xoá")
    @GetMapping("/api/admin/categories/{id}/spec-usage")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_categories') or hasAuthority('view_categories')")
    public ApiResponse<Map<String, Integer>> specUsage(@PathVariable Long id) {
        return ApiResponse.ok(categoryService.getSpecUsage(id));
    }
}
