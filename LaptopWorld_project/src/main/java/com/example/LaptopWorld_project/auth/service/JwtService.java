package com.example.LaptopWorld_project.auth.service;

import com.example.LaptopWorld_project.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Sign / parse / verify JWT (access token). Refresh token khong dung JWT — luu SHA hash trong DB.
 */
@Slf4j
@Service
public class JwtService {

    private final JwtProperties props;
    private final SecretKey key;

    public JwtService(JwtProperties props) {
        this.props = props;
        byte[] secretBytes = props.secret().getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalStateException(
                "app.jwt.secret phai >= 32 bytes (HS256). Hien tai: " + secretBytes.length);
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
    }

    // ---------- Generate ----------
    public String generateAccessToken(Long userId, String username, Collection<String> authorities) {
        Instant now = Instant.now();
        Instant exp = now.plus(props.accessTokenTtlMinutes(), ChronoUnit.MINUTES);

        return Jwts.builder()
                .issuer(props.issuer())
                .subject(username)
                .claim("uid", userId)
                .claim("auth", authorities)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    // ---------- Parse ----------
    public Optional<Claims> parseClaims(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(props.issuer())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(claims);
        } catch (JwtException e) {
            log.debug("JWT invalid: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<String> extractUsername(String token) {
        return parseClaims(token).map(Claims::getSubject);
    }
}
