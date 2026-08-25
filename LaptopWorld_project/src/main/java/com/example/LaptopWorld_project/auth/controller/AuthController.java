package com.example.LaptopWorld_project.auth.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.auth.dto.*;
import com.example.LaptopWorld_project.auth.ratelimit.AuthRateLimiter;
import com.example.LaptopWorld_project.auth.service.AuthService;
import com.example.LaptopWorld_project.auth.service.PasswordResetService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Auth", description = "Đăng ký / đăng nhập / refresh / xác thực / đặt lại mật khẩu")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final AuthRateLimiter rateLimiter;

    @Operation(summary = "Đăng ký tài khoản mới (gửi email xác thực)")
    @PostMapping("/register")
    public ApiResponse<Void> register(@Valid @RequestBody RegisterRequest req,
                                      HttpServletRequest servletReq) {
        rateLimiter.checkRegister(servletReq);
        authService.register(req);
        return ApiResponse.message("Đã gửi email xác thực, vui lòng kiểm tra hộp thư.");
    }

    @Operation(summary = "Gửi lại email xác thực")
    @PostMapping("/resend-verification")
    public ApiResponse<Void> resend(@Valid @RequestBody ResendVerificationRequest req) {
        authService.resendVerification(req.email());
        return ApiResponse.message("Nếu email hợp lệ, một email xác thực mới đã được gửi đi.");
    }

    @Operation(summary = "Xác thực email bằng mã token")
    @PostMapping("/verify-email")
    public ApiResponse<Void> verifyEmail(@RequestBody Map<@NotBlank String, @NotBlank String> body) {
        String token = body.get("token");
        if (token == null || token.isBlank()) {
            return ApiResponse.error("Thiếu mã xác thực");
        }
        authService.verifyEmail(token);
        return ApiResponse.message("Xác thực email thành công, bạn có thể đăng nhập.");
    }

    @Operation(summary = "Đăng nhập, trả về access + refresh token")
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest req,
                                            HttpServletRequest servletReq) {
        rateLimiter.checkLogin(servletReq);
        return ApiResponse.ok(authService.login(req, servletReq));
    }

    @Operation(summary = "Đổi refresh token để lấy access token mới")
    @PostMapping("/refresh")
    public ApiResponse<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest req,
                                              HttpServletRequest servletReq) {
        return ApiResponse.ok(authService.refresh(req.refreshToken(), servletReq));
    }

    @Operation(summary = "Đăng xuất — thu hồi refresh token")
    @PostMapping("/logout")
    public ApiResponse<Void> logout(@Valid @RequestBody RefreshTokenRequest req) {
        authService.logout(req.refreshToken());
        return ApiResponse.message("Đăng xuất thành công");
    }

    @Operation(summary = "Thông tin tài khoản hiện tại (cần Bearer token)")
    @GetMapping("/me")
    public ApiResponse<MeResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(authService.me(principal.getUsername()));
    }

    @Operation(summary = "Yêu cầu đặt lại mật khẩu — gửi email reset")
    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req,
                                            HttpServletRequest servletReq) {
        rateLimiter.checkForgotPassword(servletReq);
        passwordResetService.requestReset(req.email());
        return ApiResponse.message("Nếu email tồn tại trong hệ thống, một email đặt lại mật khẩu đã được gửi đi.");
    }

    @Operation(summary = "Đặt lại mật khẩu bằng mã token")
    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        passwordResetService.resetPassword(req.token(), req.newPassword());
        return ApiResponse.message("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.");
    }
}
