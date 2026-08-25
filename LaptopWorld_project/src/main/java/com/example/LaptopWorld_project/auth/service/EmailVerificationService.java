package com.example.LaptopWorld_project.auth.service;

import com.example.LaptopWorld_project.auth.entity.EmailVerificationToken;
import com.example.LaptopWorld_project.auth.repository.EmailVerificationTokenRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.config.AppProperties;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.entity.UserStatus;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private final EmailVerificationTokenRepository tokenRepo;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final AppProperties appProperties;

    /**
     * Sinh token moi, luu hash vao DB, gui email chua raw token.
     * Invalidate tat ca token cu chua dung cua user.
     */
    @Transactional
    public void sendVerification(User user) {
        tokenRepo.invalidateAllForUser(user.getId(), OffsetDateTime.now());

        String rawToken = TokenHasher.randomToken();
        String hash = TokenHasher.sha256Hex(rawToken);

        EmailVerificationToken entity = new EmailVerificationToken();
        entity.setUser(user);
        entity.setToken(hash);
        entity.setExpiresAt(OffsetDateTime.now()
                .plusHours(appProperties.verification().tokenTtlHours()));
        tokenRepo.save(entity);

        String link = appProperties.frontend().url()
                + "/xac-thuc-email/" + rawToken;

        mailService.sendHtml(
                user.getEmail(),
                "Xác thực email LaptopWorld",
                "email/verify-email",
                Map.of(
                        "fullName", user.getFullName() != null ? user.getFullName() : user.getUsername(),
                        "verifyUrl", link,
                        "expiresHours", appProperties.verification().tokenTtlHours()
                )
        );
    }

    /**
     * User submit raw token -> verify va activate account.
     * @return user da activate
     */
    @Transactional
    public User verify(String rawToken) {
        String hash = TokenHasher.sha256Hex(rawToken);
        EmailVerificationToken token = tokenRepo.findByToken(hash)
                .orElseThrow(() -> new BusinessException("INVALID_TOKEN",
                        "Mã xác thực không tồn tại hoặc đã hết hạn"));

        if (!token.isUsable()) {
            throw new BusinessException("TOKEN_USED_OR_EXPIRED",
                    "Mã xác thực đã được sử dụng hoặc hết hạn");
        }

        User user = token.getUser();
        user.setStatus(UserStatus.active);
        user.setEmailVerifiedAt(OffsetDateTime.now());
        userRepository.save(user);

        token.setUsedAt(OffsetDateTime.now());
        tokenRepo.save(token);

        log.info("User verified: id={} email={}", user.getId(), user.getEmail());
        return user;
    }
}
