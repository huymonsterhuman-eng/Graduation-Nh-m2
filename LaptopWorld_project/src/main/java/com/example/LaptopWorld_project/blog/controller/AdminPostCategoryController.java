package com.example.LaptopWorld_project.blog.controller;

import com.example.LaptopWorld_project.blog.dto.PostCategoryDto;
import com.example.LaptopWorld_project.blog.dto.PostCategoryRequest;
import com.example.LaptopWorld_project.blog.service.PostCategoryService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Post Category (Admin)", description = "CRUD danh mục bài viết")
@RestController
@RequestMapping("/api/admin/post-categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_posts')")
public class AdminPostCategoryController {

    private final PostCategoryService postCategoryService;

    @Operation(summary = "Danh sách tất cả danh mục")
    @GetMapping
    public ApiResponse<List<PostCategoryDto>> list() {
        return ApiResponse.ok(postCategoryService.listAll());
    }

    @Operation(summary = "Chi tiết danh mục")
    @GetMapping("/{id}")
    public ApiResponse<PostCategoryDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(postCategoryService.findById(id));
    }

    @Operation(summary = "Tạo danh mục")
    @PostMapping
    public ApiResponse<PostCategoryDto> create(@Valid @RequestBody PostCategoryRequest req) {
        return ApiResponse.ok("Tạo danh mục thành công", postCategoryService.create(req));
    }

    @Operation(summary = "Cập nhật danh mục")
    @PutMapping("/{id}")
    public ApiResponse<PostCategoryDto> update(@PathVariable Long id,
                                               @Valid @RequestBody PostCategoryRequest req) {
        return ApiResponse.ok("Cập nhật thành công", postCategoryService.update(id, req));
    }

    @Operation(summary = "Xóa danh mục (chỉ khi chưa có bài viết nào dùng)")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        postCategoryService.delete(id);
        return ApiResponse.message("Đã xóa danh mục");
    }
}
