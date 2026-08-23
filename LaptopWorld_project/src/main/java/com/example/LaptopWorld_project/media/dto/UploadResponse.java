package com.example.LaptopWorld_project.media.dto;

public record UploadResponse(
        String path,       // "/uploads/products/xxx.jpg" — lưu vào DB
        String url,        // "http://localhost:8080/uploads/products/xxx.jpg" — dùng để hiển thị
        String filename,   // tên gốc client upload lên
        long size,         // bytes
        String contentType
) {}
