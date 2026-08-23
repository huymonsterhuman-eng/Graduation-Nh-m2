package com.example.LaptopWorld_project.admin.service;

import com.example.LaptopWorld_project.admin.dto.DashboardDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Aggregate queries cho dashboard admin. Dùng JdbcTemplate — vì phần lớn là SUM/COUNT
 * group by ngày/tuần/tháng nên native SQL Postgres tiện hơn JPQL.
 *
 * Range luôn được truyền vào ở dạng OffsetDateTime (from = 00:00 ngày đầu, to = 23:59:59.999 ngày cuối).
 * Smart bucket:
 *   - Tổng ≤ 31 ngày → group theo ngày   (label "dd/MM")
 *   - Tổng ≤ 180 ngày → group theo tuần  (label "Tuần dd/MM")
 *   - > 180 ngày → group theo tháng      (label "MM/yyyy")
 */
@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final JdbcTemplate jdbc;

    // ============ KPI ============

    @Transactional(readOnly = true)
    public KpiSummary getKpi(OffsetDateTime from, OffsetDateTime to) {
        // Doanh thu — tính các đơn "đã ghi nhận": shipping / delivered
        BigDecimal revenue = jdbc.queryForObject("""
                SELECT COALESCE(SUM(total), 0)
                FROM orders
                WHERE status IN ('shipping','delivered')
                  AND created_at >= ? AND created_at <= ?
                """, BigDecimal.class, from, to);

        Long orders = jdbc.queryForObject("""
                SELECT COUNT(*) FROM orders
                WHERE created_at >= ? AND created_at <= ?
                """, Long.class, from, to);

        Long newUsers = jdbc.queryForObject("""
                SELECT COUNT(*) FROM users
                WHERE created_at >= ? AND created_at <= ?
                """, Long.class, from, to);

        // Đơn mới trong khoảng — hiện là số đơn pending / confirmed / preparing (chưa giao).
        Long ordersInRange = jdbc.queryForObject("""
                SELECT COUNT(*) FROM orders
                WHERE status IN ('pending','confirmed','preparing')
                  AND created_at >= ? AND created_at <= ?
                """, Long.class, from, to);

        // Realtime — không phụ thuộc range
        Long criticalStock = jdbc.queryForObject("""
                SELECT COUNT(*) FROM products
                WHERE deleted_at IS NULL AND stock BETWEEN 1 AND 4
                """, Long.class);

        Long outOfStock = jdbc.queryForObject("""
                SELECT COUNT(*) FROM products
                WHERE deleted_at IS NULL AND stock <= 0
                """, Long.class);

        return new KpiSummary(
                revenue == null ? BigDecimal.ZERO : revenue,
                nz(orders), nz(newUsers), nz(ordersInRange),
                nz(criticalStock), nz(outOfStock));
    }

    // ============ Revenue timeseries ============

    @Transactional(readOnly = true)
    public List<TimeseriesPoint> getRevenueTimeseries(OffsetDateTime from, OffsetDateTime to) {
        Bucket bucket = pickBucket(from, to);
        List<TimeseriesPoint> out = new ArrayList<>();
        for (Range r : bucketize(from, to, bucket)) {
            BigDecimal v = jdbc.queryForObject("""
                    SELECT COALESCE(SUM(total), 0)
                    FROM orders
                    WHERE status IN ('shipping','delivered')
                      AND created_at >= ? AND created_at <= ?
                    """, BigDecimal.class, r.start, r.end);
            out.add(new TimeseriesPoint(r.label, v == null ? BigDecimal.ZERO : v));
        }
        return out;
    }

    // ============ Stock movement ============

    @Transactional(readOnly = true)
    public List<StockMovementPoint> getStockMovement(OffsetDateTime from, OffsetDateTime to) {
        Bucket bucket = pickBucket(from, to);
        List<StockMovementPoint> out = new ArrayList<>();
        for (Range r : bucketize(from, to, bucket)) {
            Long incoming = jdbc.queryForObject("""
                    SELECT COALESCE(SUM(grd.quantity), 0)
                    FROM goods_receipt_details grd
                    JOIN goods_receipts gr ON gr.id = grd.goods_receipt_id
                    WHERE gr.created_at >= ? AND gr.created_at <= ?
                    """, Long.class, r.start, r.end);
            // Hàng "bán ra" — dùng order_details của đơn không bị hủy
            Long outgoing = jdbc.queryForObject("""
                    SELECT COALESCE(SUM(od.quantity), 0)
                    FROM order_details od
                    JOIN orders o ON o.id = od.order_id
                    WHERE o.status <> 'cancelled'
                      AND o.created_at >= ? AND o.created_at <= ?
                    """, Long.class, r.start, r.end);
            out.add(new StockMovementPoint(r.label, nz(incoming), nz(outgoing)));
        }
        return out;
    }

    // ============ Sales by category ============

    @Transactional(readOnly = true)
    public List<SalesByCategory> getSalesByCategory(int limit) {
        int k = Math.max(1, Math.min(limit, 20));
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT c.name AS category_name, COALESCE(SUM(od.quantity), 0) AS total_sold
                FROM order_details od
                JOIN products p ON p.id = od.product_id
                JOIN categories c ON c.id = p.category_id
                JOIN orders o ON o.id = od.order_id
                WHERE o.status <> 'cancelled'
                GROUP BY c.name
                ORDER BY total_sold DESC
                LIMIT ?
                """, k);
        List<SalesByCategory> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            out.add(new SalesByCategory(
                    str(r.get("category_name")),
                    longVal(r.get("total_sold"))));
        }
        return out;
    }

    // ============ Top products ============

    @Transactional(readOnly = true)
    public List<TopProduct> getTopProducts(int limit) {
        int k = Math.max(1, Math.min(limit, 20));
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.id, p.name, p.slug, p.stock, p.price,
                       (SELECT path FROM product_images pi
                        WHERE pi.product_id = p.id
                        ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS primary_image,
                       COALESCE(SUM(od.quantity), 0) AS total_sold
                FROM products p
                JOIN order_details od ON od.product_id = p.id
                JOIN orders o ON o.id = od.order_id
                WHERE p.deleted_at IS NULL AND o.status <> 'cancelled'
                GROUP BY p.id
                HAVING COALESCE(SUM(od.quantity), 0) > 0
                ORDER BY total_sold DESC
                LIMIT ?
                """, k);
        return rows.stream().map(r -> new TopProduct(
                longVal(r.get("id")),
                str(r.get("name")),
                str(r.get("slug")),
                str(r.get("primary_image")),
                longVal(r.get("total_sold")),
                intVal(r.get("stock")),
                bd(r.get("price"))
        )).toList();
    }

    // ============ Dead stock ============

    @Transactional(readOnly = true)
    public List<DeadStock> getDeadStock(int days, int limit) {
        int d = Math.max(1, Math.min(days, 365));
        int k = Math.max(1, Math.min(limit, 50));
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(d);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.id, p.name, p.slug, p.stock, p.price, p.created_at,
                       (SELECT path FROM product_images pi
                        WHERE pi.product_id = p.id
                        ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS primary_image
                FROM products p
                WHERE p.deleted_at IS NULL AND p.stock > 0
                  AND NOT EXISTS (
                    SELECT 1 FROM order_details od
                    JOIN orders o ON o.id = od.order_id
                    WHERE od.product_id = p.id AND o.created_at >= ?
                  )
                ORDER BY p.stock DESC
                LIMIT ?
                """, since, k);
        return rows.stream().map(r -> new DeadStock(
                longVal(r.get("id")),
                str(r.get("name")),
                str(r.get("slug")),
                str(r.get("primary_image")),
                intVal(r.get("stock")),
                bd(r.get("price")),
                odt(r.get("created_at"))
        )).toList();
    }

    // ============ Low-rated ============

    @Transactional(readOnly = true)
    public List<LowRated> getLowRated(int limit) {
        int k = Math.max(1, Math.min(limit, 50));
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.id, p.name, p.slug,
                       c.name AS category_name,
                       (SELECT path FROM product_images pi
                        WHERE pi.product_id = p.id
                        ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS primary_image,
                       AVG(r.rating)::numeric(3,2) AS avg_rating,
                       COUNT(r.id) AS review_count
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                JOIN reviews r ON r.product_id = p.id AND r.is_hidden = FALSE
                WHERE p.deleted_at IS NULL
                GROUP BY p.id, c.name
                HAVING COUNT(r.id) > 0 AND AVG(r.rating) <= 3
                ORDER BY avg_rating ASC, review_count DESC
                LIMIT ?
                """, k);
        return rows.stream().map(r -> new LowRated(
                longVal(r.get("id")),
                str(r.get("name")),
                str(r.get("slug")),
                str(r.get("primary_image")),
                str(r.get("category_name")),
                bd(r.get("avg_rating")),
                longVal(r.get("review_count"))
        )).toList();
    }

    // ============ Latest orders ============

    @Transactional(readOnly = true)
    public List<LatestOrder> getLatestOrders(OffsetDateTime from, OffsetDateTime to, int limit) {
        int k = Math.max(1, Math.min(limit, 20));
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT o.id, o.code, o.total, o.status, o.payment_status,
                       o.shipping_name, u.username, o.created_at
                FROM orders o
                LEFT JOIN users u ON u.id = o.user_id
                WHERE o.created_at >= ? AND o.created_at <= ?
                ORDER BY o.created_at DESC
                LIMIT ?
                """, from, to, k);
        return rows.stream().map(r -> new LatestOrder(
                longVal(r.get("id")),
                str(r.get("code")),
                str(r.get("username")),
                str(r.get("shipping_name")),
                bd(r.get("total")),
                str(r.get("status")),
                str(r.get("payment_status")),
                odt(r.get("created_at"))
        )).toList();
    }

    // ============ Chatbot stats ============

    @Transactional(readOnly = true)
    public ChatbotStats getChatbotStats(OffsetDateTime from, OffsetDateTime to) {
        Long sessions = jdbc.queryForObject("""
                SELECT COUNT(*) FROM chat_sessions
                WHERE created_at >= ? AND created_at <= ?
                """, Long.class, from, to);
        Long messages = jdbc.queryForObject("""
                SELECT COUNT(*) FROM chat_messages
                WHERE created_at >= ? AND created_at <= ?
                """, Long.class, from, to);
        Long loggedIn = jdbc.queryForObject("""
                SELECT COUNT(*) FROM chat_sessions
                WHERE user_id IS NOT NULL
                  AND created_at >= ? AND created_at <= ?
                """, Long.class, from, to);
        Double avg = jdbc.queryForObject("""
                SELECT COALESCE(AVG(response_time_ms), 0)
                FROM chat_messages
                WHERE role = 'assistant' AND response_time_ms IS NOT NULL
                  AND created_at >= ? AND created_at <= ?
                """, Double.class, from, to);
        long s = nz(sessions);
        long l = nz(loggedIn);
        double rate = s == 0 ? 0.0 : Math.round(((double) l / s) * 1000.0) / 10.0;
        return new ChatbotStats(s, nz(messages), l, rate, (int) Math.round(avg == null ? 0 : avg));
    }

    // ============ Top questions ============

    @Transactional(readOnly = true)
    public List<ChatbotTopQuestion> getChatbotTopQuestions(int days, int limit) {
        int d = Math.max(1, Math.min(days, 365));
        int k = Math.max(1, Math.min(limit, 50));
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(d);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT LOWER(SUBSTRING(content FROM 1 FOR 100)) AS question,
                       COUNT(*) AS ask_count,
                       MAX(created_at) AS last_asked
                FROM chat_messages
                WHERE role = 'user' AND created_at >= ?
                  AND content IS NOT NULL AND LENGTH(TRIM(content)) > 0
                GROUP BY question
                ORDER BY ask_count DESC
                LIMIT ?
                """, since, k);
        return rows.stream().map(r -> new ChatbotTopQuestion(
                str(r.get("question")),
                longVal(r.get("ask_count")),
                odt(r.get("last_asked"))
        )).toList();
    }

    // ============ Bucket helpers ============

    private enum Bucket { DAY, WEEK, MONTH }

    private record Range(OffsetDateTime start, OffsetDateTime end, String label) {}

    private Bucket pickBucket(OffsetDateTime from, OffsetDateTime to) {
        long days = java.time.Duration.between(from, to).toDays() + 1;
        if (days <= 31) return Bucket.DAY;
        if (days <= 180) return Bucket.WEEK;
        return Bucket.MONTH;
    }

    private List<Range> bucketize(OffsetDateTime from, OffsetDateTime to, Bucket bucket) {
        List<Range> out = new ArrayList<>();
        LocalDate startDate = from.toLocalDate();
        LocalDate endDate = to.toLocalDate();
        LocalDate cursor = startDate;
        int safetyMax = 1000;

        while (!cursor.isAfter(endDate) && out.size() < safetyMax) {
            LocalDate bs, be, next;
            String label;
            switch (bucket) {
                case DAY -> {
                    bs = cursor;
                    be = cursor;
                    next = cursor.plusDays(1);
                    label = String.format("%02d/%02d", cursor.getDayOfMonth(), cursor.getMonthValue());
                }
                case WEEK -> {
                    WeekFields wf = WeekFields.of(Locale.forLanguageTag("vi-VN"));
                    bs = cursor.with(wf.dayOfWeek(), 1);
                    be = cursor.with(wf.dayOfWeek(), 7);
                    if (bs.isBefore(startDate)) bs = startDate;
                    if (be.isAfter(endDate)) be = endDate;
                    next = bs.with(wf.dayOfWeek(), 1).plusWeeks(1);
                    label = String.format("Tuần %02d/%02d", bs.getDayOfMonth(), bs.getMonthValue());
                }
                default /* MONTH */ -> {
                    bs = cursor.withDayOfMonth(1);
                    be = cursor.withDayOfMonth(cursor.lengthOfMonth());
                    if (bs.isBefore(startDate)) bs = startDate;
                    if (be.isAfter(endDate)) be = endDate;
                    next = cursor.withDayOfMonth(1).plusMonths(1);
                    label = String.format("%02d/%d", cursor.getMonthValue(), cursor.getYear());
                }
            }
            OffsetDateTime bsOd = bs.atTime(0, 0, 0).atOffset(from.getOffset());
            OffsetDateTime beOd = be.atTime(23, 59, 59, 999_000_000).atOffset(from.getOffset());
            out.add(new Range(bsOd, beOd, label));
            cursor = next;
        }
        return out;
    }

    // ============ Small utils ============
    private static long nz(Long v) { return v == null ? 0L : v; }

    private static long longVal(Object o) {
        if (o == null) return 0L;
        if (o instanceof Number n) return n.longValue();
        return Long.parseLong(o.toString());
    }

    private static int intVal(Object o) {
        if (o == null) return 0;
        if (o instanceof Number n) return n.intValue();
        return Integer.parseInt(o.toString());
    }

    private static BigDecimal bd(Object o) {
        if (o == null) return null;
        if (o instanceof BigDecimal b) return b;
        if (o instanceof Number n) return new BigDecimal(n.toString());
        return new BigDecimal(o.toString());
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }

    private static OffsetDateTime odt(Object o) {
        if (o == null) return null;
        if (o instanceof OffsetDateTime od) return od;
        if (o instanceof java.sql.Timestamp ts) return ts.toInstant().atOffset(ZoneOffset.UTC);
        if (o instanceof java.time.Instant in) return in.atOffset(ZoneOffset.UTC);
        return null;
    }
}
