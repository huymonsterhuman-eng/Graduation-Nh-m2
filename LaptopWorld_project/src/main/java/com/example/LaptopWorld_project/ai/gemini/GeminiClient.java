package com.example.LaptopWorld_project.ai.gemini;

import com.example.LaptopWorld_project.ai.gemini.dto.*;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.config.GeminiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;

/**
 * Wrapper HTTP calls tới Gemini API. Chỉ 2 method chính:
 *   - embed(text, taskType) → float[]
 *   - generate(systemPrompt, userPrompt) → text + token counts
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiClient {

    public static final String TASK_QUERY    = "RETRIEVAL_QUERY";
    public static final String TASK_DOCUMENT = "RETRIEVAL_DOCUMENT";

    private final RestClient geminiRestClient;
    private final GeminiProperties props;

    // ==================== EMBED ====================
    public float[] embed(String text, String taskType) {
        assertApiKey();
        long start = System.currentTimeMillis();
        try {
            // text-embedding-004 KHÔNG hỗ trợ outputDimensionality (fixed 768).
            // Chỉ gửi nếu model là gemini-embedding-001 hoặc mới hơn.
            Integer dim = props.embeddingModel().startsWith("gemini-embedding")
                    ? props.embeddingDim() : null;
            EmbedResponse resp = geminiRestClient.post()
                    .uri("/models/{model}:embedContent?key={key}",
                         props.embeddingModel(), props.apiKey())
                    .body(EmbedRequest.of(text, taskType, dim))
                    .retrieve()
                    .body(EmbedResponse.class);
            if (resp == null || resp.embedding() == null || resp.embedding().values() == null) {
                throw new BusinessException("GEMINI_EMPTY_RESPONSE", "Gemini trả về response rỗng");
            }
            List<Float> values = resp.embedding().values();
            float[] arr = new float[values.size()];
            for (int i = 0; i < values.size(); i++) arr[i] = values.get(i);
            log.debug("Gemini embed [{}ms] len={} taskType={}",
                      System.currentTimeMillis() - start, arr.length, taskType);
            return arr;
        } catch (RestClientException e) {
            log.error("Gemini embed failed: {}", e.getMessage());
            throw new BusinessException(org.springframework.http.HttpStatus.BAD_GATEWAY,
                    "GEMINI_API_ERROR", cleanGeminiError(e.getMessage()));
        }
    }

    // ==================== GENERATE ====================
    public GenerateResponse generate(String systemPrompt, String userPrompt,
                                     double temperature, int maxTokens) {
        return call(GenerateRequest.simple(systemPrompt, userPrompt, temperature, maxTokens));
    }

    /** Generate với full request — dùng khi cần multi-turn contents + tools (agent mode). */
    public GenerateResponse generateWithRequest(GenerateRequest request) {
        return call(request);
    }

    private static final int MAX_RETRIES = 2;
    private static final long[] RETRY_DELAYS_MS = { 1500, 4000 };

    /**
     * Gọi Gemini với retry khi gặp 503 (UNAVAILABLE — quá tải tạm thời).
     * 4xx khác (validation) fail luôn không retry.
     */
    private GenerateResponse call(GenerateRequest request) {
        assertApiKey();
        for (int attempt = 0; ; attempt++) {
            long start = System.currentTimeMillis();
            try {
                GenerateResponse resp = geminiRestClient.post()
                        .uri("/models/{model}:generateContent?key={key}",
                             props.model(), props.apiKey())
                        .body(request)
                        .retrieve()
                        .body(GenerateResponse.class);
                if (resp == null) {
                    throw new BusinessException("GEMINI_EMPTY_RESPONSE", "Gemini trả về response rỗng");
                }
                log.info("Gemini generate [{}ms attempt={}] tokensIn={} tokensOut={}",
                         System.currentTimeMillis() - start, attempt + 1,
                         resp.tokensIn().orElse(0), resp.tokensOut().orElse(0));
                return resp;
            } catch (RestClientResponseException e) {
                int status = e.getStatusCode().value();
                String body = e.getResponseBodyAsString();
                boolean retryable = (status == 503 || status == 502 || status == 429)
                        && attempt < MAX_RETRIES;
                if (retryable) {
                    long delay = RETRY_DELAYS_MS[attempt];
                    log.warn("Gemini {} — retry {}/{} sau {}ms", status, attempt + 1, MAX_RETRIES, delay);
                    try { Thread.sleep(delay); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    continue;
                }
                log.error("Gemini generate failed: HTTP {} — body: {}", status, body);
                throw new BusinessException(org.springframework.http.HttpStatus.BAD_GATEWAY,
                        "GEMINI_API_ERROR", cleanGeminiError(e.getMessage() + " | " + body));
            } catch (RestClientException e) {
                log.error("Gemini generate failed: {}", e.getMessage(), e);
                throw new BusinessException(org.springframework.http.HttpStatus.BAD_GATEWAY,
                        "GEMINI_API_ERROR", cleanGeminiError(e.getMessage()));
            }
        }
    }

    private void assertApiKey() {
        if (props.apiKey() == null || props.apiKey().isBlank()) {
            throw new BusinessException("GEMINI_NO_API_KEY",
                    "Gemini API key chưa được cấu hình. Thêm app.ai.gemini.api-key vào application-local.properties.");
        }
    }

    /**
     * Rút gọn Gemini error message: bỏ JSON wrapper để user thấy sạch.
     */
    private static String cleanGeminiError(String raw) {
        if (raw == null) return "Lỗi không xác định từ Gemini API";
        if (raw.contains("503") || raw.contains("UNAVAILABLE") || raw.contains("high demand")) {
            return "Máy chủ AI đang quá tải, vui lòng thử lại sau ít phút.";
        }
        if (raw.contains("429") || raw.contains("RESOURCE_EXHAUSTED")) {
            return "Đã đạt giới hạn quota API. Vui lòng thử lại sau.";
        }
        if (raw.contains("401") || raw.contains("403") || raw.contains("PERMISSION_DENIED")) {
            return "API key Gemini không hợp lệ.";
        }
        int idx = raw.indexOf("\"message\"");
        if (idx > 0) {
            int start = raw.indexOf('"', idx + 10) + 1;
            int end = raw.indexOf('"', start);
            if (end > start) return raw.substring(start, end).replace("\\n", " ");
        }
        return "Gọi Gemini API thất bại. Vui lòng thử lại.";
    }
}
