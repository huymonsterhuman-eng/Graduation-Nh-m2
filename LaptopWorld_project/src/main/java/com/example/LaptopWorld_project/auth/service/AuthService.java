package com.example.LaptopWorld_project.auth.service;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.auth.dto.*;
import com.example.LaptopWorld_project.auth.entity.RefreshToken;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.config.JwtProperties;
import com.example.LaptopWorld_project.user.entity.Role;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.entity.UserStatus;
import com.example.LaptopWorld_project.user.repository.RoleRepository;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String CUSTOMER_ROLE = "CUSTOMER";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService verificationService;
    private final AuthenticationManager authenticationManager;

    // ==================== REGISTER ====================
    @Transactional
    public void register(RegisterRequest req) {
        if (userRepository.existsByUsername(req.username())) {
            throw new BusinessException("USERNAME_TAKEN", "Tên đăng nhập đã tồn tại");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException("EMAIL_TAKEN", "Email đã được đăng ký");
        }
        Role customerRole = roleRepository.findByName(CUSTOMER_ROLE)
                .orElseThrow(() -> new IllegalStateException("Role CUSTOMER chưa được seed"));

        User user = new User();
        user.setUsername(req.username());
        user.setEmail(req.email());
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setFullName(req.fullName());
        user.setPhone(req.phone());
        user.setStatus(UserStatus.unverified);
        user.addRole(customerRole);
        userRepository.save(user);

        verificationService.sendVerification(user);
        log.info("Registered user id={} email={}", user.getId(), user.getEmail());
    }

    // ==================== RESEND VERIFICATION ====================
    @Transactional
    public void resendVerification(String email) {
        // Silent: khong tiet lo email co ton tai hay khong (avoid enumeration)
        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.getStatus() == UserStatus.unverified) {
                verificationService.sendVerification(user);
            }
        });
    }

    // ==================== VERIFY EMAIL ====================
    @Transactional
    public void verifyEmail(String rawToken) {
        verificationService.verify(rawToken);
    }

    // ==================== LOGIN ====================
    @Transactional
    public LoginResponse login(LoginRequest req, HttpServletRequest servletReq) {
        Authentication auth;
        try {
            auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.usernameOrEmail(), req.password())
            );
        } catch (DisabledException e) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED",
                    "Tài khoản chưa xác thực email");
        } catch (LockedException e) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ACCOUNT_BANNED",
                    "Tài khoản đã bị khóa");
        } catch (BadCredentialsException e) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                    "Sai tên đăng nhập hoặc mật khẩu");
        }

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        User user = userRepository.findWithRolesByUsername(principal.getUsername())
                .orElseThrow();

        String access = jwtService.generateAccessToken(
                principal.getId(), principal.getUsername(), principal.getAuthorityStrings());
        String refresh = refreshTokenService.issue(user, servletReq);

        return new LoginResponse(
                access,
                refresh,
                "Bearer",
                jwtProperties.accessTokenTtlMinutes() * 60,
                toUserInfo(user)
        );
    }

    // ==================== REFRESH ====================
    @Transactional
    public LoginResponse refresh(String rawRefreshToken, HttpServletRequest servletReq) {
        RefreshToken tokenEntity = refreshTokenService.verify(rawRefreshToken);
        User user = userRepository.findWithRolesByUsername(tokenEntity.getUser().getUsername())
                .orElseThrow();
        UserPrincipal principal = new UserPrincipal(user);

        String access = jwtService.generateAccessToken(
                principal.getId(), principal.getUsername(), principal.getAuthorityStrings());
        // Khong rotate refresh token (giu don gian) — same token van dung duoc.

        return new LoginResponse(
                access,
                rawRefreshToken,
                "Bearer",
                jwtProperties.accessTokenTtlMinutes() * 60,
                toUserInfo(user)
        );
    }

    // ==================== LOGOUT ====================
    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    // ==================== ME ====================
    @Transactional(readOnly = true)
    public MeResponse me(String username) {
        User user = userRepository.findWithRolesByUsername(username)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "Người dùng không tồn tại"));
        List<String> roles = user.getRoles().stream().map(Role::getName).toList();
        List<String> perms = user.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(p -> p.getCode())
                .distinct()
                .toList();
        return new MeResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.isEmailVerified(),
                user.getFullName(),
                user.getPhone(),
                user.getAvatar(),
                user.getGender(),
                user.getBirthday(),
                user.getStatus(),
                roles,
                perms,
                user.getCreatedAt()
        );
    }

    // ==================== helpers ====================
    private LoginResponse.UserInfo toUserInfo(User user) {
        // Collect distinct permission code tu tat ca role cua user (roles LAZY, EM van open)
        var permissionCodes = user.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(p -> p.getCode())
                .distinct()
                .toList();
        return new LoginResponse.UserInfo(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatar(),
                user.getRoles().stream().map(Role::getName).toList(),
                permissionCodes
        );
    }
}
