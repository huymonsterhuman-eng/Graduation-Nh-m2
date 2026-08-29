package com.example.LaptopWorld_project.ai.service;

import com.example.LaptopWorld_project.catalog.dto.ProductListItemDto;
import com.example.LaptopWorld_project.catalog.entity.Category;
import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.mapper.ProductMapper;
import com.example.LaptopWorld_project.catalog.repository.CategoryRepository;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.catalog.service.ProductSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final CategoryRepository categoryRepository;
    private final ProductMapper productMapper;
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate namedJdbc;

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

    /**
     * Hybrid search: filter cứng (SQL) + rerank ngữ nghĩa (vector, tùy chọn).
     *
     * Chia sức lao động rõ ràng để tránh embedding phí công:
     * <ul>
     *   <li>Ràng buộc số/enum (giá, category, brand) → SQL prefilter chính xác 100%.</li>
     *   <li>Nhu cầu mơ hồ ("cho lập trình", "chơi game AAA") → vector rerank
     *       trong tập đã prefilter.</li>
     *   <li>Không có query semantic → không gọi Gemini, sort theo views.</li>
     * </ul>
     * Prefilter cap 200 SP để giới hạn overhead vector query (thực tế
     * dataset 200 SP hiện không đụng cap).
     */
    @Transactional(readOnly = true)
    public List<SemanticResult> hybridSearch(String query,
                                             Long categoryId,
                                             Long brandId,
                                             BigDecimal minPrice,
                                             BigDecimal maxPrice,
                                             Map<String, List<String>> specs,
                                             int limit) {
        int k = Math.min(Math.max(limit, 1), 50);
        boolean hasQuery = query != null && !query.isBlank();

        List<Long> categoryIds = resolveCategoryIdsWithChildren(categoryId);

        // === Case A: KHÔNG có query semantic — SQL thuần, sort views ===
        if (!hasQuery) {
            var spec = ProductSpecifications.withFilter(null, categoryIds, brandId,
                    minPrice, maxPrice, true, specs);
            var pageable = PageRequest.of(0, k, Sort.by(Sort.Direction.DESC, "views"));
            List<Product> products = productRepository.findAll(spec, pageable).getContent();
            return products.stream()
                    .map(p -> new SemanticResult(productMapper.toListItem(p), 0.0))
                    .toList();
        }

        // === Case B: có query semantic — SQL prefilter → vector rerank ===
        var spec = ProductSpecifications.withFilter(null, categoryIds, brandId,
                minPrice, maxPrice, true, specs);
        // Cap 200 để giới hạn IN clause cho vector query
        var prefilterPageable = PageRequest.of(0, 200);
        List<Long> filteredIds = productRepository.findAll(spec, prefilterPageable)
                .getContent().stream()
                .map(Product::getId)
                .toList();

        if (filteredIds.isEmpty()) return List.of();

        float[] queryVec = embeddingService.embedQuery(query);
        String vecLiteral = ProductEmbeddingService.toPgVectorLiteral(queryVec);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("vec", vecLiteral)
                .addValue("ids", filteredIds)
                .addValue("k", k);

        List<Map<String, Object>> rows = namedJdbc.queryForList("""
                SELECT p.id AS product_id,
                       1 - (pe.embedding <=> (:vec)::vector) AS similarity
                FROM product_embeddings pe
                JOIN products p ON p.id = pe.product_id
                WHERE p.id IN (:ids)
                  AND p.deleted_at IS NULL
                  AND p.is_active = TRUE
                ORDER BY pe.embedding <=> (:vec)::vector
                LIMIT :k
                """, params);

        if (rows.isEmpty()) return List.of();

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
            if (p == null) continue;
            results.add(new SemanticResult(productMapper.toListItem(p), simMap.get(id)));
        }
        return results;
    }

    /** Cho category cha → trả [catId, ...id con]. Cho lá / null → [catId] / null. */
    private List<Long> resolveCategoryIdsWithChildren(Long categoryId) {
        if (categoryId == null) return null;
        List<Long> ids = new ArrayList<>();
        ids.add(categoryId);
        categoryRepository.findByParentIdOrderBySortOrderAsc(categoryId)
                .forEach((Category c) -> ids.add(c.getId()));
        return ids;
    }

    public record SemanticResult(ProductListItemDto product, double similarity) {}
}
