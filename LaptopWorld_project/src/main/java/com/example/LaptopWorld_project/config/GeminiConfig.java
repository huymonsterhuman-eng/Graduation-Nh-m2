package com.example.LaptopWorld_project.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/**
 * RestClient được cấu hình sẵn base URL Gemini + timeout.
 * API key được truyền qua query param `?key=...` ở GeminiClient (không phải header).
 */
@Slf4j
@Configuration
public class GeminiConfig {

    @Bean
    public RestClient geminiRestClient(GeminiProperties props) {
        if (props.apiKey() == null || props.apiKey().isBlank()) {
            log.warn("Gemini API key CHUA duoc set. AI endpoints se fail. " +
                     "Them app.ai.gemini.api-key vao application-local.properties.");
        }
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        // Read timeout = props.timeoutSeconds (default 30s trong application-dev.properties)
        factory.setReadTimeout(Duration.ofSeconds(props.timeoutSeconds()));
        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(props.baseUrl())
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
