package com.example.LaptopWorld_project.ai.dto;

import jakarta.validation.constraints.Size;

public record CreateSessionRequest(
        @Size(max = 255)
        String title
) {}
