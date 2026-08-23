package com.example.LaptopWorld_project.ai.service;

import com.example.LaptopWorld_project.ai.gemini.GeminiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Wrapper mỏng cho EmbeddingService — hiện tại chỉ delegate GeminiClient,
 * nhưng đặt riêng để dễ swap sang model khác sau (Ollama, OpenAI...).
 */
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final GeminiClient gemini;

    /** Embed câu hỏi user (dùng khi search). */
    public float[] embedQuery(String text) {
        return gemini.embed(text, GeminiClient.TASK_QUERY);
    }

    /** Embed nội dung sản phẩm (dùng khi index). */
    public float[] embedDocument(String text) {
        return gemini.embed(text, GeminiClient.TASK_DOCUMENT);
    }
}
