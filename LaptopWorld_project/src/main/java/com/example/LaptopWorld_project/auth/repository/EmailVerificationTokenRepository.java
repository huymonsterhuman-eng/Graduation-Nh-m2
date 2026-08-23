package com.example.LaptopWorld_project.auth.repository;

import com.example.LaptopWorld_project.auth.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByToken(String tokenHash);

    /** Invalidate cac token cu chua dung khi user resend hoac verify thanh cong. */
    @Modifying
    @Query("UPDATE EmailVerificationToken t SET t.usedAt = :now " +
           "WHERE t.user.id = :userId AND t.usedAt IS NULL")
    int invalidateAllForUser(@Param("userId") Long userId,
                             @Param("now") OffsetDateTime now);
}
