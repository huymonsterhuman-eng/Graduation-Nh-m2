-- =============================================================
-- V15: Seed inventory — 2 partners + 1 goods_receipt bao trọn 200 SP
-- import_price = ROUND(price * 0.85) → tồn kho hiện tại có nguồn từ 1 lô nhập ảo
-- =============================================================

-- ---------- Partners ----------
INSERT INTO partners (name, type, phone, email, address, is_active) VALUES
    ('Nhà phân phối LaptopWorld', 'supplier', '02871010101', 'ncc@laptopworld.vn',
     '123 Nguyễn Văn Cừ, Quận 5, TP.HCM', TRUE),
    ('Giao Hàng Nhanh (GHN)', 'shipping_provider', '19006464', 'support@ghn.vn',
     'Tầng 5 toà nhà GHN, Cầu Giấy, Hà Nội', TRUE),
    ('Giao Hàng Tiết Kiệm (GHTK)', 'shipping_provider', '19006092', 'cskh@ghtk.vn',
     '11 Kim Đồng, Hoàng Mai, Hà Nội', TRUE);

-- ---------- 1 phiếu nhập khởi tạo cho toàn bộ SP đang có stock > 0 ----------
-- Lấy supplier default vừa tạo + admin user (seed từ DataInitializer là id=1)
WITH default_supplier AS (
    SELECT id FROM partners WHERE type = 'supplier' ORDER BY id ASC LIMIT 1
),
admin_user AS (
    SELECT id FROM users ORDER BY id ASC LIMIT 1
),
new_receipt AS (
    INSERT INTO goods_receipts (code, supplier_id, user_id, total_amount, note)
    SELECT 'GR-SEED-INIT-001',
           (SELECT id FROM default_supplier),
           (SELECT id FROM admin_user),
           0,
           'Phiếu nhập khởi tạo tự động (seed) — tồn kho ban đầu cho 200 SP'
    RETURNING id
)
INSERT INTO goods_receipt_details (goods_receipt_id, product_id, quantity, remaining_quantity, import_price)
SELECT nr.id,
       p.id,
       p.stock,
       p.stock,
       ROUND(p.price * 0.85, 0)
FROM products p
CROSS JOIN new_receipt nr
WHERE p.stock > 0
  AND p.deleted_at IS NULL;

-- ---------- Update total_amount cho phiếu nhập vừa tạo ----------
UPDATE goods_receipts gr
SET total_amount = (
    SELECT COALESCE(SUM(d.quantity * d.import_price), 0)
    FROM goods_receipt_details d
    WHERE d.goods_receipt_id = gr.id
)
WHERE gr.code = 'GR-SEED-INIT-001';
