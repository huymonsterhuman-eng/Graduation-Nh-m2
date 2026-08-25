package com.example.LaptopWorld_project.auth.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.example.LaptopWorld_project.common.exception.BusinessException;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Rate limiter cho cac endpoint auth nhay cam — chong brute force + spam.
 * Thuan Java in-memory (khong dung Redis/Bucket4j).
 *
 * Giới hạn theo IP client:
 *   - Login: 10 lan / 15 phut
 *   - Register: 5 lan / 1 gio
 *   - Forgot password: 3 lan / 1 gio
 *
 * Cach lay IP: uu tien X-Forwarded-For (Nginx set), fallback request.getRemoteAddr().
 *
 * LƯU Ý: In-memory → mất khi restart, khong share giua nhieu instance backend.
 * Chap nhan duoc voi 1 instance. Scale horizontal → chuyen sang Redis-backed.
 */
@Slf4j
@Component
public class AuthRateLimiter {

    // ---------- Cau hinh gioi han ----------
    // Login: 10 lan / 900 giay (15 phut)
    private static final int LOGIN_MAX = 10;
    private static final long LOGIN_WINDOW_SEC = 900;

    // Register: 5 lan / 3600 giay (1 gio)
    private static final int REGISTER_MAX = 5;
    private static final long REGISTER_WINDOW_SEC = 3600;

    // Forgot password: 3 lan / 3600 giay (1 gio)
    private static final int FORGOT_MAX = 3;
    private static final long FORGOT_WINDOW_SEC = 3600;

    private final ConcurrentMap<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Bucket> registerBuckets = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Bucket> forgotBuckets = new ConcurrentHashMap<>();

    /** Kiem tra login rate limit. Throws BusinessException 429 neu vuot. */
    public void checkLogin(HttpServletRequest req) {
        checkAndConsume(loginBuckets, resolveClientIp(req),
                LOGIN_MAX, LOGIN_WINDOW_SEC,
                "login", "Quá nhiều lần đăng nhập, vui lòng thử lại sau 15 phút.");
    }

    /** Kiem tra register rate limit. */
    public void checkRegister(HttpServletRequest req) {
        checkAndConsume(registerBuckets, resolveClientIp(req),
                REGISTER_MAX, REGISTER_WINDOW_SEC,
                "register", "Quá nhiều lần đăng ký từ IP này, vui lòng thử lại sau 1 giờ.");
    }

    /** Kiem tra forgot-password rate limit. */
    public void checkForgotPassword(HttpServletRequest req) {
        checkAndConsume(forgotBuckets, resolveClientIp(req),
                FORGOT_MAX, FORGOT_WINDOW_SEC,
                "forgot-password", "Quá nhiều yêu cầu quên mật khẩu, vui lòng thử lại sau 1 giờ.");
    }

    // ==================== helpers ====================

    private void checkAndConsume(ConcurrentMap<String, Bucket> buckets, String ip,
                                 int maxTokens, long windowSec,
                                 String action, String errorMsg) {
        double refillRate = (double) maxTokens / windowSec; // tokens/sec
        Bucket b = buckets.computeIfAbsent(ip, k -> new Bucket(maxTokens));
        synchronized (b) {
            refill(b, maxTokens, refillRate);
            if (b.tokens >= 1.0) {
                b.tokens -= 1.0;
                return;
            }
            long retrySec = (long) Math.ceil((1.0 - b.tokens) / refillRate);
            log.warn("Rate limit hit — action={} ip={} retry_after={}s", action, ip, retrySec);
            throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS,
                    "RATE_LIMITED", errorMsg + " (retry sau " + retrySec + "s)");
        }
    }

    private void refill(Bucket b, int max, double refillRatePerSec) {
        long now = System.nanoTime();
        double elapsedSec = (now - b.lastRefillNanos) / 1_000_000_000.0;
        b.tokens = Math.min(max, b.tokens + elapsedSec * refillRatePerSec);
        b.lastRefillNanos = now;
    }

    /**
     * Uu tien X-Forwarded-For (Nginx set voi proxy_set_header), fallback getRemoteAddr.
     * X-Forwarded-For co the chua nhieu IP (client, proxy1, proxy2) → lay IP dau tien.
     */
    public static String resolveClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        String remote = req.getRemoteAddr();
        return remote != null ? remote : "unknown";
    }

    private static class Bucket {
        double tokens;
        long lastRefillNanos;
        Bucket(int initial) {
            this.tokens = initial;
            this.lastRefillNanos = System.nanoTime();
        }
    }
}
