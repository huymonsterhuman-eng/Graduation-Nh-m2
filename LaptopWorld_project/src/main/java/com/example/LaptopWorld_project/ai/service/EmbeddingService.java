package com.example.LaptopWorld_project.ai.service;

import com.example.LaptopWorld_project.ai.gemini.GeminiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Wrapper mỏng cho embedding + in-memory cache cho query embedding.
 *
 * Cache giảm chi phí gọi Gemini khi cùng câu query được lặp (VD trang AI recommend
 * dùng tên SP xem gần nhất — nhiều user cùng xem SP hot sẽ chia sẻ cùng 1 vector).
 * Chỉ cache TASK_QUERY vì TASK_DOCUMENT (indexing SP) chạy 1 lần rồi thôi.
 *
 * Không dùng thư viện cache ngoài (Caffeine/Redis) — ConcurrentHashMap + TTL đủ cho
 * scale demo/đồ án. Đổi sang Redis khi scale ≥ 2 JVM instance.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private static final long TTL_MILLIS = 60L * 60L * 1000L;   // 1 giờ
    private static final int MAX_ENTRIES = 500;

    private final GeminiClient gemini;

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final AtomicLong hits = new AtomicLong();
    private final AtomicLong misses = new AtomicLong();

    /** Embed câu query (search / recommend) — có cache 1 giờ theo text. */
    public float[] embedQuery(String text) {
        if (text == null) return gemini.embed(null, GeminiClient.TASK_QUERY);
        String key = text.trim().toLowerCase();
        long now = System.currentTimeMillis();

        CacheEntry entry = cache.get(key);
        if (entry != null && entry.expiresAt > now) {
            hits.incrementAndGet();
            log.debug("EmbeddingCache HIT key='{}' (hits={}/misses={})",
                    truncate(key), hits.get(), misses.get());
            return entry.vector;
        }
        // Cache miss (hoặc expired) — gọi Gemini
        float[] vec = gemini.embed(text, GeminiClient.TASK_QUERY);
        put(key, vec, now);
        misses.incrementAndGet();
        log.debug("EmbeddingCache MISS key='{}' (hits={}/misses={})",
                truncate(key), hits.get(), misses.get());
        return vec;
    }

    /** Embed nội dung SP (indexing) — KHÔNG cache. */
    public float[] embedDocument(String text) {
        return gemini.embed(text, GeminiClient.TASK_DOCUMENT);
    }

    /** Xoá toàn bộ cache — dùng khi cần force refresh (test / admin action). */
    public void clearCache() {
        int size = cache.size();
        cache.clear();
        hits.set(0);
        misses.set(0);
        log.info("EmbeddingCache cleared: {} entries", size);
    }

    /** Thống kê cho endpoint /admin/ai — dùng khi report/demo. */
    public CacheStats getStats() {
        return new CacheStats(cache.size(), hits.get(), misses.get(), computeHitRate());
    }

    private double computeHitRate() {
        long h = hits.get(), m = misses.get();
        long total = h + m;
        return total == 0 ? 0.0 : (double) h / total;
    }

    private void put(String key, float[] vec, long now) {
        if (cache.size() >= MAX_ENTRIES) evictOneExpiredOrOldest(now);
        cache.put(key, new CacheEntry(vec, now + TTL_MILLIS));
    }

    /**
     * Khi cache đầy: quét tìm entry đã hết hạn xoá trước; nếu không có entry expired
     * thì xoá 1 entry bất kỳ (ConcurrentHashMap không giữ order — chấp nhận randomness
     * để không phải maintain LRU list riêng, tránh contention khi concurrent).
     */
    private void evictOneExpiredOrOldest(long now) {
        Iterator<Map.Entry<String, CacheEntry>> it = cache.entrySet().iterator();
        String fallbackKey = null;
        while (it.hasNext()) {
            Map.Entry<String, CacheEntry> e = it.next();
            if (e.getValue().expiresAt <= now) {
                it.remove();
                return;
            }
            if (fallbackKey == null) fallbackKey = e.getKey();
        }
        if (fallbackKey != null) cache.remove(fallbackKey);
    }

    private static String truncate(String s) {
        return s.length() > 40 ? s.substring(0, 40) + "..." : s;
    }

    private record CacheEntry(float[] vector, long expiresAt) {}

    public record CacheStats(int size, long hits, long misses, double hitRate) {}
}
