package com.example.LaptopWorld_project.config;

import com.example.LaptopWorld_project.auth.filter.JwtAuthenticationFilter;
import com.example.LaptopWorld_project.auth.handler.JwtAccessDeniedHandler;
import com.example.LaptopWorld_project.auth.handler.JwtAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity   // Cho phep @PreAuthorize / @PostAuthorize tren method
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final JwtAuthenticationEntryPoint authEntryPoint;
    private final JwtAccessDeniedHandler accessDeniedHandler;
    private final CorsProperties corsProperties;

    // ------------------ Beans ------------------
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(UserDetailsService uds,
                                                            PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(uds);
        provider.setPasswordEncoder(encoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(corsProperties.allowedOrigins());
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Authorization"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }

    // ------------------ Filter chain ------------------
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> {})   // dung bean corsConfigurationSource o tren
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                // Public — auth endpoints
                .requestMatchers("/api/auth/register",
                                 "/api/auth/login",
                                 "/api/auth/refresh",
                                 "/api/auth/verify-email",
                                 "/api/auth/resend-verification",
                                 "/api/auth/forgot-password",
                                 "/api/auth/reset-password").permitAll()
                // Public — actuator & swagger
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**",
                                 "/v3/api-docs/**", "/swagger-resources/**").permitAll()
                // Public — catalog reads (Phase 3 se implement)
                .requestMatchers(HttpMethod.GET, "/api/catalog/**").permitAll()
                // Public — file tinh (anh san pham, banner...)
                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                // Public — semantic search (dung Gemini API, khong can login)
                .requestMatchers(HttpMethod.GET, "/api/catalog/search/**").permitAll()
                // AI chat: yêu cầu đăng nhập (V33 — bỏ hỗ trợ guest)
                .requestMatchers("/api/ai/chat/**").authenticated()
                // Public — blog reads (Phase 7)
                .requestMatchers(HttpMethod.GET, "/api/blog/**").permitAll()
                // Public — banners active (Phase 7)
                .requestMatchers(HttpMethod.GET, "/api/banners").permitAll()
                // Public — VNPay callback (return + IPN, Phase 10). VNPay không gửi
                // JWT, chỉ verify bằng HMAC-SHA512 checksum ở VnpayService.
                .requestMatchers(HttpMethod.GET, "/api/payments/vnpay/**").permitAll()
                // Admin — chỉ yêu cầu đã đăng nhập. Việc phân quyền chi tiết
                // (ADMIN bypass + hasAuthority('permission_code')) do @PreAuthorize
                // ở từng controller/method xử lý (Sprint 9G-perm Bước 1).
                .requestMatchers("/api/admin/**").authenticated()
                // Con lai bat buoc auth
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
