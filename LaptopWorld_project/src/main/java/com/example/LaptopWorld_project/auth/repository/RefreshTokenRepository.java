package com.example.LaptopWorld_project.auth.repository;

import com.example.LaptopWorld_project.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String tokenHash);

    /** Revoke all active refresh tokens cua user (dung khi doi mat khau / logout all). */
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now " +
           "WHERE r.user.id = :userId AND r.revokedAt IS NULL")
    int revokeAllActiveByUserId(@Param("userId") Long userId,
                                @Param("now") OffsetDateTime now);

    /** Xoa token het han (job dinh ky se goi). */
    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") OffsetDateTime cutoff);
}
