package com.example.LaptopWorld_project.ai.service;

import com.example.LaptopWorld_project.catalog.dto.ProductListItemDto;
import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.mapper.ProductMapper;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Semantic search: embed query → tìm SP gần nhất qua vector similarity (pgvector).
 * Trả về ProductListItemDto (dùng lại DTO của Phase 3) + kèm similarity score.
 */
@Service
@RequiredArgsConstructor
public class SemanticSearchService {

    private final EmbeddingService embeddingService;
    private final ProductRepository productRepository;
    private final ProductMapper productMapper;
    private final JdbcTemplate jdbc;

    /**
     * @param query câu hỏi tự nhiên
     * @param limit số kết quả tối đa (mặc định 10, max 50)
     */
    @Transactional(readOnly = true)
    public List<SemanticResult> search(String query, int limit) {
        if (query == null || query.isBlank()) return List.of();
        int k = Math.min(Math.max(limit, 1), 50);

        float[] queryVec = embeddingService.embedQuery(query);
        String vecLiteral = ProductEmbeddingService.toPgVectorLiteral(queryVec);

        // Cosine similarity = 1 - cosine distance. Hàm <=> trả cosine distance.
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.id AS product_id,
                       1 - (pe.embedding <=> ?::vector) AS similarity
                FROM product_embeddings pe
                JOIN products p ON p.id = pe.product_id
                WHERE p.deleted_at IS NULL AND p.is_active = TRUE
                ORDER BY pe.embedding <=> ?::vector
                LIMIT ?
                """, vecLiteral, vecLiteral, k);

        if (rows.isEmpty()) return List.of();

        // Load Product entities (giữ thứ tự theo similarity)
        List<Long> ids = rows.stream().map(r -> ((Number) r.get("product_id")).longValue()).toList();
        Map<Long, Double> simMap = new HashMap<>();
        for (Map<String, Object> r : rows) {
            simMap.put(((Number) r.get("product_id")).longValue(),
                       ((Number) r.get("similarity")).doubleValue());
        }
        Map<Long, Product> productMap = new HashMap<>();
        productRepository.findAllById(ids).forEach(p -> productMap.put(p.getId(), p));

        List<SemanticResult> results = new ArrayList<>(ids.size());
        for (Long id : ids) {
            Product p = productMap.get(id);
            if (p == null) continue;   // race condition: SP vừa bị xóa
            results.add(new SemanticResult(productMapper.toListItem(p), simMap.get(id)));
        }
        return results;
    }

    public record SemanticResult(ProductListItemDto product, double similarity) {}
}
