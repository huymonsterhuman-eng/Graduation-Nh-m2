package com.example.LaptopWorld_project.catalog.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Kiểm toán reserved_stock — đối chiếu con số hệ thống đang tin với số reserved
 * thực tế đếm từ order_details của các đơn active (pending/confirmed/preparing).
 *
 * Chạy cron mỗi ngày 3h sáng. Cũng có thể chạy tay qua endpoint admin.
 *
 * KHÔNG auto-fix: chỉ log warning + trả kết quả để admin xem UI. Nếu logic đếm
 * expected sai (VD bỏ sót status), tự sửa sẽ làm hỏng dữ liệu thật.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservedStockAuditService {

    private final JdbcTemplate jdbc;

    public record MismatchRow(
            Long productId,
            String productName,
            int actualReserved,     // Con số products.reserved_stock hiện tại
            int expectedReserved,   // Đếm lại từ order_details của đơn active
            int deltaAbsolute       // actualReserved - expectedReserved (dương = giữ ảo, âm = thiếu)
    ) {}

    /**
     * Chạy audit: query tất cả SP có `reserved_stock != expected`.
     * Return list chênh lệch. List rỗng = hệ thống sạch, không có SP nào lệch.
     */
    @Transactional(readOnly = true)
    public List<MismatchRow> runAudit() {
        List<MismatchRow> rows = jdbc.query("""
                WITH expected AS (
                    SELECT od.product_id, SUM(od.quantity)::int AS reserved
                    FROM order_details od
                    JOIN orders o ON o.id = od.order_id
                    WHERE o.status IN ('pending', 'confirmed', 'preparing')
                    GROUP BY od.product_id
                )
                SELECT
                    p.id,
                    p.name,
                    p.reserved_stock AS actual,
                    COALESCE(e.reserved, 0) AS expected
                FROM products p
                LEFT JOIN expected e ON e.product_id = p.id
                WHERE p.deleted_at IS NULL
                  AND p.reserved_stock <> COALESCE(e.reserved, 0)
                ORDER BY ABS(p.reserved_stock - COALESCE(e.reserved, 0)) DESC
                """,
                (rs, rowNum) -> {
                    int actual = rs.getInt("actual");
                    int expected = rs.getInt("expected");
                    return new MismatchRow(
                            rs.getLong("id"),
                            rs.getString("name"),
                            actual,
                            expected,
                            actual - expected
                    );
                });

        if (rows.isEmpty()) {
            log.info("Reserved-stock audit: OK — không có SP nào lệch");
        } else {
            log.warn("Reserved-stock audit: phát hiện {} SP lệch reserved_stock", rows.size());
            for (MismatchRow r : rows) {
                log.warn("  SP {} ({}): actual={} expected={} delta={}",
                        r.productId(), r.productName(), r.actualReserved(),
                        r.expectedReserved(), r.deltaAbsolute());
            }
        }
        return rows;
    }

    /**
     * Cron 3h sáng mỗi ngày. Chỉ log — không auto-fix, không trả kết quả về đâu.
     * Chạy tay + xem UI thì gọi qua endpoint admin (bind vào runAudit()).
     */
    @Scheduled(cron = "${app.reserved-stock-audit.cron:0 0 3 * * *}")
    public void nightlyAudit() {
        try {
            runAudit();
        } catch (Exception ex) {
            log.error("Reserved-stock audit: lỗi khi chạy", ex);
        }
    }
}
