package com.example.LaptopWorld_project.blog.controller;

import com.example.LaptopWorld_project.blog.dto.PostCategoryDto;
import com.example.LaptopWorld_project.blog.dto.PostDetailDto;
import com.example.LaptopWorld_project.blog.dto.PostListItemDto;
import com.example.LaptopWorld_project.blog.service.PostCategoryService;
import com.example.LaptopWorld_project.blog.service.PostService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Blog (Public)", description = "Danh mục + bài viết công khai")
@RestController
@RequestMapping("/api/blog")
@RequiredArgsConstructor
public class BlogController {

    private final PostCategoryService postCategoryService;
    private final PostService postService;

    @Operation(summary = "Danh sách danh mục blog")
    @GetMapping("/post-categories")
    public ApiResponse<List<PostCategoryDto>> categories() {
        return ApiResponse.ok(postCategoryService.listAll());
    }

    @Operation(summary = "Danh sách bài viết đã publish (filter keyword, category)")
    @GetMapping("/posts")
    public ApiResponse<PagedResponse<PostListItemDto>> posts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @PageableDefault(size = 12) Pageable pageable) {
        return ApiResponse.ok(postService.publicList(keyword, categoryId, pageable));
    }

    @Operation(summary = "Chi tiết bài viết theo slug — mỗi lần gọi views tăng 1")
    @GetMapping("/posts/{slug}")
    public ApiResponse<PostDetailDto> postDetail(@PathVariable String slug) {
        return ApiResponse.ok(postService.publicFindBySlugAndIncrementViews(slug));
    }
}
