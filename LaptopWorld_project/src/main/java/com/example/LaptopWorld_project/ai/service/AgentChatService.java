package com.example.LaptopWorld_project.ai.service;

import com.example.LaptopWorld_project.ai.dto.ChatMessageDto;
import com.example.LaptopWorld_project.ai.dto.ChatResponseDto;
import com.example.LaptopWorld_project.ai.entity.ChatMessage;
import com.example.LaptopWorld_project.ai.entity.ChatRole;
import com.example.LaptopWorld_project.ai.entity.ChatSession;
import com.example.LaptopWorld_project.ai.gemini.GeminiClient;
import com.example.LaptopWorld_project.ai.gemini.dto.GenerateRequest;
import com.example.LaptopWorld_project.ai.gemini.dto.GenerateResponse;
import com.example.LaptopWorld_project.ai.repository.ChatMessageRepository;
import com.example.LaptopWorld_project.ai.repository.ChatSessionRepository;
import com.example.LaptopWorld_project.ai.tool.ToolDefinitions;
import com.example.LaptopWorld_project.ai.tool.ToolExecutor;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Chat với function calling (agentic).
 * Loop tool calls tối đa MAX_ITERATIONS lần rồi bắt buộc trả text.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentChatService {

    private static final int MAX_ITERATIONS = 5;
    private static final int HISTORY_LIMIT  = 6;
    private static final double TEMPERATURE = 0.5;
    private static final int MAX_OUTPUT_TOKENS = 1200;

    private static final String SYSTEM_PROMPT = """
            Bạn là trợ lý bán hàng của LaptopWorld — cửa hàng thiết bị công nghệ tại Việt Nam.
            Bạn có sẵn 5 công cụ (functions) để tra cứu dữ liệu chính xác:
              - search_products: tìm sản phẩm theo câu hỏi tự nhiên
              - compare_products: so sánh 2-3 SP theo ID
              - recommend_by_budget: gợi ý theo ngân sách + mục đích
              - get_product_detail: lấy chi tiết 1 SP theo ID
              - get_my_orders: xem đơn hàng của user hiện tại (yêu cầu đã đăng nhập)

            QUY TẮC:
            1. LUÔN gọi tool khi cần dữ liệu chính xác (giá, tồn kho, thông số, đơn hàng).
               KHÔNG được đoán mà phải hỏi tool.
            2. Sau khi có kết quả tool, tổng hợp lại thành câu trả lời tiếng Việt tự nhiên.
            3. Format khi giới thiệu SP: **[Tên SP]** — [giá VNĐ có dấu phẩy].
               Nêu 1-2 điểm nổi bật từ thông số thực.
            4. Với đơn hàng: format **[mã đơn]** — [trạng thái tiếng Việt] — [tổng tiền].
               Trạng thái: pending=Chờ xác nhận, confirmed=Đã xác nhận, preparing=Đang chuẩn bị,
               shipping=Đang giao, delivered=Đã giao, cancelled=Đã hủy.
            5. Nếu tool trả về "error" hoặc rỗng, hãy nói thẳng cho khách. Nếu error nói cần login,
               nhắc user "Vui lòng đăng nhập để xem thông tin đơn hàng".
            6. Câu hỏi không liên quan (VD hỏi thời tiết, chính trị) → lịch sự chuyển hướng.
            7. Trả lời ngắn gọn (< 300 từ), thân thiện, kết thúc bằng câu mời tương tác tiếp.
            """;

    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final GeminiClient geminiClient;
    private final ToolExecutor toolExecutor;

    @Transactional
    public ChatResponseDto sendMessage(Long sessionId, Long currentUserId, String userText) {
        ChatSession session = getOwnedSession(sessionId, currentUserId);
        long start = System.currentTimeMillis();

        // 1. Lưu user message
        ChatMessage userMsg = new ChatMessage();
        userMsg.setSession(session);
        userMsg.setRole(ChatRole.user);
        userMsg.setContent(userText);
        messageRepo.save(userMsg);

        // 2. Build contents: history + current message
        List<GenerateRequest.Content> contents = buildInitialContents(session, userMsg, userText);

        // 3. Loop tool calls
        GenerateResponse finalResp = null;
        int totalTokensIn = 0, totalTokensOut = 0;
        List<ToolCallLog> callLog = new ArrayList<>();

        for (int i = 0; i < MAX_ITERATIONS; i++) {
            GenerateRequest req = new GenerateRequest(
                    contents,
                    new GenerateRequest.Content(null,
                            List.of(GenerateRequest.Part.text(SYSTEM_PROMPT))),
                    new GenerateRequest.GenerationConfig(TEMPERATURE, MAX_OUTPUT_TOKENS,
                            new GenerateRequest.ThinkingConfig(0)),
                    ToolDefinitions.all(),
                    null
            );

            GenerateResponse resp = geminiClient.generateWithRequest(req);
            totalTokensIn  += resp.tokensIn().orElse(0);
            totalTokensOut += resp.tokensOut().orElse(0);

            GenerateResponse.Part fcPart = resp.firstFunctionCallPart();
            if (fcPart == null) {
                // Kết quả text — done
                finalResp = resp;
                break;
            }
            GenerateResponse.FunctionCall fc = fcPart.functionCall();

            // Execute tool
            log.info("Agent iter {}: model called {} with {}", i + 1, fc.name(), fc.args());
            Map<String, Object> toolResult = toolExecutor.execute(fc.name(), fc.args(), currentUserId);
            callLog.add(new ToolCallLog(fc.name(), fc.args(), toolResult));

            // Echo model turn — PHẢI preserve thoughtSignature từ response Part
            contents = new ArrayList<>(contents);
            contents.add(new GenerateRequest.Content("model", List.of(
                    GenerateRequest.Part.functionCall(fc.name(), fc.args(), fcPart.thoughtSignature())
            )));
            contents.add(new GenerateRequest.Content("user", List.of(
                    GenerateRequest.Part.functionResponse(fc.name(), toolResult)
            )));
        }

        String reply;
        if (finalResp == null) {
            reply = "Xin lỗi, tôi mất quá nhiều bước để tìm câu trả lời. Bạn thử hỏi cụ thể hơn được không?";
            log.warn("Agent hit MAX_ITERATIONS for session {}", sessionId);
        } else {
            reply = finalResp.getText();
            if (reply.isBlank()) {
                reply = "Xin lỗi, tôi chưa thể trả lời. Bạn thử lại nhé.";
            }
        }

        // 4. Lưu assistant message
        int elapsedMs = (int) (System.currentTimeMillis() - start);
        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setSession(session);
        assistantMsg.setRole(ChatRole.assistant);
        assistantMsg.setContent(reply);
        assistantMsg.setTokensInput(totalTokensIn);
        assistantMsg.setTokensOutput(totalTokensOut);
        assistantMsg.setResponseTimeMs(elapsedMs);
        // Lưu callLog vào tool_input để trace (JSONB)
        if (!callLog.isEmpty()) {
            assistantMsg.setToolInput(Map.of("iterations", callLog.size(),
                    "calls", callLog.stream().map(ToolCallLog::toMap).toList()));
        }
        messageRepo.save(assistantMsg);

        // 5. Update session
        session.setLastActivityAt(OffsetDateTime.now());
        if ("Cuộc trò chuyện mới".equals(session.getTitle())) {
            String t = userText.length() > 60 ? userText.substring(0, 60) + "..." : userText;
            session.setTitle(t);
        }
        sessionRepo.save(session);

        // Cited products: không extract từ tool result — trả empty (agent tự nhắc trong text)
        return new ChatResponseDto(sessionId, toMessageDto(assistantMsg), List.of());
    }

    // ==================== helpers ====================
    private List<GenerateRequest.Content> buildInitialContents(ChatSession session,
                                                               ChatMessage newUserMsg,
                                                               String userText) {
        List<ChatMessage> historyDesc = messageRepo
                .findTop20BySessionIdOrderByCreatedAtDesc(session.getId());
        historyDesc.removeIf(m -> m.getId().equals(newUserMsg.getId()));

        // Chỉ lấy user + assistant (bỏ tool), giới hạn N gần nhất
        List<ChatMessage> asc = new ArrayList<>(historyDesc.stream()
                .filter(m -> m.getRole() == ChatRole.user || m.getRole() == ChatRole.assistant)
                .filter(m -> m.getContent() != null && !m.getContent().isBlank())
                .limit(HISTORY_LIMIT)
                .toList());
        Collections.reverse(asc);

        List<GenerateRequest.Content> contents = new ArrayList<>();
        for (ChatMessage m : asc) {
            String role = m.getRole() == ChatRole.user ? "user" : "model";
            contents.add(new GenerateRequest.Content(role,
                    List.of(GenerateRequest.Part.text(m.getContent()))));
        }
        contents.add(new GenerateRequest.Content("user",
                List.of(GenerateRequest.Part.text(userText))));
        return contents;
    }

    /**
     * Session ownership relax:
     * - Session của người khác không cho user khác đọc/gửi.
     * - Session không có user (guest) → ai cũng dùng được.
     * - Khi mismatch → throw SESSION_MISMATCH để frontend biết mà clear localStorage + tạo mới.
     */
    private ChatSession getOwnedSession(Long sessionId, Long currentUserId) {
        ChatSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc trò chuyện"));
        if (session.getUser() != null && currentUserId != null
                && !session.getUser().getId().equals(currentUserId)) {
            throw new BusinessException("SESSION_MISMATCH",
                    "Cuộc trò chuyện thuộc về tài khoản khác. Vui lòng tạo cuộc trò chuyện mới.");
        }
        return session;
    }

    private ChatMessageDto toMessageDto(ChatMessage m) {
        return new ChatMessageDto(m.getId(), m.getRole(), m.getContent(),
                m.getTokensInput(), m.getTokensOutput(), m.getResponseTimeMs(),
                m.getCreatedAt());
    }

    private record ToolCallLog(String name, Map<String, Object> args, Map<String, Object> result) {
        Map<String, Object> toMap() {
            return Map.of("name", name, "args", args, "resultKeys",
                    result == null ? List.of() : new ArrayList<>(result.keySet()));
        }
    }
}
