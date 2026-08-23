package com.example.LaptopWorld_project.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record PostRequest(
        @NotBlank(message = "Tiêu đề bài viết không được để trống")
        @Size(max = 255)
        String title,

        @Size(max = 280)
        String slug,     // optional, service tự sinh nếu blank

        Long postCategoryId,   // nullable — bài không thuộc danh mục vẫn OK

        @Size(max = 500)
        String image,

        @Size(max = 1000, message = "Mô tả ngắn tối đa 1000 ký tự")
        String excerpt,

        String content,

        Boolean isPublished,           // null = giữ nguyên trạng thái cũ (khi update)
        OffsetDateTime publishedAt     // null = tự set now() khi publish lần đầu
) {}
