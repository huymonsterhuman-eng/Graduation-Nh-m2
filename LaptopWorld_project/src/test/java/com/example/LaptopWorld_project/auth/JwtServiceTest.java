package com.example.LaptopWorld_project.auth;

import com.example.LaptopWorld_project.auth.service.JwtService;
import com.example.LaptopWorld_project.config.JwtProperties;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit test JwtService — generate + parse + verify.
 * Khong mock cai gi vi JJWT thuan tinh toan.
 */
class JwtServiceTest {

    private static final String SECRET_64 =
            "test_only_fake_secret_key_for_hs256_algorithm_min_64_bytes_long_ok_ok";
    private static final String ISSUER = "laptopworld-test";

    private JwtService buildService(long ttlMinutes) {
        JwtProperties props = new JwtProperties(SECRET_64, ttlMinutes, 7L, ISSUER);
        return new JwtService(props);
    }

    @Test
    @DisplayName("Generate + parse — token hop le tra ve claims dung")
    void generateAndParse_validToken_returnsClaims() {
        JwtService svc = buildService(15);
        String token = svc.generateAccessToken(42L, "user1", List.of("ROLE_USER", "view_products"));

        Optional<Claims> claims = svc.parseClaims(token);

        assertThat(claims).isPresent();
        assertThat(claims.get().getSubject()).isEqualTo("user1");
        assertThat(claims.get().get("uid", Long.class)).isEqualTo(42L);
        assertThat(claims.get().getIssuer()).isEqualTo(ISSUER);
        @SuppressWarnings("unchecked")
        List<String> auth = claims.get().get("auth", List.class);
        assertThat(auth).containsExactly("ROLE_USER", "view_products");
    }

    @Test
    @DisplayName("Parse token da het han — tra ve Optional.empty")
    void parseClaims_expiredToken_returnsEmpty() throws InterruptedException {
        JwtService shortLived = buildService(0); // 0 phut → het han ngay
        String token = shortLived.generateAccessToken(1L, "u", List.of());

        Thread.sleep(100); // dam bao chac chan qua thoi diem exp
        Optional<Claims> claims = shortLived.parseClaims(token);

        assertThat(claims).isEmpty();
    }

    @Test
    @DisplayName("Parse token ky bang secret khac — tra ve Optional.empty (khong crash)")
    void parseClaims_wrongSecret_returnsEmpty() {
        JwtService svc1 = buildService(15);
        String token = svc1.generateAccessToken(1L, "u", List.of());

        JwtProperties otherProps = new JwtProperties(
                "another_completely_different_secret_key_for_hs256_algorithm_that_is_long_ok",
                15L, 7L, ISSUER);
        JwtService svc2 = new JwtService(otherProps);

        Optional<Claims> claims = svc2.parseClaims(token);

        assertThat(claims).isEmpty();
    }

    @Test
    @DisplayName("Secret ngan hon 32 bytes — constructor throw IllegalStateException")
    void constructor_shortSecret_throws() {
        JwtProperties badProps = new JwtProperties("short", 15L, 7L, ISSUER);

        assertThatThrownBy(() -> new JwtService(badProps))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.jwt.secret");
    }

    @Test
    @DisplayName("extractUsername — tra ve subject cua token")
    void extractUsername_validToken_returnsSubject() {
        JwtService svc = buildService(15);
        String token = svc.generateAccessToken(7L, "admin", List.of("ROLE_ADMIN"));

        Optional<String> username = svc.extractUsername(token);

        assertThat(username).contains("admin");
    }
}
