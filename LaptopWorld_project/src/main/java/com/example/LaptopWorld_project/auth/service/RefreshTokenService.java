package com.example.LaptopWorld_project.auth.service;

import com.example.LaptopWorld_project.auth.entity.RefreshToken;
import com.example.LaptopWorld_project.auth.repository.RefreshTokenRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.config.JwtProperties;
import com.example.LaptopWorld_project.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository repo;
    private final JwtProperties jwtProperties;

    /** Sinh refresh token, luu hash vao DB, tra ve raw token cho client. */
    @Transactional
    public String issue(User user, HttpServletRequest request) {
        String raw = TokenHasher.randomToken();
        String hash = TokenHasher.sha256Hex(raw);

        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setToken(hash);
        token.setExpiresAt(OffsetDateTime.now()
                .plusDays(jwtProperties.refreshTokenTtlDays()));
        if (request != null) {
            token.setUserAgent(request.getHeader("User-Agent"));
            token.setIp(request.getRemoteAddr());
        }
        repo.save(token);
        return raw;
    }

    /** Verify raw token va tra ve entity. Neu invalid -> BusinessException. */
    @Transactional(readOnly = true)
    public RefreshToken verify(String rawToken) {
        String hash = TokenHasher.sha256Hex(rawToken);
        RefreshToken token = repo.findByToken(hash)
                .orElseThrow(() -> new BusinessException("INVALID_REFRESH_TOKEN",
                        "Refresh token không hợp lệ"));
        if (!token.isActive()) {
            throw new BusinessException("REFRESH_TOKEN_REVOKED",
                    "Refresh token đã bị thu hồi hoặc hết hạn");
        }
        return token;
    }

    /** Revoke 1 token cu the (dung khi logout). */
    @Transactional
    public void revoke(String rawToken) {
        String hash = TokenHasher.sha256Hex(rawToken);
        repo.findByToken(hash).ifPresent(t -> {
            if (t.getRevokedAt() == null) {
                t.setRevokedAt(OffsetDateTime.now());
                repo.save(t);
            }
        });
    }

    /** Revoke tat ca token cua user (dung khi reset password). */
    @Transactional
    public void revokeAllForUser(Long userId) {
        repo.revokeAllActiveByUserId(userId, OffsetDateTime.now());
    }
}
