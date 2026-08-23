package com.example.LaptopWorld_project.ai.ratelimit;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Token bucket rate limiter cho chat endpoint.
 * Implement thuần Java để tránh phụ thuộc bucket4j (chưa lên Maven Central ở version cần).
 *
 * Cơ chế:
 *   - Mỗi session có 1 bucket riêng: (tokens, lastRefillNanos)
 *   - Refill liên tục: capacity/period tokens mỗi giây
 *   - Consume 1 token/request. Hết token → deny + trả retryAfter.
 *
 * Config:
 *   - capacity = burst (số request tối đa liên tiếp)
 *   - refill rate = maxPerHour / 3600 tokens/sec
 *
 * In-memory: mất khi restart. Với đồ án chấp nhận được.
 * Cho scale horizontal về sau: chuyển sang Redis-backed.
 */
@Slf4j
@Component
public class ChatRateLimiter {

    @Value("${app.ai.chat.max-messages-per-hour:30}")
    private int maxPerHour;

    @Value("${app.ai.chat.max-messages-burst:5}")
    private int burst;

    private final ConcurrentMap<Long, Bucket> buckets = new ConcurrentHashMap<>();

    public Result tryConsume(Long sessionId) {
        Bucket b = buckets.computeIfAbsent(sessionId, k -> new Bucket(burst));
        synchronized (b) {
            refill(b);
            if (b.tokens >= 1.0) {
                b.tokens -= 1.0;
                return new Result(true, (long) b.tokens, 0);
            }
            // Tính retry: bao lâu để có 1 token
            double refillRatePerSec = (double) maxPerHour / 3600.0;
            double needed = 1.0 - b.tokens;
            long retrySec = (long) Math.ceil(needed / refillRatePerSec);
            log.warn("Rate limit hit for session {} — retry after {}s", sessionId, retrySec);
            return new Result(false, 0, retrySec);
        }
    }

    private void refill(Bucket b) {
        long now = System.nanoTime();
        double elapsedSec = (now - b.lastRefillNanos) / 1_000_000_000.0;
        double refillRatePerSec = (double) maxPerHour / 3600.0;
        b.tokens = Math.min(burst, b.tokens + elapsedSec * refillRatePerSec);
        b.lastRefillNanos = now;
    }

    private static class Bucket {
        double tokens;
        long lastRefillNanos;
        Bucket(int initial) {
            this.tokens = initial;
            this.lastRefillNanos = System.nanoTime();
        }
    }

    public record Result(boolean allowed, long remaining, long retryAfterSeconds) {}
}
