package com.example.LaptopWorld_project.ai.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record AdminChatSessionDetailDto(
        Long id,
        String title,
        Long userId,
        String username,
        String userEmail,
        boolean isArchived,
        OffsetDateTime lastActivityAt,
        OffsetDateTime createdAt,
        List<AdminChatMessageDto> messages
) {}
