package com.example.LaptopWorld_project.ai.controller;

import com.example.LaptopWorld_project.ai.dto.*;
import com.example.LaptopWorld_project.ai.ratelimit.ChatRateLimiter;
import com.example.LaptopWorld_project.ai.service.AgentChatService;
import com.example.LaptopWorld_project.ai.service.ChatService;
import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "AI Chat", description = "Trợ lý AI tư vấn sản phẩm — RAG + Gemini")
@RestController
@RequestMapping("/api/ai/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final AgentChatService agentChatService;
    private final ChatRateLimiter rateLimiter;

    private void enforceRateLimit(Long sessionId) {
        ChatRateLimiter.Result r = rateLimiter.tryConsume(sessionId);
        if (!r.allowed()) {
            throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT",
                    "Bạn gửi quá nhanh. Vui lòng đợi " + r.retryAfterSeconds() + " giây rồi thử lại.");
        }
    }

    @Operation(summary = "Tạo cuộc trò chuyện mới. Guest OK (không cần login).")
    @PostMapping("/sessions")
    public ApiResponse<ChatSessionDto> createSession(
            @AuthenticationPrincipal UserPrincipal me,
            @Valid @RequestBody(required = false) CreateSessionRequest req) {
        String title = req == null ? null : req.title();
        return ApiResponse.ok("Đã tạo cuộc trò chuyện",
                chatService.createSession(me != null ? me.getId() : null, title));
    }

    @Operation(summary = "Gửi message trong session và nhận reply từ AI (RAG)")
    @PostMapping("/sessions/{sessionId}/messages")
    public ApiResponse<ChatResponseDto> sendMessage(
            @AuthenticationPrincipal UserPrincipal me,
            @PathVariable Long sessionId,
            @Valid @RequestBody SendMessageRequest req) {
        enforceRateLimit(sessionId);
        return ApiResponse.ok(chatService.sendMessage(
                sessionId, me != null ? me.getId() : null, req.message()));
    }

    @Operation(summary = "Xem toàn bộ lịch sử session")
    @GetMapping("/sessions/{sessionId}")
    public ApiResponse<ChatSessionDto> getSession(
            @AuthenticationPrincipal UserPrincipal me,
            @PathVariable Long sessionId) {
        return ApiResponse.ok(chatService.getSession(
                sessionId, me != null ? me.getId() : null));
    }

    @Operation(summary = "Gửi message ở chế độ AGENT — Gemini tự gọi tools (search/compare/recommend/detail)")
    @PostMapping("/sessions/{sessionId}/agent-messages")
    public ApiResponse<ChatResponseDto> sendAgentMessage(
            @AuthenticationPrincipal UserPrincipal me,
            @PathVariable Long sessionId,
            @Valid @RequestBody SendMessageRequest req) {
        enforceRateLimit(sessionId);
        return ApiResponse.ok(agentChatService.sendMessage(
                sessionId, me != null ? me.getId() : null, req.message()));
    }
}
