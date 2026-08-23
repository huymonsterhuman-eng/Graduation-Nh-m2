-- =============================================================
-- V7: Inventory FIFO — partners, goods_receipts, goods_issues
-- =============================================================

-- ---------- partners ----------
CREATE TABLE partners (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    type       VARCHAR(30)  NOT NULL,               -- 'supplier' | 'shipping_provider'
    phone      VARCHAR(20),
    email      VARCHAR(150),
    address    TEXT,
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT partners_type_check CHECK (type IN ('supplier','shipping_provider'))
);
CREATE INDEX idx_partners_type ON partners(type);

CREATE TRIGGER trg_partners_updated
BEFORE UPDATE ON partners
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- Wire orders.partner_id FK (forward ref từ V4) ----------
ALTER TABLE orders
    ADD CONSTRAINT fk_orders_partner
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_partner ON orders(partner_id) WHERE partner_id IS NOT NULL;


-- ---------- goods_receipts (Phiếu nhập) ----------
CREATE TABLE goods_receipts (
    id           BIGSERIAL PRIMARY KEY,
    code         VARCHAR(30)  NOT NULL UNIQUE,       -- GR-YYYYMMDD-NNN
    supplier_id  BIGINT NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    user_id      BIGINT NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    note         TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_goods_receipts_supplier   ON goods_receipts(supplier_id);
CREATE INDEX idx_goods_receipts_user       ON goods_receipts(user_id);
CREATE INDEX idx_goods_receipts_created_at ON goods_receipts(created_at DESC);

CREATE TRIGGER trg_goods_receipts_updated
BEFORE UPDATE ON goods_receipts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- goods_receipt_details (Chi tiết nhập / Lô hàng) ----------
CREATE TABLE goods_receipt_details (
    id                 BIGSERIAL PRIMARY KEY,
    goods_receipt_id   BIGINT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    product_id         BIGINT NOT NULL REFERENCES products(id)       ON DELETE RESTRICT,
    quantity           INTEGER      NOT NULL,
    remaining_quantity INTEGER      NOT NULL DEFAULT 0,
    import_price       NUMERIC(15,2) NOT NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT grd_qty_positive       CHECK (quantity > 0),
    CONSTRAINT grd_remaining_nonneg   CHECK (remaining_quantity >= 0),
    CONSTRAINT grd_remaining_lte_qty  CHECK (remaining_quantity <= quantity),
    CONSTRAINT grd_price_nonneg       CHECK (import_price >= 0)
);
CREATE INDEX idx_grd_product           ON goods_receipt_details(product_id);
-- Index cho FIFO scan: batch cùng SP còn hàng, cũ nhất trước
CREATE INDEX idx_grd_fifo
    ON goods_receipt_details(product_id, created_at)
    WHERE remaining_quantity > 0;

CREATE TRIGGER trg_grd_updated
BEFORE UPDATE ON goods_receipt_details
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- goods_issues (Phiếu xuất) ----------
CREATE TABLE goods_issues (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(30) NOT NULL UNIQUE,        -- GI-YYYYMMDD-NNN
    order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type        VARCHAR(10) NOT NULL DEFAULT 'auto',-- 'auto' | 'manual'
    author_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    note        TEXT,
    total_cogs  NUMERIC(15,2) NOT NULL DEFAULT 0,
    status      VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT gi_type_check   CHECK (type IN ('auto','manual')),
    CONSTRAINT gi_status_check CHECK (status IN ('completed','cancelled'))
);
CREATE INDEX idx_gi_order  ON goods_issues(order_id);
CREATE INDEX idx_gi_status ON goods_issues(status);

CREATE TRIGGER trg_gi_updated
BEFORE UPDATE ON goods_issues
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- goods_issue_details (Audit trail FIFO) ----------
CREATE TABLE goods_issue_details (
    id                       BIGSERIAL PRIMARY KEY,
    goods_issue_id           BIGINT NOT NULL REFERENCES goods_issues(id)          ON DELETE CASCADE,
    goods_receipt_detail_id  BIGINT NOT NULL REFERENCES goods_receipt_details(id) ON DELETE RESTRICT,
    product_id               BIGINT NOT NULL REFERENCES products(id)              ON DELETE RESTRICT,
    quantity                 INTEGER      NOT NULL,
    import_price             NUMERIC(15,2) NOT NULL,   -- snapshot từ batch nguồn
    total_price              NUMERIC(15,2) NOT NULL,   -- quantity * import_price
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT gid_qty_positive CHECK (quantity > 0)
);
CREATE INDEX idx_gid_issue   ON goods_issue_details(goods_issue_id);
CREATE INDEX idx_gid_batch   ON goods_issue_details(goods_receipt_detail_id);
CREATE INDEX idx_gid_product ON goods_issue_details(product_id);
