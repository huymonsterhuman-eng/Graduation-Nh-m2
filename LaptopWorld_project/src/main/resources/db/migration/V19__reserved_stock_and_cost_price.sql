-- =============================================================
-- V19: Stock reservation + Cost price
--
-- (1) reserved_stock: số lượng SP đang được "giữ chỗ" bởi các đơn
--     pending/confirmed/preparing (chưa qua approve issue FIFO).
--     available = stock - reserved_stock — dùng để chặn oversell.
--
-- (2) cost_price: giá vốn cơ sở của SP (nullable). Ràng buộc:
--     cost_price ≤ price (không thể có giá vốn cao hơn giá bán).
--     Import price mỗi lô (goods_receipt_details.import_price) cũng phải
--     ≤ products.price — enforce ở service layer (khi tạo phiếu nhập).
-- =============================================================

ALTER TABLE products
    ADD COLUMN reserved_stock INT NOT NULL DEFAULT 0,
    ADD COLUMN cost_price     NUMERIC(15, 2);

-- Ràng buộc: cost_price ≤ price (khi cost_price có giá trị)
ALTER TABLE products
    ADD CONSTRAINT products_cost_le_price
    CHECK (cost_price IS NULL OR cost_price <= price);

-- reserved_stock không âm và không vượt quá stock
ALTER TABLE products
    ADD CONSTRAINT products_reserved_non_negative CHECK (reserved_stock >= 0);

CREATE INDEX idx_products_reserved ON products(reserved_stock) WHERE reserved_stock > 0;
