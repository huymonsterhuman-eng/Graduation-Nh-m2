-- 2026-08-26 polish: tách "Bộ sưu tập nổi bật" khỏi enum home_position → toggle độc lập
--   Trước: home_position là enum mutually exclusive, chọn FEATURED_BLOCK là mất khả năng gán chip
--   Sau : is_featured bool độc lập; home_position chỉ còn NONE/PHONE_CHIP/LAPTOP_CHIP
-- 1 collection có thể vừa là chip Laptop VỪA hiện trong section "Bộ sưu tập nổi bật".

ALTER TABLE collections
    ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: FEATURED_BLOCK cũ → is_featured=true + reset position về NONE
UPDATE collections
   SET is_featured = TRUE,
       home_position = 'NONE'
 WHERE home_position = 'FEATURED_BLOCK';

-- Index cho query featured
CREATE INDEX IF NOT EXISTS idx_collections_featured
    ON collections (is_featured, is_active, sort_order);
