package com.example.LaptopWorld_project.ai.gemini.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Request body cho POST /models/{model}:embedContent
 * taskType: RETRIEVAL_DOCUMENT (index) | RETRIEVAL_QUERY (search) | SEMANTIC_SIMILARITY | ...
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EmbedRequest(
        Content content,
        String taskType,
        Integer outputDimensionality
) {
    public record Content(List<Part> parts) {}
    public record Part(String text) {}

    public static EmbedRequest of(String text, String taskType, Integer dim) {
        return new EmbedRequest(
                new Content(List.of(new Part(text))),
                taskType,
                dim   // null → JsonInclude bỏ, Gemini dùng default
        );
    }
}
