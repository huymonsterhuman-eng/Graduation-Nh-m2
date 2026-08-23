package com.example.LaptopWorld_project.ai.service;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.config.GeminiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Batch embed sản phẩm vào product_embeddings.
 * Dùng JdbcTemplate + native SQL vì pgvector không map JPA sẵn.
 * Skip re-embed nếu source_hash chưa đổi (nội dung SP không đổi).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductEmbeddingService {

    private final ProductRepository productRepository;
    private final EmbeddingService embeddingService;
    private final JdbcTemplate jdbc;
    private final GeminiProperties geminiProps;

    @Value("${app.ai.embedding.batch-size:20}")
    private int batchSize;

    @Value("${app.ai.embedding.batch-delay-ms:500}")
    private long batchDelayMs;

    /**
     * Quét toàn bộ sản phẩm active và embed những cái chưa có / source đã thay đổi.
     * KHÔNG dùng @Transactional bao ngoài:
     *   - findAllForEmbedding() tự chạy trong tx ngắn (Spring Data mặc định), trả entity
     *     đã EAGER load brand+category → không lazy issue khi loop outside.
     *   - Mỗi JdbcTemplate.update tự auto-commit → không giữ connection lâu.
     *   - Gemini call ~1s/request, batch 200 SP mất ~3 phút → không nên nằm trong 1 tx.
     */
    public Map<String, Object> embedAllProducts(boolean force) {
        List<Product> all = productRepository.findAllForEmbedding();
        Map<Long, String> existingHashes = loadExistingHashes();

        int total = all.size();
        int embedded = 0;
        int skipped = 0;
        int failed = 0;
        long start = System.currentTimeMillis();

        for (int i = 0; i < all.size(); i++) {
            Product p = all.get(i);
            if (!p.isActive()) { skipped++; continue; }

            String text = buildEmbedText(p);
            String hash = sha256Hex(text);
            String existing = existingHashes.get(p.getId());

            if (!force && hash.equals(existing)) {
                skipped++;
                continue;
            }

            try {
                float[] vec = embeddingService.embedDocument(text);
                upsertEmbedding(p.getId(), vec, hash);
                embedded++;
                if (embedded % batchSize == 0) {
                    log.info("Embedded {}/{} products...", embedded + skipped, total);
                    sleep(batchDelayMs);
                }
            } catch (Exception e) {
                log.error("Failed to embed product id={}: {}", p.getId(), e.getMessage());
                failed++;
            }
        }

        long durationMs = System.currentTimeMillis() - start;
        log.info("Embedding done: {} embedded, {} skipped, {} failed in {}ms",
                 embedded, skipped, failed, durationMs);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalProducts", total);
        stats.put("embedded", embedded);
        stats.put("skipped", skipped);
        stats.put("failed", failed);
        stats.put("durationMs", durationMs);
        return stats;
    }

    /**
     * Embed 1 SP theo id — dùng khi admin re-embed từ trang sản phẩm.
     * Bypass source_hash check (luôn re-embed).
     *
     * @Transactional để giữ Session mở suốt lúc build text (brand/category lazy).
     */
    @Transactional
    public Map<String, Object> embedOne(Long productId) {
        Product p = productRepository.findWithDetailsById(productId)
                .orElseThrow(() -> new com.example.LaptopWorld_project.common.exception
                        .ResourceNotFoundException("Product", productId));
        if (!p.isActive()) {
            throw new com.example.LaptopWorld_project.common.exception.BusinessException(
                    "PRODUCT_INACTIVE", "Sản phẩm đang ngừng kinh doanh — không thể embed.");
        }
        String text = buildEmbedText(p);
        String hash = sha256Hex(text);
        long start = System.currentTimeMillis();
        float[] vec = embeddingService.embedDocument(text);
        upsertEmbedding(p.getId(), vec, hash);
        long durationMs = System.currentTimeMillis() - start;

        Map<String, Object> stats = new HashMap<>();
        stats.put("productId", p.getId());
        stats.put("productName", p.getName());
        stats.put("dimensions", vec.length);
        stats.put("durationMs", durationMs);
        return stats;
    }

    /**
     * Stats: bao nhiêu SP có embedding, bao nhiêu chưa.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        Long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND is_active = TRUE",
                Long.class);
        Long embedded = jdbc.queryForObject(
                "SELECT COUNT(*) FROM product_embeddings", Long.class);
        Map<String, Object> stats = new HashMap<>();
        stats.put("activeProducts", total);
        stats.put("embedded", embedded);
        stats.put("pending", (total != null ? total : 0) - (embedded != null ? embedded : 0));
        return stats;
    }

    // ==================== helpers ====================
    private Map<Long, String> loadExistingHashes() {
        Map<Long, String> map = new HashMap<>();
        jdbc.query("SELECT product_id, source_hash FROM product_embeddings",
                rs -> { map.put(rs.getLong(1), rs.getString(2)); });
        return map;
    }

    private void upsertEmbedding(Long productId, float[] embedding, String sourceHash) {
        String vec = toPgVectorLiteral(embedding);
        jdbc.update("""
                INSERT INTO product_embeddings (product_id, embedding, source_hash, embedded_at)
                VALUES (?, ?::vector, ?, NOW())
                ON CONFLICT (product_id) DO UPDATE
                    SET embedding = EXCLUDED.embedding,
                        source_hash = EXCLUDED.source_hash,
                        embedded_at = EXCLUDED.embedded_at
                """, productId, vec, sourceHash);
    }

    /** Text để embed: name + short_desc + brand + category + specs. */
    private String buildEmbedText(Product p) {
        StringBuilder sb = new StringBuilder();
        sb.append(p.getName()).append(". ");
        if (p.getShortDescription() != null) sb.append(p.getShortDescription()).append(". ");
        if (p.getBrand() != null)    sb.append("Thương hiệu: ").append(p.getBrand().getName()).append(". ");
        if (p.getCategory() != null) sb.append("Danh mục: ").append(p.getCategory().getName()).append(". ");
        if (p.getSpecs() != null) {
            sb.append("Thông số: ");
            p.getSpecs().forEach((k, v) -> sb.append(k).append("=").append(v).append(", "));
        }
        sb.append("Giá: ").append(p.getEffectivePrice()).append("đ.");
        return sb.toString();
    }

    /** float[] → "[1.0,2.0,3.0]" — format pgvector accept. */
    static String toPgVectorLiteral(float[] arr) {
        StringBuilder sb = new StringBuilder(arr.length * 8);
        sb.append('[');
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(arr[i]);
        }
        sb.append(']');
        return sb.toString();
    }

    private static String sha256Hex(String text) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
