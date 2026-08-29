package com.example.LaptopWorld_project.ai.controller;

import com.example.LaptopWorld_project.ai.service.EmbeddingService;
import com.example.LaptopWorld_project.ai.service.ProductEmbeddingService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "AI (Admin)", description = "Quản lý pipeline embedding sản phẩm cho AI/RAG")
@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_ai_embedding')")
public class AdminAiController {

    private final ProductEmbeddingService productEmbeddingService;
    private final EmbeddingService embeddingService;

    @Operation(summary = "Stats embedding: bao nhiêu SP đã embed / còn pending")
    @GetMapping("/embedding-stats")
    public ApiResponse<Map<String, Object>> stats() {
        return ApiResponse.ok(productEmbeddingService.getStats());
    }

    @Operation(summary = "Trigger batch embed toàn bộ sản phẩm. force=true để re-embed tất cả (bỏ qua source_hash check).")
    @PostMapping("/embed-products")
    public ApiResponse<Map<String, Object>> embedAll(
            @RequestParam(defaultValue = "false") boolean force) {
        return ApiResponse.ok("Embedding hoàn tất",
                productEmbeddingService.embedAllProducts(force));
    }

    @Operation(summary = "Re-embed 1 sản phẩm theo id — gọi sau khi admin sửa nội dung SP.")
    @PostMapping("/embed-products/{id}")
    public ApiResponse<Map<String, Object>> embedOne(@org.springframework.web.bind.annotation.PathVariable Long id) {
        return ApiResponse.ok("Đã re-embed sản phẩm",
                productEmbeddingService.embedOne(id));
    }

    @Operation(summary = "Thống kê cache embedding query (hit/miss/hit rate) — dùng để đo hiệu quả cache")
    @GetMapping("/query-cache-stats")
    public ApiResponse<EmbeddingService.CacheStats> queryCacheStats() {
        return ApiResponse.ok(embeddingService.getStats());
    }

    @Operation(summary = "Xoá cache embedding query — buộc mọi query gọi lại Gemini")
    @PostMapping("/query-cache/clear")
    public ApiResponse<Void> clearQueryCache() {
        embeddingService.clearCache();
        return ApiResponse.message("Đã xoá cache embedding query");
    }
}
