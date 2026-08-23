package com.example.LaptopWorld_project.common;

import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.entity.UserStatus;
import com.example.LaptopWorld_project.user.repository.RoleRepository;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Seed 1 admin user lan dau app start.
 * Password mac dinh: admin123 (DOI NGAY sau khi login lan dau).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer {

    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_EMAIL    = "admin@laptopworld.local";
    private static final String ADMIN_PASSWORD = "admin123";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedAdmin() {
        if (userRepository.existsByUsername(ADMIN_USERNAME)) {
            return;
        }
        var adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("Role ADMIN chua duoc seed o V12"));

        User admin = new User();
        admin.setUsername(ADMIN_USERNAME);
        admin.setEmail(ADMIN_EMAIL);
        admin.setPassword(passwordEncoder.encode(ADMIN_PASSWORD));
        admin.setFullName("System Administrator");
        admin.setStatus(UserStatus.active);
        admin.setEmailVerifiedAt(OffsetDateTime.now());
        admin.addRole(adminRole);
        userRepository.save(admin);

        log.warn("=========================================================");
        log.warn(" Seeded ADMIN user: username={} password={}", ADMIN_USERNAME, ADMIN_PASSWORD);
        log.warn(" DOI PASSWORD NGAY LAP TUC sau khi login lan dau!");
        log.warn("=========================================================");
    }
}
