package com.example.LaptopWorld_project.ai.gemini.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

/**
 * Request cho POST /models/{model}:generateContent
 * Support: multi-turn contents + system instruction + tool declarations + thinking control.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record GenerateRequest(
        List<Content> contents,
        Content systemInstruction,
        GenerationConfig generationConfig,
        List<Tool> tools,
        ToolConfig toolConfig
) {
    // ---------- Content structure ----------
    /** role = "user" | "model" | null (cho systemInstruction) */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Content(String role, List<Part> parts) {}

    /**
     * Part có thể là text, functionCall (từ model) hoặc functionResponse (từ app gửi lại).
     * Chỉ 1 field non-null tại 1 thời điểm.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Part(
            String text,
            FunctionCall functionCall,
            FunctionResponse functionResponse,
            String thoughtSignature) {
        public static Part text(String t) { return new Part(t, null, null, null); }
        public static Part functionCall(String name, Map<String, Object> args, String signature) {
            return new Part(null, new FunctionCall(name, args), null, signature);
        }
        public static Part functionResponse(String name, Map<String, Object> resp) {
            return new Part(null, null, new FunctionResponse(name, resp), null);
        }
    }

    public record FunctionCall(String name, Map<String, Object> args) {}
    public record FunctionResponse(String name, Map<String, Object> response) {}

    // ---------- Config ----------
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record GenerationConfig(
            Double temperature,
            Integer maxOutputTokens,
            ThinkingConfig thinkingConfig) {}

    public record ThinkingConfig(Integer thinkingBudget) {}

    // ---------- Tools ----------
    /** Gemini format: tools = [ { functionDeclarations: [ { name, description, parameters }, ... ] } ] */
    public record Tool(List<FunctionDeclaration> functionDeclarations) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record FunctionDeclaration(
            String name,
            String description,
            Map<String, Object> parameters) {}

    public record ToolConfig(FunctionCallingConfig functionCallingConfig) {}

    /** mode = "AUTO" (default) | "ANY" | "NONE" */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record FunctionCallingConfig(String mode, List<String> allowedFunctionNames) {}

    // ---------- Helpers (backwards-compatible) ----------
    public static GenerateRequest simple(String systemPrompt, String userPrompt,
                                         double temperature, int maxTokens) {
        Content system = systemPrompt != null
                ? new Content(null, List.of(Part.text(systemPrompt)))
                : null;
        return new GenerateRequest(
                List.of(new Content("user", List.of(Part.text(userPrompt)))),
                system,
                new GenerationConfig(temperature, maxTokens, new ThinkingConfig(0)),
                null, null
        );
    }
}
