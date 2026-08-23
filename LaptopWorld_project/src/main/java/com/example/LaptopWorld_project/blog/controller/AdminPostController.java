package com.example.LaptopWorld_project.blog.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.blog.dto.PostDetailDto;
import com.example.LaptopWorld_project.blog.dto.PostListItemDto;
import com.example.LaptopWorld_project.blog.dto.PostRequest;
import com.example.LaptopWorld_project.blog.service.PostService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Post (Admin)", description = "CRUD bài viết blog")
@RestController
@RequestMapping("/api/admin/posts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_posts')")
public class AdminPostController {

    private final PostService postService;

    @Operation(summary = "Danh sách bài viết (filter keyword, category, published)")
    @GetMapping
    public ApiResponse<PagedResponse<PostListItemDto>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean isPublished,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.ok(postService.adminList(keyword, categoryId, isPublished, pageable));
    }

    @Operation(summary = "Chi tiết bài viết")
    @GetMapping("/{id}")
    public ApiResponse<PostDetailDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(postService.adminFindById(id));
    }

    @Operation(summary = "Tạo bài viết (author = user hiện tại nếu request không set)")
    @PostMapping
    public ApiResponse<PostDetailDto> create(@AuthenticationPrincipal UserPrincipal me,
                                             @Valid @RequestBody PostRequest req) {
        return ApiResponse.ok("Tạo bài viết thành công", postService.adminCreate(me.getId(), req));
    }

    @Operation(summary = "Cập nhật bài viết")
    @PutMapping("/{id}")
    public ApiResponse<PostDetailDto> update(@PathVariable Long id,
                                             @Valid @RequestBody PostRequest req) {
        return ApiResponse.ok("Cập nhật thành công", postService.adminUpdate(id, req));
    }

    @Operation(summary = "Xóa bài viết")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        postService.adminDelete(id);
        return ApiResponse.message("Đã xóa bài viết");
    }
}
