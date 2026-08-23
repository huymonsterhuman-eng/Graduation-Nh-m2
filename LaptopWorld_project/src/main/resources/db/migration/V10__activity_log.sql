-- =============================================================
-- V10: Activity log (audit trail)
-- =============================================================

CREATE TABLE activity_logs (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action       VARCHAR(80)  NOT NULL,           -- 'created_order', 'updated_product', 'login'
    action_type  VARCHAR(30)  NOT NULL DEFAULT 'system',  -- 'system' | 'inventory' | 'order' | 'auth'
    description  TEXT,
    subject_type VARCHAR(80),                     -- 'Order', 'Product', ...
    subject_id   BIGINT,
    properties   JSONB,
    ip           VARCHAR(45),
    user_agent   TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_logs_user       ON activity_logs(user_id)       WHERE user_id IS NOT NULL;
CREATE INDEX idx_activity_logs_subject    ON activity_logs(subject_type, subject_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action     ON activity_logs(action);
