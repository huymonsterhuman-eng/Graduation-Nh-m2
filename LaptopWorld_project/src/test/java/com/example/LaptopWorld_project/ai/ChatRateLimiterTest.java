package com.example.LaptopWorld_project.ai;

import com.example.LaptopWorld_project.ai.ratelimit.ChatRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit test ChatRateLimiter — token bucket thuan Java.
 * Config qua ReflectionTestUtils (khong load Spring context).
 */
class ChatRateLimiterTest {

    private ChatRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new ChatRateLimiter();
        // capacity = 5 burst, refill = 30/hour → moi 120s them 1 token
        ReflectionTestUtils.setField(limiter, "maxPerHour", 30);
        ReflectionTestUtils.setField(limiter, "burst", 5);
    }

    @Test
    @DisplayName("Burst — 5 request lien tiep dau tien duoc phep")
    void tryConsume_burst_allowsFirst5() {
        Long sessionId = 100L;

        for (int i = 0; i < 5; i++) {
            ChatRateLimiter.Result r = limiter.tryConsume(sessionId);
            assertThat(r.allowed()).as("request %d", i + 1).isTrue();
        }
    }

    @Test
    @DisplayName("Vuot burst — request thu 6 bi chan (allowed=false + retryAfter > 0)")
    void tryConsume_exceedBurst_deniedWithRetryAfter() {
        Long sessionId = 101L;

        // Xai het 5 token
        for (int i = 0; i < 5; i++) limiter.tryConsume(sessionId);

        ChatRateLimiter.Result r6 = limiter.tryConsume(sessionId);

        assertThat(r6.allowed()).isFalse();
        assertThat(r6.retryAfterSeconds()).isGreaterThan(0);
        assertThat(r6.remaining()).isZero();
    }

    @Test
    @DisplayName("Session khac nhau — bucket rieng, khong anh huong lan nhau")
    void tryConsume_differentSessions_independentBuckets() {
        Long sessionA = 200L;
        Long sessionB = 201L;

        // A xai het 5 token
        for (int i = 0; i < 5; i++) limiter.tryConsume(sessionA);
        // A bi chan
        assertThat(limiter.tryConsume(sessionA).allowed()).isFalse();

        // B van con day du 5 token
        for (int i = 0; i < 5; i++) {
            assertThat(limiter.tryConsume(sessionB).allowed()).isTrue();
        }
    }
}
