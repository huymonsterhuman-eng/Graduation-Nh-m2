package com.example.LaptopWorld_project.ai.prompt;

import com.example.LaptopWorld_project.ai.service.SemanticSearchService.SemanticResult;
import com.example.LaptopWorld_project.catalog.dto.ProductListItemDto;

import java.util.List;

/**
 * System prompt + prompt builder cho RAG. Tất cả prompt viết tiếng Việt.
 */
public final class SystemPrompts {

    private SystemPrompts() {}

    public static final String RAG_SYSTEM_PROMPT = """
            Bạn là trợ lý bán hàng của LaptopWorld — cửa hàng thiết bị công nghệ tại Việt Nam.
            Nhiệm vụ: giúp khách hàng tìm và chọn sản phẩm phù hợp.

            QUY TẮC BẮT BUỘC:
            1. CHỈ giới thiệu sản phẩm có trong danh sách "Sản phẩm liên quan" bên dưới.
               KHÔNG được bịa tên, giá, hoặc thông số không có trong danh sách.
            2. Nếu không có sản phẩm nào phù hợp trong danh sách, hãy nói thật:
               "Hiện tôi chưa tìm được sản phẩm phù hợp với yêu cầu của bạn.
                Bạn có thể mô tả kỹ hơn được không?"
            3. Trả lời bằng tiếng Việt tự nhiên, thân thiện, ngắn gọn (tối đa ~200 từ).
            4. Khi đề xuất sản phẩm, viết theo format:
               **[Tên SP]** — [giá đã format VNĐ]
               Nêu 1-2 điểm nổi bật ngắn gọn.
            5. Nếu khách hỏi so sánh, hãy nêu ưu điểm/nhược điểm rõ ràng.
            6. Nếu câu hỏi không liên quan đến sản phẩm/mua sắm, hãy lịch sự
               chuyển hướng: "Tôi chỉ hỗ trợ tư vấn sản phẩm LaptopWorld thôi ạ."

            Luôn kết thúc bằng câu mời hỏi tiếp, VD "Bạn muốn xem thêm gì không?"
            """;

    /**
     * Format danh sách sản phẩm retrieval-augmented làm context.
     */
    public static String formatProductContext(List<SemanticResult> results) {
        if (results == null || results.isEmpty()) {
            return "(Không có sản phẩm nào phù hợp trong kho)";
        }
        StringBuilder sb = new StringBuilder("Sản phẩm liên quan (top ")
                .append(results.size()).append("):\n\n");
        int i = 1;
        for (SemanticResult r : results) {
            ProductListItemDto p = r.product();
            sb.append(i++).append(". [ID=").append(p.id()).append("] ")
              .append(p.name()).append("\n")
              .append("   Giá: ").append(formatVnd(p.price())).append("\n")
              .append("   Danh mục: ").append(p.categoryName() == null ? "N/A" : p.categoryName())
              .append(" | Thương hiệu: ").append(p.brandName() == null ? "N/A" : p.brandName())
              .append("\n");
            if (p.shortDescription() != null && !p.shortDescription().isBlank()) {
                sb.append("   Mô tả: ").append(p.shortDescription()).append("\n");
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    /**
     * Nén lịch sử hội thoại thành dạng dễ đọc cho model.
     * @param historyOldestFirst list message theo thứ tự cũ nhất trước
     */
    public static String formatHistory(
            List<com.example.LaptopWorld_project.ai.entity.ChatMessage> historyOldestFirst) {
        if (historyOldestFirst.isEmpty()) return "(Chưa có lịch sử)";
        StringBuilder sb = new StringBuilder("Lịch sử hội thoại gần đây:\n");
        for (var m : historyOldestFirst) {
            String prefix = switch (m.getRole()) {
                case user -> "Khách";
                case assistant -> "Trợ lý";
                default -> m.getRole().name();
            };
            String content = m.getContent() == null ? "" : m.getContent();
            if (content.length() > 500) content = content.substring(0, 500) + "...";
            sb.append(prefix).append(": ").append(content).append("\n");
        }
        return sb.toString();
    }

    /**
     * Build user prompt cuối cùng gửi model: context + history + current question.
     */
    public static String buildUserPrompt(String currentQuestion,
                                         String productContext,
                                         String historyContext) {
        return """
                %s

                %s

                Câu hỏi hiện tại của khách: %s
                """.formatted(productContext, historyContext, currentQuestion);
    }

    private static String formatVnd(java.math.BigDecimal amount) {
        if (amount == null) return "N/A";
        return String.format("%,dđ", amount.longValue());
    }
}
