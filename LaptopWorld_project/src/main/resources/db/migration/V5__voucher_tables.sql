-- =============================================================
-- V5: Voucher
-- =============================================================

CREATE TABLE vouchers (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(50)  NOT NULL UNIQUE,
    name            VARCHAR(150) NOT NULL,
    type            VARCHAR(10)  NOT NULL,          -- 'fixed' | 'percent'
    discount_amount NUMERIC(15,2) NOT NULL,         -- nếu type=percent thì đây là %
    min_order_value NUMERIC(15,2) NOT NULL DEFAULT 0,
    max_discount    NUMERIC(15,2),                  -- giới hạn khi percent
    started_at      TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    usage_limit     INTEGER,                        -- NULL = không giới hạn
    used_count      INTEGER      NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT vouchers_type_check              CHECK (type IN ('fixed','percent')),
    CONSTRAINT vouchers_discount_positive       CHECK (discount_amount > 0),
    CONSTRAINT vouchers_percent_max_100         CHECK (type <> 'percent' OR discount_amount <= 100),
    CONSTRAINT vouchers_min_order_nonneg        CHECK (min_order_value >= 0),
    CONSTRAINT vouchers_usage_limit_positive    CHECK (usage_limit IS NULL OR usage_limit > 0),
    CONSTRAINT vouchers_used_count_nonneg       CHECK (used_count >= 0)
);
CREATE INDEX idx_vouchers_active_expires ON vouchers(is_active, expires_at);

CREATE TRIGGER trg_vouchers_updated
BEFORE UPDATE ON vouchers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- user_vouchers ----------
CREATE TABLE user_vouchers (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    voucher_id BIGINT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    is_used    BOOLEAN NOT NULL DEFAULT FALSE,
    used_at    TIMESTAMPTZ,
    order_id   BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ux_user_vouchers UNIQUE (user_id, voucher_id)
);
CREATE INDEX idx_user_vouchers_voucher ON user_vouchers(voucher_id);
CREATE INDEX idx_user_vouchers_order   ON user_vouchers(order_id) WHERE order_id IS NOT NULL;

CREATE TRIGGER trg_user_vouchers_updated
BEFORE UPDATE ON user_vouchers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- Wire orders.voucher_id FK (forward ref từ V4) ----------
ALTER TABLE orders
    ADD CONSTRAINT fk_orders_voucher
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_voucher ON orders(voucher_id) WHERE voucher_id IS NOT NULL;
