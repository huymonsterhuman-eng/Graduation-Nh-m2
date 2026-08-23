package com.example.LaptopWorld_project.ai.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record ChatSessionDto(
        Long id,
        String title,
        boolean isArchived,
        OffsetDateTime lastActivityAt,
        OffsetDateTime createdAt,
        List<ChatMessageDto> messages
) {}
