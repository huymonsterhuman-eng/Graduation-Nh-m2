-- V24: cách hiển thị ảnh banner khi tỷ lệ ảnh khác khung.
--   'cover'   — crop cho lấp đầy khung (giữ nguyên như trước), mặc định.
--   'contain' — fit toàn ảnh, có thể có viền trắng ở 2 bên/trên dưới, không mất mép.
-- Cột CHAR ngắn cho gọn; validate ở tầng service.

ALTER TABLE banners
    ADD COLUMN IF NOT EXISTS image_fit VARCHAR(10) NOT NULL DEFAULT 'cover';
