package com.example.LaptopWorld_project.ai.controller;

import com.example.LaptopWorld_project.ai.service.SemanticSearchService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    @Operation(summary = "Hybrid search: filter cứng SQL (category/brand/giá/spec) + rerank ngữ nghĩa (vector) — "
            + "chia sức lao động: SQL cho ràng buộc rõ ràng, AI cho nhu cầu mơ hồ. "
            + "Không có q → SQL thuần, không tốn token. "
            + "Filter theo thông số: truyền `spec.<key>=value` (lặp lại để chọn nhiều). "
            + "VD `?categoryId=2&spec.ram=8GB&spec.ram=16GB`.")
    @GetMapping("/api/catalog/search/hybrid")
    public ApiResponse<List<SemanticSearchService.SemanticResult>> hybrid(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) java.math.BigDecimal minPrice,
            @RequestParam(required = false) java.math.BigDecimal maxPrice,
            @RequestParam MultiValueMap<String, String> allParams,
            @RequestParam(defaultValue = "20") int limit) {
        Map<String, List<String>> specs = extractSpecParams(allParams);
        return ApiResponse.ok(semanticSearchService.hybridSearch(
                q, categoryId, brandId, minPrice, maxPrice, specs, limit));
    }

    /** Extract `spec.<key>=value` từ query string thành Map — giống ProductController. */
    private Map<String, List<String>> extractSpecParams(MultiValueMap<String, String> allParams) {
        Map<String, List<String>> specs = new LinkedHashMap<>();
        for (var e : allParams.entrySet()) {
            String name = e.getKey();
            if (name == null || !name.startsWith("spec.")) continue;
            String key = name.substring("spec.".length());
            if (key.isBlank()) continue;
            List<String> values = new ArrayList<>();
            for (String v : e.getValue()) {
                if (v != null && !v.isBlank()) values.add(v);
            }
            if (!values.isEmpty()) specs.put(key, values);
        }
        return specs;
    }
}
