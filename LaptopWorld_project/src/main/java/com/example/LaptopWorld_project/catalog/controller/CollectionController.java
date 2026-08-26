package com.example.LaptopWorld_project.catalog.controller;

import com.example.LaptopWorld_project.catalog.dto.CollectionDto;
import com.example.LaptopWorld_project.catalog.dto.CollectionRequest;
import com.example.LaptopWorld_project.catalog.dto.ProductListItemDto;
import com.example.LaptopWorld_project.catalog.entity.HomePosition;
import com.example.LaptopWorld_project.catalog.service.CollectionService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Collection", description = "Bộ sưu tập marketing — public read + admin CRUD")
@RestController
@RequiredArgsConstructor
public class CollectionController {

    private final CollectionService collectionService;

    @Operation(summary = "Danh sách collection theo vị trí chip trên homepage " +
            "(NONE / PHONE_CHIP / LAPTOP_CHIP)")
    @GetMapping("/api/catalog/collections/by-position/{position}")
    public ApiResponse<List<CollectionDto>> listByPosition(@PathVariable HomePosition position) {
        return ApiResponse.ok(collectionService.findByHomePosition(position));
    }

    @Operation(summary = "Danh sách collection được đánh dấu Nổi bật — " +
            "cho section 'Bộ sưu tập nổi bật' trên homepage")
    @GetMapping("/api/catalog/collections/featured")
    public ApiResponse<List<CollectionDto>> featuredList() {
        return ApiResponse.ok(collectionService.findFeatured());
    }

    @Operation(summary = "[BC] Alias cũ cho /featured — giữ để FE cũ không vỡ")
    @GetMapping("/api/catalog/collections/home")
    public ApiResponse<List<CollectionDto>> homeList() {
        return ApiResponse.ok(collectionService.findFeatured());
    }

    @Operation(summary = "Chi tiết collection theo slug")
    @GetMapping("/api/catalog/collections/{slug}")
    public ApiResponse<CollectionDto> detail(@PathVariable String slug) {
        return ApiResponse.ok(collectionService.findBySlug(slug));
    }

    @Operation(summary = "Danh sách SP thuộc collection — public, chỉ SP đang active")
    @GetMapping("/api/catalog/collections/{slug}/products")
    public ApiResponse<List<ProductListItemDto>> publicProducts(
            @PathVariable String slug,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "8") int limit) {
        return ApiResponse.ok(collectionService.findPublicProductsBySlug(slug, limit));
    }

    @Operation(summary = "[Admin] Danh sách tất cả collection")
    @GetMapping("/api/admin/collections")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_collections')")
    public ApiResponse<List<CollectionDto>> listAll() {
        return ApiResponse.ok(collectionService.findAll());
    }

    @Operation(summary = "[Admin] Tạo collection")
    @PostMapping("/api/admin/collections")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_collections')")
    public ApiResponse<CollectionDto> create(@Valid @RequestBody CollectionRequest req) {
        return ApiResponse.ok("Tạo bộ sưu tập thành công", collectionService.create(req));
    }

    @Operation(summary = "[Admin] Cập nhật collection")
    @PutMapping("/api/admin/collections/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_collections')")
    public ApiResponse<CollectionDto> update(@PathVariable Long id,
                                             @Valid @RequestBody CollectionRequest req) {
        return ApiResponse.ok("Cập nhật thành công", collectionService.update(id, req));
    }

    @Operation(summary = "[Admin] Xóa collection")
    @DeleteMapping("/api/admin/collections/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_collections')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        collectionService.delete(id);
        return ApiResponse.message("Đã xóa bộ sưu tập");
    }

    @Operation(summary = "[Admin] Danh sách SP trong collection")
    @GetMapping("/api/admin/collections/{id}/products")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_collections')")
    public ApiResponse<List<ProductListItemDto>> listProducts(@PathVariable Long id) {
        return ApiResponse.ok(collectionService.findProductsInCollection(id));
    }

    @Operation(summary = "[Admin] Thêm sản phẩm vào collection")
    @PostMapping("/api/admin/collections/{id}/products")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_collections')")
    public ApiResponse<CollectionDto> addProducts(@PathVariable Long id,
                                                  @RequestBody List<Long> productIds) {
        return ApiResponse.ok("Đã thêm sản phẩm vào bộ sưu tập",
                collectionService.addProducts(id, productIds));
    }

    @Operation(summary = "[Admin] Xóa sản phẩm khỏi collection")
    @DeleteMapping("/api/admin/collections/{id}/products/{productId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_collections')")
    public ApiResponse<CollectionDto> removeProduct(@PathVariable Long id,
                                                    @PathVariable Long productId) {
        return ApiResponse.ok("Đã xóa sản phẩm khỏi bộ sưu tập",
                collectionService.removeProduct(id, productId));
    }
}
