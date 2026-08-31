package com.example.LaptopWorld_project.ai.controller;

import com.example.LaptopWorld_project.ai.service.ChatCleanupService;
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
    private final ChatCleanupService chatCleanupService;

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

    @Operation(summary = "Chạy dọn phiên chat guest cũ ngay lập tức (không đợi lịch Chủ nhật). "
            + "Số liệu ngày sắp xoá được gộp vào bảng chat_stats_daily trước khi xoá.")
    @PostMapping("/chat-cleanup/run-now")
    public ApiResponse<Map<String, Object>> runChatCleanup() {
        return ApiResponse.ok("Đã dọn xong", chatCleanupService.runCleanup());
    }

    @Operation(summary = "Thống kê chat N ngày gần nhất (mặc định 30) — dùng cho dashboard admin. "
            + "Kết hợp số liệu aggregate cũ + query live để không mất dữ liệu khi phiên đã bị dọn.")
    @GetMapping("/chat-stats")
    public ApiResponse<Map<String, Object>> chatStats(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "30") int days) {
        return ApiResponse.ok(chatCleanupService.getRecentStats(days));
    }
}
