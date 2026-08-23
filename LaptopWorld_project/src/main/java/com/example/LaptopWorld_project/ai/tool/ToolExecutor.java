package com.example.LaptopWorld_project.ai.tool;

import com.example.LaptopWorld_project.ai.service.SemanticSearchService;
import com.example.LaptopWorld_project.catalog.dto.ProductListItemDto;
import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.repository.CategoryRepository;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * Dispatch tool call từ Gemini đến logic thật.
 * Kết quả luôn là Map<String,Object> để Gemini parse dễ.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ToolExecutor {

    private final SemanticSearchService semanticSearch;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final OrderRepository orderRepository;

    /**
     * Dispatch theo tool name — có context userId (null = guest).
     * Tool yêu cầu login (get_my_orders) sẽ tự trả lỗi khi userId=null.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> execute(String toolName, Map<String, Object> args, Long currentUserId) {
        log.info("Tool call: {} args={} userId={}", toolName, args, currentUserId);
        try {
            return switch (toolName) {
                case ToolDefinitions.SEARCH_PRODUCTS     -> searchProducts(args);
                case ToolDefinitions.COMPARE_PRODUCTS    -> compareProducts(args);
                case ToolDefinitions.RECOMMEND_BY_BUDGET -> recommendByBudget(args);
                case ToolDefinitions.GET_PRODUCT_DETAIL  -> getProductDetail(args);
                case ToolDefinitions.GET_MY_ORDERS       -> getMyOrders(args, currentUserId);
                default -> Map.of("error", "Unknown tool: " + toolName);
            };
        } catch (Exception e) {
            log.error("Tool {} failed: {}", toolName, e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }

    // ==================== search_products ====================
    private Map<String, Object> searchProducts(Map<String, Object> args) {
        String query = (String) args.get("query");
        int limit = Math.min(intOr(args, "limit", 5), 10);
        List<SemanticSearchService.SemanticResult> results = semanticSearch.search(query, limit);
        return Map.of("results", results.stream().map(r -> productSummary(r.product(), r.similarity())).toList());
    }

    // ==================== compare_products ====================
    private Map<String, Object> compareProducts(Map<String, Object> args) {
        Object raw = args.get("productIds");
        if (!(raw instanceof List<?> list)) {
            return Map.of("error", "productIds phải là mảng ID");
        }
        List<Long> ids = list.stream()
                .filter(Objects::nonNull)
                .map(o -> ((Number) o).longValue())
                .toList();
        List<Product> products = productRepository.findAllById(ids);
        if (products.isEmpty()) return Map.of("error", "Không tìm thấy sản phẩm với các ID cho");

        List<Map<String, Object>> comparison = products.stream().map(this::productDetail).toList();
        return Map.of("comparison", comparison, "count", comparison.size());
    }

    // ==================== recommend_by_budget ====================
    private Map<String, Object> recommendByBudget(Map<String, Object> args) {
        double budget = ((Number) args.get("budget")).doubleValue();
        String useCase = (String) args.get("useCase");
        String categorySlug = (String) args.get("categorySlug");

        // Semantic search với useCase để tìm SP liên quan
        List<SemanticSearchService.SemanticResult> raw = semanticSearch.search(useCase, 20);

        // Filter by budget và optionally category
        Long categoryId = null;
        if (categorySlug != null && !categorySlug.isBlank()) {
            categoryId = categoryRepository.findBySlug(categorySlug).map(c -> c.getId()).orElse(null);
        }
        final Long filterCat = categoryId;
        BigDecimal budgetBD = BigDecimal.valueOf(budget);

        var filtered = raw.stream()
                .filter(r -> r.product().price().compareTo(budgetBD) <= 0)
                .filter(r -> filterCat == null
                        || filterCat.toString().equals(r.product().categoryName())
                        || matchCategory(r.product().id(), filterCat))
                .limit(5)
                .toList();

        return Map.of(
                "budget", budget,
                "useCase", useCase,
                "recommendations", filtered.stream()
                        .map(r -> productSummary(r.product(), r.similarity())).toList()
        );
    }

    private boolean matchCategory(Long productId, Long categoryId) {
        return productRepository.findById(productId)
                .map(p -> p.getCategory() != null && p.getCategory().getId().equals(categoryId))
                .orElse(false);
    }

    // ==================== get_my_orders ====================
    private Map<String, Object> getMyOrders(Map<String, Object> args, Long userId) {
        if (userId == null) {
            return Map.of("error", "Bạn cần đăng nhập để xem đơn hàng. Hãy đăng nhập rồi hỏi lại nhé.");
        }
        int limit = Math.min(intOr(args, "limit", 5), 20);
        var page = orderRepository.findByUserIdOrderByCreatedAtDesc(userId,
                PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<Map<String, Object>> orders = page.getContent().stream()
                .map(this::orderSummary).toList();
        return Map.of("count", orders.size(), "orders", orders);
    }

    private Map<String, Object> orderSummary(Order o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", o.getCode());
        m.put("status", o.getStatus().name());
        m.put("total", o.getTotal());
        m.put("paymentMethod", o.getPaymentMethod().name());
        m.put("paymentStatus", o.getPaymentStatus().name());
        m.put("createdAt", o.getCreatedAt().toString());
        if (o.getDeliveredAt() != null) m.put("deliveredAt", o.getDeliveredAt().toString());
        return m;
    }

    // ==================== get_product_detail ====================
    private Map<String, Object> getProductDetail(Map<String, Object> args) {
        Long productId = ((Number) args.get("productId")).longValue();
        Product p = productRepository.findWithDetailsById(productId).orElse(null);
        if (p == null) return Map.of("error", "Không tìm thấy sản phẩm ID=" + productId);
        return productDetail(p);
    }

    // ==================== helpers ====================
    private Map<String, Object> productSummary(ProductListItemDto p, double similarity) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.id());
        m.put("name", p.name());
        m.put("price", p.price());
        if (p.salePrice() != null) m.put("salePrice", p.salePrice());
        m.put("category", p.categoryName());
        m.put("brand", p.brandName());
        m.put("stock", p.stock());
        m.put("similarity", Math.round(similarity * 100) / 100.0);
        return m;
    }

    private Map<String, Object> productDetail(Product p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("name", p.getName());
        m.put("slug", p.getSlug());
        m.put("price", p.getPrice());
        if (p.getSalePrice() != null) m.put("salePrice", p.getSalePrice());
        m.put("stock", p.getStock());
        m.put("shortDescription", p.getShortDescription());
        if (p.getBrand() != null)    m.put("brand", p.getBrand().getName());
        if (p.getCategory() != null) m.put("category", p.getCategory().getName());
        if (p.getSpecs() != null)    m.put("specs", p.getSpecs());
        return m;
    }

    private int intOr(Map<String, Object> args, String key, int def) {
        Object v = args.get(key);
        return v == null ? def : ((Number) v).intValue();
    }
}
