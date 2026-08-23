package com.example.LaptopWorld_project.media.controller;

import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.media.dto.UploadResponse;
import com.example.LaptopWorld_project.media.service.MediaStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Media", description = "Upload file (ảnh sản phẩm, banner...)")
@RestController
@RequestMapping("/api/admin/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaStorageService storage;

    @Operation(summary = "[Admin] Upload 1 file. Trả về path để lưu vào DB.")
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('access_admin')")
    public ApiResponse<UploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "products") String folder
    ) {
        return ApiResponse.ok("Upload thành công", storage.store(file, folder));
    }
}
