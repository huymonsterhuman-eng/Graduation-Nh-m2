package com.example.LaptopWorld_project.ai.controller;

import com.example.LaptopWorld_project.ai.dto.AdminChatSessionDetailDto;
import com.example.LaptopWorld_project.ai.dto.AdminChatSessionListItemDto;
import com.example.LaptopWorld_project.ai.service.AdminChatSessionService;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;

/**
 * Admin xem session chat của trợ lý AI — Sprint 9G Bước D.
 *
 * Dùng permission {@code manage_ai_embedding} chung với AI ops (nhóm 🤖 trên sidebar),
 * theo seed V20 chỉ có 1 permission gộp cả embed + xem chat.
 */
@Tag(name = "AI Chat Sessions (Admin)", description = "Xem lịch sử session chat của trợ lý AI")
@RestController
@RequestMapping("/api/admin/ai/chat-sessions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_ai_embedding')")
public class AdminChatSessionController {

    private final AdminChatSessionService adminChatSessionService;

    @Operation(summary = "List chat session paginated + filter date range + hasDislike")
    @GetMapping
    public ApiResponse<PagedResponse<AdminChatSessionListItemDto>> list(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime dateFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime dateTo,
            @RequestParam(required = false) Boolean hasDislike,
            @PageableDefault(size = 20, sort = "lastActivityAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        Page<AdminChatSessionListItemDto> page =
                adminChatSessionService.list(dateFrom, dateTo, hasDislike, pageable);
        return ApiResponse.ok(PagedResponse.from(page));
    }

    @Operation(summary = "Chi tiết 1 session + toàn bộ messages theo thứ tự thời gian")
    @GetMapping("/{id}")
    public ApiResponse<AdminChatSessionDetailDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(adminChatSessionService.detail(id));
    }
}
