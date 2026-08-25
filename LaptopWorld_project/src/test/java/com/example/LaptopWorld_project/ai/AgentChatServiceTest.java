package com.example.LaptopWorld_project.ai;

import com.example.LaptopWorld_project.ai.dto.ChatResponseDto;
import com.example.LaptopWorld_project.ai.entity.ChatMessage;
import com.example.LaptopWorld_project.ai.entity.ChatSession;
import com.example.LaptopWorld_project.ai.gemini.GeminiClient;
import com.example.LaptopWorld_project.ai.gemini.dto.GenerateRequest;
import com.example.LaptopWorld_project.ai.gemini.dto.GenerateResponse;
import com.example.LaptopWorld_project.ai.repository.ChatMessageRepository;
import com.example.LaptopWorld_project.ai.repository.ChatSessionRepository;
import com.example.LaptopWorld_project.ai.service.AgentChatService;
import com.example.LaptopWorld_project.ai.tool.ToolExecutor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgentChatServiceTest {

    @Mock ChatSessionRepository sessionRepo;
    @Mock ChatMessageRepository messageRepo;
    @Mock GeminiClient geminiClient;
    @Mock ToolExecutor toolExecutor;

    @InjectMocks AgentChatService agentChatService;

    private static final Long SESSION_ID = 42L;

    private ChatSession buildGuestSession() {
        ChatSession s = new ChatSession();
        ReflectionTestUtils.setField(s, "id", SESSION_ID);
        s.setTitle("Cuộc trò chuyện mới");
        return s;
    }

    /** Build response chỉ chứa text — model không gọi tool nào. */
    private GenerateResponse buildTextResponse(String text) {
        GenerateResponse.Part textPart = new GenerateResponse.Part(text, null, null);
        GenerateResponse.Content content = new GenerateResponse.Content("model", List.of(textPart));
        GenerateResponse.Candidate candidate = new GenerateResponse.Candidate(content, "STOP");
        return new GenerateResponse(List.of(candidate),
                new GenerateResponse.UsageMetadata(10, 20, 30));
    }

    /** Build response chứa 1 functionCall. */
    private GenerateResponse buildFunctionCallResponse(String toolName, Map<String, Object> args) {
        GenerateResponse.FunctionCall fc = new GenerateResponse.FunctionCall(toolName, args);
        GenerateResponse.Part fcPart = new GenerateResponse.Part(null, fc, "sig-abc");
        GenerateResponse.Content content = new GenerateResponse.Content("model", List.of(fcPart));
        GenerateResponse.Candidate candidate = new GenerateResponse.Candidate(content, "STOP");
        return new GenerateResponse(List.of(candidate),
                new GenerateResponse.UsageMetadata(15, 5, 20));
    }

    @Test
    @DisplayName("No tool call — model tra text ngay, khong goi tool nao")
    void sendMessage_noToolCall_returnsTextImmediately() {
        ChatSession session = buildGuestSession();
        when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(messageRepo.findTop20BySessionIdOrderByCreatedAtDesc(SESSION_ID)).thenReturn(new java.util.ArrayList<>());
        when(geminiClient.generateWithRequest(any(GenerateRequest.class)))
                .thenReturn(buildTextResponse("Xin chào! Bạn cần tư vấn gì?"));

        ChatResponseDto resp = agentChatService.sendMessage(SESSION_ID, null, "Hi");

        assertThat(resp.assistant().content()).isEqualTo("Xin chào! Bạn cần tư vấn gì?");
        // Chi goi Gemini 1 lan
        verify(geminiClient, times(1)).generateWithRequest(any());
        // Khong execute tool nao
        verify(toolExecutor, never()).execute(any(), any(), any());
    }

    @Test
    @DisplayName("1 tool call roi tra text — loop 2 iteration")
    void sendMessage_oneToolCall_loopsTwice() {
        ChatSession session = buildGuestSession();
        when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(messageRepo.findTop20BySessionIdOrderByCreatedAtDesc(SESSION_ID)).thenReturn(new java.util.ArrayList<>());

        // Iter 1: goi tool search_products; Iter 2: tra text
        when(geminiClient.generateWithRequest(any(GenerateRequest.class)))
                .thenReturn(buildFunctionCallResponse("search_products", Map.of("query", "laptop gaming")))
                .thenReturn(buildTextResponse("Tìm được 3 SP: ..."));

        when(toolExecutor.execute(eq("search_products"), any(), any()))
                .thenReturn(Map.of("results", List.of()));

        ChatResponseDto resp = agentChatService.sendMessage(SESSION_ID, null, "Tim laptop gaming");

        assertThat(resp.assistant().content()).isEqualTo("Tìm được 3 SP: ...");
        verify(geminiClient, times(2)).generateWithRequest(any());
        verify(toolExecutor, times(1)).execute(eq("search_products"), any(), any());
    }

    @Test
    @DisplayName("MAX_ITERATIONS 5 — het loop tra message fallback")
    void sendMessage_maxIterations_returnsFallback() {
        ChatSession session = buildGuestSession();
        when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(messageRepo.findTop20BySessionIdOrderByCreatedAtDesc(SESSION_ID)).thenReturn(new java.util.ArrayList<>());

        // Model lien tuc goi tool → khong bao gio tra text
        when(geminiClient.generateWithRequest(any(GenerateRequest.class)))
                .thenReturn(buildFunctionCallResponse("search_products", Map.of("query", "x")));
        when(toolExecutor.execute(any(), any(), any())).thenReturn(Map.of("results", List.of()));

        ChatResponseDto resp = agentChatService.sendMessage(SESSION_ID, null, "Test");

        assertThat(resp.assistant().content()).contains("mất quá nhiều bước");
        // Goi du 5 lan Gemini + 5 lan tool
        verify(geminiClient, times(5)).generateWithRequest(any());
        verify(toolExecutor, times(5)).execute(any(), any(), any());
    }
}
