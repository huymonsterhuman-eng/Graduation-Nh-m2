-- =============================================================
-- V21: Thêm 2 cột cho VNPay callback (Phase 10 Bước 10A)
--
-- (1) payment_transaction_ref: mã giao dịch VNPay trả về (vnp_TransactionNo).
--     Dùng để đối soát khi tra soát/khiếu nại với VNPay.
--
-- (2) paid_at: thời điểm nhận được callback IPN thành công.
--     Khác với created_at (thời điểm tạo đơn) và deliveredAt (giao hàng).
--
-- Không sinh bảng payment_transactions riêng — mỗi order chỉ có 1 giao dịch
-- VNPay hợp lệ ở phạm vi đồ án (không hỗ trợ retry/partial payment).
-- =============================================================

ALTER TABLE orders
    ADD COLUMN payment_transaction_ref VARCHAR(50),
    ADD COLUMN paid_at TIMESTAMPTZ;

CREATE INDEX idx_orders_payment_transaction_ref
    ON orders(payment_transaction_ref)
    WHERE payment_transaction_ref IS NOT NULL;
