package com.example.LaptopWorld_project.ai.service;

import com.example.LaptopWorld_project.ai.dto.*;
import com.example.LaptopWorld_project.ai.entity.ChatMessage;
import com.example.LaptopWorld_project.ai.entity.ChatRole;
import com.example.LaptopWorld_project.ai.entity.ChatSession;
import com.example.LaptopWorld_project.ai.gemini.GeminiClient;
import com.example.LaptopWorld_project.ai.gemini.dto.GenerateResponse;
import com.example.LaptopWorld_project.ai.prompt.SystemPrompts;
import com.example.LaptopWorld_project.ai.repository.ChatMessageRepository;
import com.example.LaptopWorld_project.ai.repository.ChatSessionRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int TOP_K_PRODUCTS = 5;
    private static final int HISTORY_LIMIT  = 8;
    private static final double TEMPERATURE = 0.4;   // thấp = trả lời ổn định
    private static final int MAX_OUTPUT_TOKENS = 800;

    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final UserRepository userRepository;
    private final SemanticSearchService semanticSearch;
    private final GeminiClient geminiClient;

    // ==================== CREATE SESSION ====================
    @Transactional
    public ChatSessionDto createSession(Long userId, String title) {
        ChatSession session = new ChatSession();
        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", userId));
            session.setUser(user);
        }
        session.setTitle(title != null && !title.isBlank() ? title : "Cuộc trò chuyện mới");
        session.setLastActivityAt(OffsetDateTime.now());
        session = sessionRepo.save(session);
        log.info("Chat session created: id={} userId={}", session.getId(), userId);
        return toSessionDto(session, List.of());
    }

    // ==================== GET SESSION ====================
    @Transactional(readOnly = true)
    public ChatSessionDto getSession(Long sessionId, Long currentUserId) {
        ChatSession session = getOwnedSession(sessionId, currentUserId);
        List<ChatMessage> messages = messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
        return toSessionDto(session, messages);
    }

    // ==================== SEND MESSAGE (main RAG flow) ====================
    @Transactional
    public ChatResponseDto sendMessage(Long sessionId, Long currentUserId, String userText) {
        ChatSession session = getOwnedSession(sessionId, currentUserId);
        long start = System.currentTimeMillis();

        // 1. Lưu message user
        ChatMessage userMsg = new ChatMessage();
        userMsg.setSession(session);
        userMsg.setRole(ChatRole.user);
        userMsg.setContent(userText);
        messageRepo.save(userMsg);

        // 2. Retrieve top-K sản phẩm liên quan (RAG)
        List<SemanticSearchService.SemanticResult> retrieved =
                semanticSearch.search(userText, TOP_K_PRODUCTS);

        // 3. Load lịch sử gần đây (top-N desc → reverse thành asc để đưa vào prompt)
        List<ChatMessage> historyDesc = messageRepo
                .findTop20BySessionIdOrderByCreatedAtDesc(sessionId);
        historyDesc.removeIf(m -> m.getId().equals(userMsg.getId()));  // bỏ message vừa lưu
        List<ChatMessage> history = historyDesc.stream()
                .limit(HISTORY_LIMIT)
                .toList();
        List<ChatMessage> historyAsc = new java.util.ArrayList<>(history);
        Collections.reverse(historyAsc);

        // 4. Build prompt
        String productContext = SystemPrompts.formatProductContext(retrieved);
        String historyContext = SystemPrompts.formatHistory(historyAsc);
        String userPrompt = SystemPrompts.buildUserPrompt(userText, productContext, historyContext);

        log.debug("RAG prompt: retrieved={} products, history={} messages",
                  retrieved.size(), historyAsc.size());

        // 5. Gọi Gemini
        GenerateResponse resp;
        try {
            resp = geminiClient.generate(
                    SystemPrompts.RAG_SYSTEM_PROMPT,
                    userPrompt,
                    TEMPERATURE,
                    MAX_OUTPUT_TOKENS
            );
        } catch (BusinessException e) {
            log.error("Gemini failed: {}", e.getMessage());
            throw e;
        }

        String reply = resp.getText();
        if (reply.isBlank()) {
            reply = "Xin lỗi, tôi chưa thể trả lời câu hỏi này. Bạn thử hỏi lại được không?";
        }

        // 6. Lưu message assistant
        int elapsedMs = (int) (System.currentTimeMillis() - start);
        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setSession(session);
        assistantMsg.setRole(ChatRole.assistant);
        assistantMsg.setContent(reply);
        assistantMsg.setTokensInput(resp.tokensIn().orElse(null));
        assistantMsg.setTokensOutput(resp.tokensOut().orElse(null));
        assistantMsg.setResponseTimeMs(elapsedMs);
        messageRepo.save(assistantMsg);

        // 7. Update session activity
        session.setLastActivityAt(OffsetDateTime.now());
        // Nếu title đang default và đây là message đầu → dùng câu hỏi làm title
        if ("Cuộc trò chuyện mới".equals(session.getTitle()) && historyAsc.isEmpty()) {
            String t = userText.length() > 60 ? userText.substring(0, 60) + "..." : userText;
            session.setTitle(t);
        }
        sessionRepo.save(session);

        // 8. Build response DTO
        List<ChatResponseDto.CitedProduct> cited = retrieved.stream()
                .map(r -> ChatResponseDto.CitedProduct.from(r.product(), r.similarity()))
                .toList();
        return new ChatResponseDto(sessionId, toMessageDto(assistantMsg), cited);
    }

    // ==================== helpers ====================
    /**
     * Trả về session nếu current user được phép truy cập.
     * - Session có user: chỉ owner mới được.
     * - Session guest (user=null): bất kỳ ai có id đều truy cập được.
     *   (Trong đồ án chấp nhận được. Prod nên dùng UUID để chống enumeration.)
     */
    private ChatSession getOwnedSession(Long sessionId, Long currentUserId) {
        ChatSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc trò chuyện"));
        // Session có chủ + user hiện tại đã login + không khớp → mismatch (frontend clear session)
        if (session.getUser() != null && currentUserId != null
                && !session.getUser().getId().equals(currentUserId)) {
            throw new BusinessException("SESSION_MISMATCH",
                    "Cuộc trò chuyện thuộc về tài khoản khác. Vui lòng tạo cuộc trò chuyện mới.");
        }
        return session;
    }

    private ChatSessionDto toSessionDto(ChatSession s, List<ChatMessage> messages) {
        return new ChatSessionDto(
                s.getId(), s.getTitle(), s.isArchived(),
                s.getLastActivityAt(), s.getCreatedAt(),
                messages.stream().map(this::toMessageDto).toList()
        );
    }

    private ChatMessageDto toMessageDto(ChatMessage m) {
        return new ChatMessageDto(m.getId(), m.getRole(), m.getContent(),
                m.getTokensInput(), m.getTokensOutput(), m.getResponseTimeMs(),
                m.getCreatedAt());
    }
}
