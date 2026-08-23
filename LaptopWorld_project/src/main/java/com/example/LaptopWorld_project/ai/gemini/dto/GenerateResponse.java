package com.example.LaptopWorld_project.ai.gemini.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GenerateResponse(
        List<Candidate> candidates,
        UsageMetadata usageMetadata
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Candidate(Content content, String finishReason) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Content(String role, List<Part> parts) {}

    /** Part có thể chứa text HOẶC functionCall. thoughtSignature cần preserve khi echo lại. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Part(String text, FunctionCall functionCall, String thoughtSignature) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FunctionCall(String name, Map<String, Object> args) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record UsageMetadata(
            Integer promptTokenCount,
            Integer candidatesTokenCount,
            Integer totalTokenCount) {}

    // ---------- Helpers ----------
    public String getText() {
        List<Part> parts = firstParts();
        if (parts == null) return "";
        StringBuilder sb = new StringBuilder();
        for (Part p : parts) if (p.text() != null) sb.append(p.text());
        return sb.toString();
    }

    /** Trả về functionCall đầu tiên nếu có, null nếu response chỉ có text. */
    public FunctionCall firstFunctionCall() {
        List<Part> parts = firstParts();
        if (parts == null) return null;
        for (Part p : parts) if (p.functionCall() != null) return p.functionCall();
        return null;
    }

    /** Part chứa functionCall (kèm thought_signature). Dùng khi cần echo lại. */
    public Part firstFunctionCallPart() {
        List<Part> parts = firstParts();
        if (parts == null) return null;
        for (Part p : parts) if (p.functionCall() != null) return p;
        return null;
    }

    public List<Part> firstParts() {
        if (candidates == null || candidates.isEmpty()) return null;
        Content c = candidates.get(0).content();
        return c == null ? null : c.parts();
    }

    public Optional<Integer> tokensIn()  { return Optional.ofNullable(usageMetadata).map(UsageMetadata::promptTokenCount); }
    public Optional<Integer> tokensOut() { return Optional.ofNullable(usageMetadata).map(UsageMetadata::candidatesTokenCount); }
}
