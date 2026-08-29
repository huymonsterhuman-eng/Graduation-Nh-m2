-- =============================================================
-- V28: Trạng thái cho phiếu nhập kho — workflow duyệt (mirror phiếu xuất manual)
--   pending   : mới tạo, chưa cộng stock, remaining_quantity=0
--   completed : admin duyệt, đã cộng stock + set remaining=quantity → available cho FIFO
--   cancelled : admin hủy phiếu pending (không đụng stock)
-- Data cũ backfill = 'completed' (stock đã cộng, lô đã tính vào FIFO).
-- Nếu completed rồi phát hiện nhầm → nhân viên tạo Phiếu xuất manual để cân đối.
-- =============================================================

ALTER TABLE goods_receipts
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'cancelled'));

CREATE INDEX idx_goods_receipts_status ON goods_receipts(status);
