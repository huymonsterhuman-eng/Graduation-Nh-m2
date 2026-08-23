-- =============================================================
-- V12: 2 token tables (email verify + password reset) + seed roles/permissions
-- Admin user duoc tao boi DataInitializer o tang Java (can BCrypt encoder).
-- =============================================================

-- ---------- email_verification_tokens ----------
CREATE TABLE email_verification_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) NOT NULL UNIQUE,   -- SHA256 hex cua raw token gui email
    expires_at TIMESTAMPTZ  NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_evt_user    ON email_verification_tokens(user_id);
CREATE INDEX idx_evt_expires ON email_verification_tokens(expires_at) WHERE used_at IS NULL;


-- ---------- password_reset_tokens ----------
CREATE TABLE password_reset_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) NOT NULL UNIQUE,   -- SHA256 hex
    expires_at TIMESTAMPTZ  NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prt_user    ON password_reset_tokens(user_id);
CREATE INDEX idx_prt_expires ON password_reset_tokens(expires_at) WHERE used_at IS NULL;


-- ---------- Seed roles ----------
INSERT INTO roles (name, description) VALUES
    ('ADMIN',    'Full quyen quan tri he thong'),
    ('STAFF',    'Nhan vien quan ly don hang, kho, san pham'),
    ('CUSTOMER', 'Khach hang cuoi');


-- ---------- Seed permissions ----------
INSERT INTO permissions (code, description) VALUES
    -- Product
    ('product.view',      'Xem danh sach san pham'),
    ('product.create',    'Tao san pham moi'),
    ('product.update',    'Cap nhat san pham'),
    ('product.delete',    'Xoa san pham'),
    -- Category / Brand / Collection
    ('catalog.manage',    'Quan ly danh muc, brand, collection'),
    -- Order
    ('order.view.all',    'Xem tat ca don hang'),
    ('order.update',      'Cap nhat trang thai don hang'),
    -- User
    ('user.view',         'Xem danh sach user'),
    ('user.update',       'Cap nhat user'),
    ('user.ban',          'Ban / unban user'),
    -- Review
    ('review.moderate',   'Duyet / an review'),
    -- Inventory
    ('inventory.manage',  'Quan ly kho: phieu nhap, phieu xuat'),
    -- Voucher / Banner / Blog
    ('voucher.manage',    'Quan ly voucher'),
    ('banner.manage',     'Quan ly banner trang chu'),
    ('blog.manage',       'Quan ly bai viet blog');


-- ---------- Gan tat ca permissions cho ADMIN ----------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'ADMIN';


-- ---------- STAFF: chi mot so permissions cot loi ----------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'STAFF'
  AND p.code IN (
    'product.view', 'product.create', 'product.update',
    'catalog.manage',
    'order.view.all', 'order.update',
    'review.moderate',
    'inventory.manage',
    'voucher.manage', 'banner.manage', 'blog.manage'
  );
