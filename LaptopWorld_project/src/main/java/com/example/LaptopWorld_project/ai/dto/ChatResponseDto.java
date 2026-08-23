package com.example.LaptopWorld_project.ai.dto;

import com.example.LaptopWorld_project.catalog.dto.ProductListItemDto;

import java.util.List;

/**
 * Response cho POST send message.
 * - assistant: message bot vừa trả lời
 * - citedProducts: các SP đã được RAG retrieve, bot có thể tham chiếu
 */
public record ChatResponseDto(
        Long sessionId,
        ChatMessageDto assistant,
        List<CitedProduct> citedProducts
) {
    public record CitedProduct(
            Long id,
            String name,
            String slug,
            java.math.BigDecimal price,
            String primaryImage,
            double similarity
    ) {
        public static CitedProduct from(ProductListItemDto p, double sim) {
            return new CitedProduct(p.id(), p.name(), p.slug(), p.price(),
                                    p.primaryImage(), sim);
        }
    }
}
