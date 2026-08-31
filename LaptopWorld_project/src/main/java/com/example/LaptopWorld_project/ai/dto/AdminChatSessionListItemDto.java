package com.example.LaptopWorld_project.ai.dto;

import java.time.OffsetDateTime;

/**
 * Item hiển thị trong list admin — /api/admin/ai/chat-sessions.
 * userId + username null nếu là session guest.
 */
public record AdminChatSessionListItemDto(
        Long id,
        String title,
        Long userId,
        String username,
        long messageCount,
        long likeCount,
        long dislikeCount,
        OffsetDateTime lastActivityAt,
        OffsetDateTime createdAt
) {}
