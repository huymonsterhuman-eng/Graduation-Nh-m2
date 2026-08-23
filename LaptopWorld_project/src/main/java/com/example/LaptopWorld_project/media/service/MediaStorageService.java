package com.example.LaptopWorld_project.media.service;

import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.media.dto.UploadResponse;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class MediaStorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024; // 10 MB

    @Value("${app.upload.dir}")
    private String uploadDir;

    private Path rootPath;

    @PostConstruct
    void init() throws IOException {
        this.rootPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(rootPath);
        log.info("Media upload dir: {}", rootPath);
    }

    /**
     * @param folder subfolder trong uploads/, VD "products" | "banners" | "avatars"
     */
    public UploadResponse store(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("EMPTY_FILE", "File không được để trống");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new BusinessException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE",
                    "File vượt quá kích thước tối đa 10MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new BusinessException("INVALID_TYPE",
                    "Chỉ hỗ trợ file ảnh (jpg, png, webp, gif)");
        }
        String safeFolder = sanitizeFolder(folder);
        String ext = extractExtension(file.getOriginalFilename(), contentType);
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;

        try {
            Path targetDir = rootPath.resolve(safeFolder).normalize();
            if (!targetDir.startsWith(rootPath)) {
                throw new BusinessException("INVALID_FOLDER", "Đường dẫn folder không hợp lệ");
            }
            Files.createDirectories(targetDir);
            Path target = targetDir.resolve(filename);
            file.transferTo(target);

            String urlPath = "/uploads/" + safeFolder + "/" + filename;
            String fullUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path(urlPath).toUriString();

            log.info("Stored file: {} -> {}", file.getOriginalFilename(), target);
            return new UploadResponse(urlPath, fullUrl,
                    file.getOriginalFilename(), file.getSize(), contentType);
        } catch (IOException e) {
            throw new RuntimeException("Không thể lưu file: " + e.getMessage(), e);
        }
    }

    private String sanitizeFolder(String folder) {
        if (folder == null || folder.isBlank()) return "misc";
        return folder.replaceAll("[^a-z0-9_-]", "").toLowerCase();
    }

    private String extractExtension(String originalName, String contentType) {
        if (originalName != null && originalName.contains(".")) {
            String ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
            if (ext.matches("\\.(jpg|jpeg|png|webp|gif)")) return ext;
        }
        return switch (contentType) {
            case "image/png"  -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif"  -> ".gif";
            default           -> ".jpg";
        };
    }
}
