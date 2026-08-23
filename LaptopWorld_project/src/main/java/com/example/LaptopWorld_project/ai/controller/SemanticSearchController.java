package com.example.LaptopWorld_project.ai.controller;

import com.example.LaptopWorld_project.ai.service.SemanticSearchService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Semantic Search", description = "Tìm sản phẩm bằng ngôn ngữ tự nhiên (vector similarity)")
@RestController
@RequiredArgsConstructor
public class SemanticSearchController {

    private final SemanticSearchService semanticSearchService;

    @Operation(summary = "Tìm sản phẩm theo câu hỏi tự nhiên. Trả về top-K + similarity score (0-1, càng cao càng gần).")
    @GetMapping("/api/catalog/search/semantic")
    public ApiResponse<List<SemanticSearchService.SemanticResult>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.ok(semanticSearchService.search(q, limit));
    }
}
