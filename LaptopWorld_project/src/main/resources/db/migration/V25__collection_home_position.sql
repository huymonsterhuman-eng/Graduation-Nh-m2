-- Sprint polish 2026-08-26: thay `show_on_home` bool bằng `home_position` enum
--   NONE           — không hiển thị trên homepage
--   FEATURED_BLOCK — vào section "Bộ sưu tập nổi bật" (giữ hành vi cũ show_on_home=true)
--   PHONE_CHIP     — chip trong section Điện thoại (Bug 2 Idea 1)
--   LAPTOP_CHIP    — chip trong section Laptop (thay 5 slug hardcode)

ALTER TABLE collections
    ADD COLUMN home_position VARCHAR(20) NOT NULL DEFAULT 'NONE';

-- Backfill: show_on_home=true → FEATURED_BLOCK
UPDATE collections
   SET home_position = 'FEATURED_BLOCK'
 WHERE show_on_home = TRUE;

-- Drop cột cũ + index (nếu có)
DROP INDEX IF EXISTS idx_collections_show_on_home;
ALTER TABLE collections DROP COLUMN show_on_home;

-- Index mới hỗ trợ lookup theo position + active + sort
CREATE INDEX IF NOT EXISTS idx_collections_home_position
    ON collections (home_position, is_active, sort_order);
