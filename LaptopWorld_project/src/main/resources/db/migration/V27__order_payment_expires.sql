-- V27: thêm cột payment_expires_at cho orders — hết hạn thanh toán VNPay.
-- Job PaymentTimeoutService (@Scheduled 60s) quét đơn:
--   status=pending AND payment_method=vnpay AND payment_status=unpaid AND payment_expires_at < NOW()
-- → auto cancel, release reserved_stock, refund voucher.
-- COD và các đơn đã paid: payment_expires_at = NULL (không bao giờ hết hạn).

ALTER TABLE orders
    ADD COLUMN payment_expires_at TIMESTAMPTZ NULL;

-- Index cho query của job — chỉ index đơn còn cần theo dõi.
CREATE INDEX ix_orders_payment_expires_at
    ON orders (payment_expires_at)
    WHERE payment_expires_at IS NOT NULL;
