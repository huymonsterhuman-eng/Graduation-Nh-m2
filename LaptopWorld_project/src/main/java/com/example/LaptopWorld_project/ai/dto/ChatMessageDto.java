package com.example.LaptopWorld_project.ai.dto;

import com.example.LaptopWorld_project.ai.entity.ChatRole;

import java.time.OffsetDateTime;

public record ChatMessageDto(
        Long id,
        ChatRole role,
        String content,
        Integer tokensInput,
        Integer tokensOutput,
        Integer responseTimeMs,
        OffsetDateTime createdAt
) {}
