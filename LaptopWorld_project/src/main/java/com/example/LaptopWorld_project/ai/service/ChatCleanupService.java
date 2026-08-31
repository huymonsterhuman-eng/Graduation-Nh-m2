package com.example.LaptopWorld_project.ai.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Dọn phiên chat rất cũ để dữ liệu không phình theo thời gian.
 * Chạy 3h sáng Chủ nhật hằng tuần — giờ ít traffic, DB nhẹ.
 * <p>
 * Chatbot yêu cầu đăng nhập (V33), nên mọi phiên đều có chủ. Job này xoá phiên
 * có hoạt động cuối cách đây quá {@code guestRetentionDays} ngày (mặc định 180).
 * <p>
 * Chiến lược:
 *   1. Gộp số liệu (số phiên, số tin, 👍/👎) của mọi ngày sắp bị xoá vào bảng
 *      {@code chat_stats_daily} để dashboard vẫn có thống kê dài hạn.
 *   2. Xoá phiên có {@code last_activity_at} cũ hơn ngưỡng.
 *      FK chat_messages ON DELETE CASCADE tự xoá message theo.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatCleanupService {

    /** Số ngày giữ phiên chat trước khi dọn. Mặc định 180 = 6 tháng. */
    @Value("${app.ai.chat.retention-days:180}")
    private int retentionDays;

    private final JdbcTemplate jdbc;

    /** Cron: 3h sáng mỗi Chủ nhật, múi giờ VN. */
    @Scheduled(cron = "0 0 3 ? * SUN", zone = "Asia/Ho_Chi_Minh")
    public void scheduledCleanup() {
        log.info("Bắt đầu dọn phiên chat cũ theo lịch...");
        Map<String, Object> result = runCleanup();
        log.info("Đã dọn xong: {}", result);
    }

    /**
     * Chạy tay từ endpoint admin. Trả về stats để hiển thị toast/log ở FE.
     */
    @Transactional
    public Map<String, Object> runCleanup() {
        LocalDate cutoff = LocalDate.now().minusDays(retentionDays);
        long start = System.currentTimeMillis();

        // 1. Aggregate stats theo ngày cho các phiên sắp bị xoá.
        aggregateStatsBeforeCutoff(cutoff);

        // 2. Đếm số phiên sẽ xoá (để trả về UI).
        Integer willDelete = jdbc.queryForObject(
                "SELECT COUNT(*) FROM chat_sessions WHERE last_activity_at < ?::date",
                Integer.class, cutoff.toString());
        int purged = willDelete == null ? 0 : willDelete;

        // 3. Xoá.
        jdbc.update("DELETE FROM chat_sessions WHERE last_activity_at < ?::date",
                cutoff.toString());

        // 4. Ghi số lượng đã purge vào bảng stats (dồn vào dòng ngày hôm nay).
        upsertPurgedCount(LocalDate.now(), purged);

        long durationMs = System.currentTimeMillis() - start;
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("cutoffDate", cutoff.toString());
        stats.put("sessionsDeleted", purged);
        stats.put("retentionDays", retentionDays);
        stats.put("durationMs", durationMs);
        return stats;
    }

    /**
     * Gom số liệu chat của mỗi ngày (giới hạn ngày < cutoff) và upsert vào
     * chat_stats_daily. Ngày đã có row trước đó thì cộng dồn để không mất số cũ
     * khi job chạy nhiều lần.
     */
    private void aggregateStatsBeforeCutoff(LocalDate cutoff) {
        String sql = """
                INSERT INTO chat_stats_daily (
                    day, sessions_total, sessions_guest, sessions_logged_in,
                    messages_total, messages_user, messages_assistant,
                    likes, dislikes, aggregated_at
                )
                SELECT
                    DATE(s.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')                    AS day,
                    COUNT(DISTINCT s.id)                                                  AS sessions_total,
                    0                                                                     AS sessions_guest,
                    COUNT(DISTINCT s.id)                                                  AS sessions_logged_in,
                    COALESCE(COUNT(m.id), 0)                                              AS messages_total,
                    COALESCE(SUM(CASE WHEN m.role = 'user'      THEN 1 ELSE 0 END), 0)    AS messages_user,
                    COALESCE(SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END), 0)    AS messages_assistant,
                    COALESCE(SUM(CASE WHEN m.feedback = 1  THEN 1 ELSE 0 END), 0)         AS likes,
                    COALESCE(SUM(CASE WHEN m.feedback = -1 THEN 1 ELSE 0 END), 0)         AS dislikes,
                    NOW()
                FROM chat_sessions s
                LEFT JOIN chat_messages m ON m.session_id = s.id
                WHERE s.last_activity_at < ?::date
                GROUP BY DATE(s.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
                ON CONFLICT (day) DO UPDATE SET
                    sessions_total     = chat_stats_daily.sessions_total     + EXCLUDED.sessions_total,
                    sessions_logged_in = chat_stats_daily.sessions_logged_in + EXCLUDED.sessions_logged_in,
                    messages_total     = chat_stats_daily.messages_total     + EXCLUDED.messages_total,
                    messages_user      = chat_stats_daily.messages_user      + EXCLUDED.messages_user,
                    messages_assistant = chat_stats_daily.messages_assistant + EXCLUDED.messages_assistant,
                    likes              = chat_stats_daily.likes              + EXCLUDED.likes,
                    dislikes           = chat_stats_daily.dislikes           + EXCLUDED.dislikes,
                    aggregated_at      = NOW()
                """;
        jdbc.update(sql, cutoff.toString());
    }

    private void upsertPurgedCount(LocalDate day, int purged) {
        if (purged <= 0) return;
        jdbc.update("""
                INSERT INTO chat_stats_daily (day, sessions_purged, aggregated_at)
                VALUES (?::date, ?, NOW())
                ON CONFLICT (day) DO UPDATE
                    SET sessions_purged = chat_stats_daily.sessions_purged + EXCLUDED.sessions_purged,
                        aggregated_at   = NOW()
                """, day.toString(), purged);
    }

    // ==================== READ STATS ====================
    /**
     * Trả thống kê N ngày gần nhất cho dashboard admin.
     * Kết hợp: (a) stats đã aggregate (phiên cũ đã xoá), (b) stats live query
     * từ chat_sessions/chat_messages cho phiên còn tồn tại. Cộng dồn 2 nguồn theo ngày.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getRecentStats(int days) {
        LocalDate from = LocalDate.now().minusDays(Math.max(1, days - 1));

        // Nguồn 1: stats aggregate cũ
        Map<String, long[]> merged = new LinkedHashMap<>();
        jdbc.query(
                "SELECT day, sessions_total, messages_total, likes, dislikes " +
                "FROM chat_stats_daily WHERE day >= ?::date ORDER BY day",
                (rs) -> {
                    long[] row = new long[]{
                            rs.getLong("sessions_total"),
                            rs.getLong("messages_total"),
                            rs.getLong("likes"),
                            rs.getLong("dislikes"),
                    };
                    merged.put(rs.getDate("day").toString(), row);
                },
                from.toString());

        // Nguồn 2: live query trên phiên còn tồn tại
        String liveSql = """
                SELECT
                    DATE(s.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')                 AS day,
                    COUNT(DISTINCT s.id)                                               AS sessions_total,
                    COALESCE(COUNT(m.id), 0)                                           AS messages_total,
                    COALESCE(SUM(CASE WHEN m.feedback = 1  THEN 1 ELSE 0 END), 0)      AS likes,
                    COALESCE(SUM(CASE WHEN m.feedback = -1 THEN 1 ELSE 0 END), 0)      AS dislikes
                FROM chat_sessions s
                LEFT JOIN chat_messages m ON m.session_id = s.id
                WHERE s.created_at >= ?::timestamptz
                GROUP BY DATE(s.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
                ORDER BY day
                """;
        jdbc.query(liveSql, (rs) -> {
            String day = rs.getDate("day").toString();
            long[] existing = merged.getOrDefault(day, new long[]{0, 0, 0, 0});
            existing[0] += rs.getLong("sessions_total");
            existing[1] += rs.getLong("messages_total");
            existing[2] += rs.getLong("likes");
            existing[3] += rs.getLong("dislikes");
            merged.put(day, existing);
        }, from.toString());

        // Build response
        long totalSessions = 0, totalMessages = 0, totalLikes = 0, totalDislikes = 0;
        List<Map<String, Object>> series = new java.util.ArrayList<>();
        for (Map.Entry<String, long[]> e : merged.entrySet()) {
            long[] v = e.getValue();
            totalSessions += v[0];
            totalMessages += v[1];
            totalLikes    += v[2];
            totalDislikes += v[3];
            Map<String, Object> point = new HashMap<>();
            point.put("day", e.getKey());
            point.put("sessions", v[0]);
            point.put("messages", v[1]);
            point.put("likes", v[2]);
            point.put("dislikes", v[3]);
            series.add(point);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("rangeDays", days);
        res.put("totalSessions", totalSessions);
        res.put("totalMessages", totalMessages);
        res.put("totalLikes", totalLikes);
        res.put("totalDislikes", totalDislikes);
        res.put("series", series);
        return res;
    }
}
