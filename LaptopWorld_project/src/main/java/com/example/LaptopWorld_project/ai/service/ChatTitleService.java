package com.example.LaptopWorld_project.ai.service;

import com.example.LaptopWorld_project.ai.entity.ChatSession;
import com.example.LaptopWorld_project.ai.gemini.GeminiClient;
import com.example.LaptopWorld_project.ai.gemini.dto.GenerateResponse;
import com.example.LaptopWorld_project.ai.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Tự sinh tiêu đề ngắn (4-6 chữ) cho phiên chat dựa trên câu hỏi đầu tiên của khách.
 * Chạy nền — không chặn phản hồi chat cho user.
 * Admin nhìn vào danh sách chat thấy nội dung khách quan tâm mà không cần bấm xem.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatTitleService {

    /** Các title được coi là "default" cần thay bằng title do AI sinh. */
    public static final Set<String> DEFAULT_TITLES = Set.of(
            "Chat từ web", "Cuộc trò chuyện mới", "New chat", "");

    private static final String SYSTEM_PROMPT = """
            Bạn là công cụ tóm tắt. Nhiệm vụ duy nhất: đọc câu hỏi của khách hàng
            và sinh 1 tiêu đề ngắn 4-6 chữ tiếng Việt tóm chủ đề khách quan tâm.

            QUY TẮC BẮT BUỘC:
            - CHỈ trả về tiêu đề, KHÔNG giải thích, KHÔNG lời chào.
            - Không dấu ngoặc kép, không dấu chấm cuối câu.
            - Viết hoa chữ cái đầu, các chữ sau viết thường (trừ tên riêng).
            - Ưu tiên bám sát chủ đề, ngân sách, mục đích nếu có.

            Ví dụ:
              Câu hỏi: "Tôi cần tìm laptop chơi game khoảng 25 triệu"
              → Tư vấn laptop gaming 25tr

              Câu hỏi: "Iphone 15 pro max còn bảo hành không shop"
              → Hỏi bảo hành iPhone 15

              Câu hỏi: "So sánh macbook air m3 với m4 giúp mình"
              → So sánh MacBook M3 và M4
            """;

    private static final double TEMPERATURE = 0.3;
    private static final int MAX_TOKENS = 40;
    private static final int MAX_TITLE_LEN = 60;

    private final ChatSessionRepository sessionRepo;
    private final GeminiClient geminiClient;

    /**
     * Gọi trong flow chat sau khi save assistant reply — không block response chính.
     * Nuốt mọi exception: nếu Gemini fail thì giữ title tạm (do caller đã set từ 60 ký tự đầu).
     */
    @Async("aiTaskExecutor")
    @Transactional
    public void generateTitleAsync(Long sessionId, String userText) {
        try {
            ChatSession session = sessionRepo.findById(sessionId).orElse(null);
            if (session == null) return;

            // Guard: chỉ đè title nếu vẫn đang là default HOẶC vẫn là preview cắt từ userText
            // (tránh đè title admin đã sửa tay).
            String current = session.getTitle();
            boolean isPreviewOfSameQuestion = current != null
                    && userText != null
                    && userText.startsWith(current.replace("...", "").trim());
            if (!DEFAULT_TITLES.contains(current) && !isPreviewOfSameQuestion) {
                return;
            }

            String userPrompt = "Câu hỏi: \"" + safeTruncate(userText, 500) + "\"\nTiêu đề:";
            GenerateResponse resp = geminiClient.generate(
                    SYSTEM_PROMPT, userPrompt, TEMPERATURE, MAX_TOKENS);

            String title = cleanTitle(resp.getText());
            if (title.isBlank()) {
                log.debug("Title AI trả về rỗng cho session {}, giữ nguyên", sessionId);
                return;
            }
            session.setTitle(title);
            sessionRepo.save(session);
            log.info("Auto-title OK session={}: \"{}\"", sessionId, title);
        } catch (Exception e) {
            log.warn("Auto-title FAIL session={}: {}", sessionId, e.getMessage());
        }
    }

    /** Làm sạch output Gemini: bỏ ngoặc kép, prefix "Tiêu đề:", xuống dòng, dấu chấm cuối, cap length. */
    static String cleanTitle(String raw) {
        if (raw == null) return "";
        String t = raw.trim();
        // Bỏ prefix nếu model lỡ echo "Tiêu đề: xxx"
        int colon = t.indexOf(':');
        if (colon > 0 && colon < 20) {
            t = t.substring(colon + 1).trim();
        }
        // Bỏ ngoặc kép/nháy đơn bao ngoài
        t = t.replaceAll("^[\"'“”‘’]+", "").replaceAll("[\"'“”‘’]+$", "").trim();
        // Bỏ xuống dòng — nếu Gemini trả nhiều dòng, lấy dòng đầu
        int nl = t.indexOf('\n');
        if (nl > 0) t = t.substring(0, nl).trim();
        // Bỏ dấu chấm cuối
        while (t.endsWith(".") || t.endsWith("。")) {
            t = t.substring(0, t.length() - 1).trim();
        }
        if (t.length() > MAX_TITLE_LEN) {
            t = t.substring(0, MAX_TITLE_LEN).trim();
        }
        return t;
    }

    private static String safeTruncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }
}
