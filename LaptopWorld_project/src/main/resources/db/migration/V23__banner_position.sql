-- V23: thêm cột `position` để banner có thể gán vào các slot khác nhau trên trang chủ.
-- Slot hiện dùng:
--   'hero_carousel'      — carousel chính trên đầu HomePage (mặc định)
--   'sidebar_phone'      — cột trái section "Điện thoại nổi bật"
--   'sidebar_laptop'     — cột trái section "Laptop văn phòng - Gaming"
-- Có thể mở rộng thêm slot bất kỳ mà không cần migration mới (giá trị VARCHAR tự do).

ALTER TABLE banners
    ADD COLUMN IF NOT EXISTS position VARCHAR(50);

-- Backfill: 3 banner seed từ V17 vốn dành cho carousel chính -> gán 'hero_carousel'.
UPDATE banners
SET position = 'hero_carousel'
WHERE position IS NULL;

-- Index nhẹ để query theo slot + active nhanh.
CREATE INDEX IF NOT EXISTS idx_banners_position_active
    ON banners (position, is_active, sort_order);
