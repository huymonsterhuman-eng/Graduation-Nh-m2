-- V32: Bảng thống kê chat hằng ngày.
-- Job dọn phiên guest cũ sẽ aggregate số liệu trước khi xóa để không mất trend dài hạn.
-- 1 dòng / 1 ngày → 1 năm chỉ ~365 dòng, gần như không tốn dung lượng.
CREATE TABLE chat_stats_daily (
    day                  DATE PRIMARY KEY,
    sessions_total       INT NOT NULL DEFAULT 0,
    sessions_guest       INT NOT NULL DEFAULT 0,
    sessions_logged_in   INT NOT NULL DEFAULT 0,
    messages_total       INT NOT NULL DEFAULT 0,
    messages_user        INT NOT NULL DEFAULT 0,
    messages_assistant   INT NOT NULL DEFAULT 0,
    likes                INT NOT NULL DEFAULT 0,
    dislikes             INT NOT NULL DEFAULT 0,
    sessions_purged      INT NOT NULL DEFAULT 0,
    aggregated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_stats_daily_day ON chat_stats_daily(day DESC);
