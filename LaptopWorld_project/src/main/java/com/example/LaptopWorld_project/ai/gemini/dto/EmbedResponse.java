package com.example.LaptopWorld_project.ai.gemini.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EmbedResponse(Embedding embedding) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Embedding(List<Float> values) {}
}
