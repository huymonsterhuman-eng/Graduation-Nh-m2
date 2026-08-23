-- =============================================================
-- V16: Bổ sung luồng "preparing + kho duyệt phiếu xuất" giống webthegioididong
--   - orders.status thêm giá trị 'preparing' + cột preparing_at
--   - goods_issues.status thêm giá trị 'pending' (chờ kho duyệt)
--   - goods_issues.order_id cho phép NULL (phục vụ phiếu xuất manual)
--   - goods_issue_details.goods_receipt_detail_id cho phép NULL (stub khi phiếu pending)
-- =============================================================

-- ---------- orders.status: thêm 'preparing' ----------
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending','confirmed','preparing','shipping','delivered','cancelled'));

ALTER TABLE orders ADD COLUMN preparing_at TIMESTAMPTZ;


-- ---------- goods_issues.status: thêm 'pending' ----------
ALTER TABLE goods_issues DROP CONSTRAINT gi_status_check;
ALTER TABLE goods_issues
    ADD CONSTRAINT gi_status_check
    CHECK (status IN ('pending','completed','cancelled'));

-- Default status đổi sang 'pending' để phiếu tạo mới auto vào chờ duyệt
ALTER TABLE goods_issues ALTER COLUMN status SET DEFAULT 'pending';


-- ---------- goods_issues.order_id: cho phép NULL (phiếu manual) ----------
ALTER TABLE goods_issues ALTER COLUMN order_id DROP NOT NULL;

-- FK vẫn giữ ON DELETE CASCADE cho phiếu auto (khi order bị xóa cứng thì phiếu cascade).
-- Phiếu manual có order_id NULL nên không bị ảnh hưởng.


-- ---------- goods_issue_details.goods_receipt_detail_id: cho phép NULL (stub) ----------
ALTER TABLE goods_issue_details ALTER COLUMN goods_receipt_detail_id DROP NOT NULL;

-- Đổi FK từ RESTRICT → SET NULL để trường hợp lô nguồn bị xóa cứng (hiếm)
-- không chặn thao tác. Stub luôn NULL nên không bị ảnh hưởng.
ALTER TABLE goods_issue_details DROP CONSTRAINT goods_issue_details_goods_receipt_detail_id_fkey;
ALTER TABLE goods_issue_details
    ADD CONSTRAINT goods_issue_details_goods_receipt_detail_id_fkey
    FOREIGN KEY (goods_receipt_detail_id)
    REFERENCES goods_receipt_details(id) ON DELETE SET NULL;
