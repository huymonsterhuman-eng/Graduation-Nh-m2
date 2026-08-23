package com.example.LaptopWorld_project.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai.gemini")
public record GeminiProperties(
        String apiKey,
        String baseUrl,
        String model,
        String embeddingModel,
        int embeddingDim,
        int timeoutSeconds
) {}
