package com.example.LaptopWorld_project.catalog.controller;

import com.example.LaptopWorld_project.catalog.dto.ProductDetailDto;
import com.example.LaptopWorld_project.catalog.dto.ProductListItemDto;
import com.example.LaptopWorld_project.catalog.dto.ProductRequest;
import com.example.LaptopWorld_project.catalog.service.ProductService;
import com.example.LaptopWorld_project.catalog.service.ProductSpecifications;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Product", description = "Sản phẩm — search/filter public + admin CRUD")
@RestController
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    // ---------- Public ----------
    @Operation(summary = "Tìm kiếm / lọc / phân trang sản phẩm",
               description = "Filter theo thông số kỹ thuật: truyền param `spec.<key>=value` (lặp lại để chọn nhiều value). "
                       + "VD `?categoryId=1&spec.ram=8GB&spec.ram=12GB&spec.chip=Snapdragon%208%20Gen%202`. "
                       + "Cùng key = OR, khác key = AND.")
    @GetMapping("/api/catalog/products")
    public ApiResponse<PagedResponse<ProductListItemDto>> search(
            @Parameter(description = "Từ khóa tìm theo tên") @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam MultiValueMap<String, String> allParams,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Map<String, List<String>> specs = extractSpecParams(allParams);
        return ApiResponse.ok(productService.search(keyword, categoryId, brandId,
                                                    minPrice, maxPrice, specs, pageable));
    }

    /** Lấy các param dạng `spec.<key>=value` từ query string thành Map. */
    private Map<String, List<String>> extractSpecParams(MultiValueMap<String, String> allParams) {
        Map<String, List<String>> specs = new LinkedHashMap<>();
        for (var e : allParams.entrySet()) {
            String name = e.getKey();
            if (name == null || !name.startsWith("spec.")) continue;
            String key = name.substring("spec.".length());
            if (key.isBlank()) continue;
            List<String> values = new ArrayList<>();
            for (String v : e.getValue()) {
                if (v != null && !v.isBlank()) values.add(v);
            }
            if (!values.isEmpty()) specs.put(key, values);
        }
        return specs;
    }

    @Operation(summary = "Danh sách value + count cho từng key thông số kỹ thuật theo category "
            + "(bao gồm sub-cat con). Dùng cho filter panel trang danh mục.")
    @GetMapping("/api/catalog/categories/{id}/spec-values")
    public ApiResponse<List<ProductService.SpecFilterGroup>> specValues(
            @PathVariable Long id,
            @RequestParam(defaultValue = "15") int topPerKey
    ) {
        return ApiResponse.ok(productService.findSpecValuesByCategory(id, topPerKey));
    }

    @Operation(summary = "Chi tiết sản phẩm theo slug (auto tăng lượt xem)")
    @GetMapping("/api/catalog/products/{slug}")
    public ApiResponse<ProductDetailDto> detail(@PathVariable String slug) {
        return ApiResponse.ok(productService.findBySlugAndIncrementViews(slug));
    }

    @Operation(summary = "Sản phẩm liên quan (cùng category, top view)")
    @GetMapping("/api/catalog/products/{id}/related")
    public ApiResponse<List<ProductListItemDto>> related(
            @PathVariable Long id,
            @RequestParam(defaultValue = "8") int limit
    ) {
        return ApiResponse.ok(productService.findRelated(id, limit));
    }

    // ---------- Admin ----------
    @Operation(summary = "[Admin] Danh sách sản phẩm — filter đầy đủ (keyword/category/brand/active/stockStatus)")
    @GetMapping("/api/admin/products")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_products')")
    public ApiResponse<PagedResponse<ProductListItemDto>> adminList(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) ProductSpecifications.StockStatus stockStatus,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ApiResponse.ok(productService.adminSearch(
                keyword, categoryId, brandId, isActive, stockStatus, pageable));
    }

    @Operation(summary = "[Admin] Chi tiết sản phẩm theo id")
    @GetMapping("/api/admin/products/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_products')")
    public ApiResponse<ProductDetailDto> adminDetail(@PathVariable Long id) {
        return ApiResponse.ok(productService.findByIdForAdmin(id));
    }

    @Operation(summary = "[Admin] Tạo sản phẩm")
    @PostMapping("/api/admin/products")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('create_products')")
    public ApiResponse<ProductDetailDto> create(@Valid @RequestBody ProductRequest req) {
        return ApiResponse.ok("Tạo sản phẩm thành công", productService.create(req));
    }

    @Operation(summary = "[Admin] Cập nhật sản phẩm")
    @PutMapping("/api/admin/products/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('edit_products')")
    public ApiResponse<ProductDetailDto> update(@PathVariable Long id,
                                                @Valid @RequestBody ProductRequest req) {
        return ApiResponse.ok("Cập nhật thành công", productService.update(id, req));
    }

    @Operation(summary = "[Admin] Xóa sản phẩm (soft delete)")
    @DeleteMapping("/api/admin/products/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('delete_products')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ApiResponse.message("Đã xóa sản phẩm");
    }

    /** Body cho toggle nhanh trạng thái kinh doanh — inline switch trong list SP. */
    public record SetActiveRequest(Boolean isActive) {}

    @Operation(summary = "[Admin] Bật/tắt trạng thái kinh doanh — inline toggle, không đụng field khác")
    @PatchMapping("/api/admin/products/{id}/active")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('edit_products')")
    public ApiResponse<ProductDetailDto> setActive(@PathVariable Long id,
                                                   @RequestBody SetActiveRequest req) {
        boolean value = req.isActive() != null && req.isActive();
        return ApiResponse.ok(
                value ? "Đã bật kinh doanh" : "Đã ngừng kinh doanh",
                productService.setActive(id, value));
    }

    @Operation(summary = "[Admin] Khôi phục sản phẩm đã xóa")
    @PostMapping("/api/admin/products/{id}/restore")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('delete_products')")
    public ApiResponse<Void> restore(@PathVariable Long id) {
        productService.restore(id);
        return ApiResponse.message("Đã khôi phục sản phẩm");
    }

    @Operation(summary = "[Admin] Danh sách sản phẩm đã xóa")
    @GetMapping("/api/admin/products/deleted")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_products')")
    public ApiResponse<List<ProductListItemDto>> listDeleted() {
        return ApiResponse.ok(productService.findDeleted());
    }
}
