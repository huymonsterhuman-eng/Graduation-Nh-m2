package com.example.LaptopWorld_project.ai.tool;

import com.example.LaptopWorld_project.ai.gemini.dto.GenerateRequest.FunctionDeclaration;
import com.example.LaptopWorld_project.ai.gemini.dto.GenerateRequest.Tool;

import java.util.List;
import java.util.Map;

/**
 * Khai báo 4 tool cho Gemini function calling.
 * Schema theo JSON Schema đơn giản (type + properties + required).
 */
public final class ToolDefinitions {

    public static final String SEARCH_PRODUCTS      = "search_products";
    public static final String COMPARE_PRODUCTS     = "compare_products";
    public static final String RECOMMEND_BY_BUDGET  = "recommend_by_budget";
    public static final String GET_PRODUCT_DETAIL   = "get_product_detail";
    public static final String GET_MY_ORDERS        = "get_my_orders";

    private ToolDefinitions() {}

    public static List<Tool> all() {
        return List.of(new Tool(List.of(
                searchProducts(),
                compareProducts(),
                recommendByBudget(),
                getProductDetail(),
                getMyOrders()
        )));
    }

    // ---------- get_my_orders ----------
    private static FunctionDeclaration getMyOrders() {
        return new FunctionDeclaration(
                GET_MY_ORDERS,
                "Lấy danh sách đơn hàng gần đây của user hiện tại. " +
                "CHỈ DÙNG khi user hỏi về đơn hàng của họ (VD: 'đơn hàng của tôi', 'kiểm tra đơn', 'trạng thái đơn'). " +
                "Yêu cầu user đã đăng nhập — nếu chưa login tool sẽ trả error.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "limit", Map.of(
                                        "type", "integer",
                                        "description", "Số đơn tối đa (default 5, max 20)")
                        )
                )
        );
    }

    // ---------- search_products ----------
    private static FunctionDeclaration searchProducts() {
        return new FunctionDeclaration(
                SEARCH_PRODUCTS,
                "Tìm sản phẩm dựa trên câu hỏi tự nhiên (semantic search). " +
                "Dùng khi user muốn tìm SP theo mô tả nhu cầu. " +
                "Kết quả trả về top-K SP kèm giá và mô tả ngắn.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "query", Map.of(
                                        "type", "string",
                                        "description", "Câu hỏi hoặc từ khóa mô tả nhu cầu"),
                                "limit", Map.of(
                                        "type", "integer",
                                        "description", "Số kết quả tối đa (mặc định 5, tối đa 10)")
                        ),
                        "required", List.of("query")
                )
        );
    }

    // ---------- compare_products ----------
    private static FunctionDeclaration compareProducts() {
        return new FunctionDeclaration(
                COMPARE_PRODUCTS,
                "So sánh 2-3 sản phẩm cụ thể theo thông số kỹ thuật. " +
                "Dùng khi user chỉ định các sản phẩm để so sánh (bằng ID).",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "productIds", Map.of(
                                        "type", "array",
                                        "items", Map.of("type", "integer"),
                                        "description", "Danh sách ID sản phẩm (2-3 SP)")
                        ),
                        "required", List.of("productIds")
                )
        );
    }

    // ---------- recommend_by_budget ----------
    private static FunctionDeclaration recommendByBudget() {
        return new FunctionDeclaration(
                RECOMMEND_BY_BUDGET,
                "Gợi ý sản phẩm phù hợp ngân sách và mục đích sử dụng. " +
                "Dùng khi user cho biết cụ thể budget và use case.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "budget", Map.of(
                                        "type", "number",
                                        "description", "Ngân sách tối đa (VNĐ)"),
                                "useCase", Map.of(
                                        "type", "string",
                                        "description", "Mục đích sử dụng, VD: gaming, đồ họa, văn phòng, học tập"),
                                "categorySlug", Map.of(
                                        "type", "string",
                                        "description", "Slug category để giới hạn: laptop, dien-thoai, tablet...")
                        ),
                        "required", List.of("budget", "useCase")
                )
        );
    }

    // ---------- get_product_detail ----------
    private static FunctionDeclaration getProductDetail() {
        return new FunctionDeclaration(
                GET_PRODUCT_DETAIL,
                "Lấy chi tiết đầy đủ 1 sản phẩm theo ID: giá, tồn kho, thông số, mô tả.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "productId", Map.of(
                                        "type", "integer",
                                        "description", "ID sản phẩm")
                        ),
                        "required", List.of("productId")
                )
        );
    }
}
