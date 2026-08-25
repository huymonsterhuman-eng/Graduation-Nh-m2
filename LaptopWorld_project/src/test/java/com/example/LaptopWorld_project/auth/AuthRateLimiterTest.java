package com.example.LaptopWorld_project.auth;

import com.example.LaptopWorld_project.auth.ratelimit.AuthRateLimiter;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthRateLimiterTest {

    private AuthRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new AuthRateLimiter();
    }

    private HttpServletRequest reqWithIp(String ip) {
        HttpServletRequest r = Mockito.mock(HttpServletRequest.class);
        Mockito.when(r.getRemoteAddr()).thenReturn(ip);
        // X-Forwarded-For null → fallback getRemoteAddr
        Mockito.when(r.getHeader("X-Forwarded-For")).thenReturn(null);
        return r;
    }

    @Test
    @DisplayName("Login — 10 lan dau tu 1 IP deu pass")
    void checkLogin_first10FromSameIp_pass() {
        HttpServletRequest req = reqWithIp("1.2.3.4");
        for (int i = 0; i < 10; i++) {
            int attempt = i + 1;
            assertThatCode(() -> limiter.checkLogin(req))
                    .as("attempt " + attempt).doesNotThrowAnyException();
        }
    }

    @Test
    @DisplayName("Login — lan 11 tu cung IP throw BusinessException RATE_LIMITED 429")
    void checkLogin_11thAttempt_throws() {
        HttpServletRequest req = reqWithIp("2.3.4.5");
        for (int i = 0; i < 10; i++) limiter.checkLogin(req);

        assertThatThrownBy(() -> limiter.checkLogin(req))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> {
                    BusinessException be = (BusinessException) e;
                    assertThat(be.getCode()).isEqualTo("RATE_LIMITED");
                    assertThat(be.getStatus().value()).isEqualTo(429);
                    assertThat(be.getMessage()).contains("đăng nhập");
                });
    }

    @Test
    @DisplayName("Login — IP khac khong bi anh huong (bucket rieng)")
    void checkLogin_differentIps_independent() {
        HttpServletRequest ip1 = reqWithIp("10.0.0.1");
        HttpServletRequest ip2 = reqWithIp("10.0.0.2");

        // ip1 xai het quota
        for (int i = 0; i < 10; i++) limiter.checkLogin(ip1);
        assertThatThrownBy(() -> limiter.checkLogin(ip1))
                .isInstanceOf(BusinessException.class);

        // ip2 van con quota day du 10 lan
        for (int i = 0; i < 10; i++) {
            int attempt = i + 1;
            assertThatCode(() -> limiter.checkLogin(ip2))
                    .as("ip2 attempt " + attempt).doesNotThrowAnyException();
        }
    }

    @Test
    @DisplayName("Register — chi cho 5 lan / 1 gio / IP")
    void checkRegister_moreThan5_throws() {
        HttpServletRequest req = reqWithIp("3.3.3.3");
        for (int i = 0; i < 5; i++) limiter.checkRegister(req);

        assertThatThrownBy(() -> limiter.checkRegister(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("đăng ký");
    }

    @Test
    @DisplayName("ForgotPassword — chi cho 3 lan / 1 gio / IP")
    void checkForgotPassword_moreThan3_throws() {
        HttpServletRequest req = reqWithIp("4.4.4.4");
        limiter.checkForgotPassword(req);
        limiter.checkForgotPassword(req);
        limiter.checkForgotPassword(req);

        assertThatThrownBy(() -> limiter.checkForgotPassword(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("quên mật khẩu");
    }

    @Test
    @DisplayName("X-Forwarded-For — lay IP dau tien khi co proxy chain")
    void resolveClientIp_xffChain_returnsFirst() {
        HttpServletRequest r = Mockito.mock(HttpServletRequest.class);
        Mockito.when(r.getHeader("X-Forwarded-For")).thenReturn("203.0.113.1, 10.0.0.5, 172.16.0.10");
        Mockito.when(r.getRemoteAddr()).thenReturn("172.16.0.10");

        String ip = AuthRateLimiter.resolveClientIp(r);

        assertThat(ip).isEqualTo("203.0.113.1");
    }
}
