-- =============================================================
-- V4: Cart + Order
-- =============================================================

-- ---------- carts ----------
CREATE TABLE carts (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_carts_updated
BEFORE UPDATE ON carts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- cart_items ----------
CREATE TABLE cart_items (
    id             BIGSERIAL PRIMARY KEY,
    cart_id        BIGINT NOT NULL REFERENCES carts(id)    ON DELETE CASCADE,
    product_id     BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity       INTEGER      NOT NULL,
    price_snapshot NUMERIC(15,2) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT cart_items_qty_positive CHECK (quantity > 0),
    CONSTRAINT ux_cart_items_cart_product UNIQUE (cart_id, product_id)
);
CREATE INDEX idx_cart_items_cart    ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);

CREATE TRIGGER trg_cart_items_updated
BEFORE UPDATE ON cart_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- orders ----------
CREATE TABLE orders (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(30)  NOT NULL UNIQUE,    -- ORD-YYYYMMDD-NNN, sinh ở service
    user_id           BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subtotal          NUMERIC(15,2) NOT NULL,
    discount_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
    shipping_fee      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total             NUMERIC(15,2) NOT NULL,
    shipping_name     VARCHAR(150),
    shipping_address  VARCHAR(500),
    shipping_phone    VARCHAR(20),
    shipping_method   VARCHAR(50),
    status            VARCHAR(20)  NOT NULL DEFAULT 'pending',
    payment_method    VARCHAR(20)  NOT NULL DEFAULT 'cod',
    payment_status    VARCHAR(20)  NOT NULL DEFAULT 'unpaid',
    voucher_id        BIGINT,                          -- FK add ở V5 (avoid forward ref)
    partner_id        BIGINT,                          -- FK add ở V7 (partners chưa tồn tại)
    tracking_number   VARCHAR(100),
    admin_note        TEXT,
    delivered_at      TIMESTAMPTZ,
    cancelled_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT orders_status_check         CHECK (status IN ('pending','confirmed','shipping','delivered','cancelled')),
    CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod','vnpay','momo')),
    CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid','paid','refunded')),
    CONSTRAINT orders_total_nonneg         CHECK (total >= 0)
);
CREATE INDEX idx_orders_user           ON orders(user_id);
CREATE INDEX idx_orders_status         ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at     ON orders(created_at DESC);

CREATE TRIGGER trg_orders_updated
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- order_details ----------
CREATE TABLE order_details (
    id                 BIGSERIAL PRIMARY KEY,
    order_id           BIGINT NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
    product_id         BIGINT REFERENCES products(id)          ON DELETE SET NULL,
    product_name       VARCHAR(255) NOT NULL,       -- snapshot
    product_image      VARCHAR(500),                -- snapshot
    quantity           INTEGER      NOT NULL,
    price_at_purchase  NUMERIC(15,2) NOT NULL,      -- snapshot
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT order_details_qty_positive   CHECK (quantity > 0),
    CONSTRAINT order_details_price_nonneg   CHECK (price_at_purchase >= 0)
);
CREATE INDEX idx_order_details_order   ON order_details(order_id);
CREATE INDEX idx_order_details_product ON order_details(product_id);

CREATE TRIGGER trg_order_details_updated
BEFORE UPDATE ON order_details
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
