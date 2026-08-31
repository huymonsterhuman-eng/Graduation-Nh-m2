package com.example.LaptopWorld_project.ai.dto;

import com.example.LaptopWorld_project.ai.entity.ChatRole;

import java.time.OffsetDateTime;

/**
 * Message hiển thị cho admin — có thêm tokens + responseTimeMs so với {@link ChatMessageDto}
 * để giám sát hiệu năng chatbot.
 */
public record AdminChatMessageDto(
        Long id,
        ChatRole role,
        String content,
        String toolName,
        Integer tokensInput,
        Integer tokensOutput,
        Integer responseTimeMs,
        Short feedback,
        OffsetDateTime createdAt
) {}
