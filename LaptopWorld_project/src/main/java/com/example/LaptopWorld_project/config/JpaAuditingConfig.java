package com.example.LaptopWorld_project.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Kich hoat @CreatedDate / @LastModifiedDate.
 * BaseEntity dung OffsetDateTime — mac dinh Spring Data JPA sinh LocalDateTime,
 * khong convert duoc sang OffsetDateTime -> can DateTimeProvider tuy bien.
 */
@Configuration
@EnableJpaAuditing(dateTimeProviderRef = "offsetDateTimeProvider")
public class JpaAuditingConfig {

    @Bean
    public DateTimeProvider offsetDateTimeProvider() {
        return () -> Optional.of(OffsetDateTime.now());
    }
}
