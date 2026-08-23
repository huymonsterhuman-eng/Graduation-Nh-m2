package com.example.LaptopWorld_project.auth.service;

import com.example.LaptopWorld_project.auth.entity.PasswordResetToken;
import com.example.LaptopWorld_project.auth.repository.PasswordResetTokenRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.config.AppProperties;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepo;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final MailService mailService;
    private final AppProperties appProperties;

    /**
     * Tạo token, gửi email chứa link reset. Silent nếu email không tồn tại
     * (tránh enumeration attack — lộ email nào đã đăng ký).
     */
    @Transactional
    public void requestReset(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            tokenRepo.invalidateAllForUser(user.getId(), OffsetDateTime.now());

            String rawToken = TokenHasher.randomToken();
            String hash = TokenHasher.sha256Hex(rawToken);

            PasswordResetToken token = new PasswordResetToken();
            token.setUser(user);
            token.setToken(hash);
            token.setExpiresAt(OffsetDateTime.now()
                    .plusMinutes(appProperties.passwordReset().tokenTtlMinutes()));
            tokenRepo.save(token);

            String link = appProperties.frontend().url()
                    + "/reset-password?token=" + rawToken;

            mailService.sendHtml(
                    user.getEmail(),
                    "Đặt lại mật khẩu LaptopWorld",
                    "email/reset-password",
                    Map.of(
                            "fullName", user.getFullName() != null ? user.getFullName() : user.getUsername(),
                            "resetUrl", link,
                            "expiresMinutes", appProperties.passwordReset().tokenTtlMinutes()
                    )
            );
        });
    }

    /**
     * Verify token → set mật khẩu mới → revoke tất cả refresh token của user (bảo mật).
     */
    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        String hash = TokenHasher.sha256Hex(rawToken);
        PasswordResetToken token = tokenRepo.findByToken(hash)
                .orElseThrow(() -> new BusinessException("INVALID_TOKEN",
                        "Mã đặt lại mật khẩu không tồn tại hoặc đã hết hạn"));

        if (!token.isUsable()) {
            throw new BusinessException("TOKEN_USED_OR_EXPIRED",
                    "Mã đặt lại mật khẩu đã được sử dụng hoặc hết hạn");
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setUsedAt(OffsetDateTime.now());
        tokenRepo.save(token);

        // Revoke tất cả refresh token cũ — buộc mọi thiết bị phải login lại
        refreshTokenService.revokeAllForUser(user.getId());

        log.info("Password reset for user id={} email={}", user.getId(), user.getEmail());
    }
}
