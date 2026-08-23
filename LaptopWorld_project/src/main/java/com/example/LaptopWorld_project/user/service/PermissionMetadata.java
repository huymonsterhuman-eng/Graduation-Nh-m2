package com.example.LaptopWorld_project.user.service;

import com.example.LaptopWorld_project.user.dto.PermissionDto;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Hardcode label + groupName tiếng Việt cho 30 permission (không lưu ở DB vì
 * đây là UI concern). Client dùng để render form tabs — 4 nhóm chia sẵn.
 *
 * Thứ tự items trong mỗi nhóm ảnh hưởng thứ tự hiển thị.
 */
public final class PermissionMetadata {

    /** 4 nhóm với order được giữ nguyên. */
    public static final Map<String, List<PermissionDto>> GROUPS = new LinkedHashMap<>();

    static {
        GROUPS.put("🔐 Hệ thống", List.of(
                p("access_admin",         "🔓 Truy cập trang Quản trị"),
                p("manage_roles",         "🛡️ Quản lý Vai trò & Phân quyền"),
                p("view_reports",         "📊 Xem Báo cáo & Thống kê (Dashboard)")
        ));
        GROUPS.put("📦 Sản phẩm & Nội dung", List.of(
                p("view_products",        "👁️ Xem danh sách sản phẩm"),
                p("create_products",      "➕ Thêm sản phẩm mới"),
                p("edit_products",        "✏️ Sửa thông tin sản phẩm"),
                p("delete_products",      "🗑️ Xóa sản phẩm"),
                p("view_categories",      "👁️ Xem danh mục"),
                p("manage_categories",    "⚙️ Quản lý danh mục"),
                p("view_brands",          "👁️ Xem thương hiệu"),
                p("manage_brands",        "⚙️ Quản lý thương hiệu"),
                p("manage_collections",   "📂 Quản lý bộ sưu tập"),
                p("manage_banners",       "🖼️ Quản lý banner trang chủ"),
                p("manage_posts",         "📝 Quản lý bài viết blog")
        ));
        GROUPS.put("🏭 Kho & Vận chuyển", List.of(
                p("view_inventory",       "📊 Xem tồn kho + batches FIFO"),
                p("view_partners",        "👁️ Xem đối tác"),
                p("manage_partners",      "🤝 Quản lý đối tác (NCC + ĐVVC)"),
                p("manage_goods_receipt", "📥 Quản lý phiếu nhập kho"),
                p("manage_goods_issue",   "📤 Quản lý phiếu xuất kho (duyệt/từ chối)")
        ));
        GROUPS.put("🛒 Bán hàng & Khách hàng", List.of(
                p("view_orders",          "👁️ Xem danh sách đơn hàng"),
                p("manage_orders",        "⚙️ Xử lý đơn hàng"),
                p("create_orders_manual", "🧾 Tạo đơn thay khách"),
                p("view_vouchers",        "🎟️ Xem voucher"),
                p("manage_vouchers",      "⚙️ Quản lý voucher"),
                p("view_reviews",         "⭐ Xem đánh giá"),
                p("manage_reviews",       "⚙️ Quản lý đánh giá (ẩn, phản hồi, xóa)"),
                p("view_users",           "👥 Xem danh sách khách hàng"),
                p("manage_users",         "⚙️ Quản lý khách hàng (khóa/mở tài khoản)"),
                p("assign_user_roles",    "🎭 Gán vai trò cho khách hàng"),
                p("manage_ai_embedding",  "🤖 Quản lý trợ lý AI (embed + lịch sử chat)")
        ));
    }

    /** Trả về list phẳng toàn bộ permission với groupName kèm — cho endpoint list. */
    public static List<PermissionDto> asList() {
        List<PermissionDto> out = new java.util.ArrayList<>();
        GROUPS.forEach((group, items) -> items.forEach(dto ->
                out.add(new PermissionDto(dto.code(), dto.label(), group))));
        return out;
    }

    private static PermissionDto p(String code, String label) {
        return new PermissionDto(code, label, null);
    }

    private PermissionMetadata() {}
}
