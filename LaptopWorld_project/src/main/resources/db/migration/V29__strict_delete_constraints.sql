-- =============================================================
-- V27: Siết FK sang RESTRICT để chặn xoá parent khi còn con
--   - posts.post_category_id: SET NULL → RESTRICT (không cho xoá cat còn bài)
--   - orders.partner_id:      SET NULL → RESTRICT (không cho xoá ĐVVC còn đơn)
--
-- Trước khi đổi: backfill posts orphan (post_category_id IS NULL) do trước đây
-- đã xoá danh mục còn bài viết → gán vào danh mục "Chưa phân loại" (tự tạo nếu
-- chưa có). Sau migration admin có thể vào edit post đổi lại.
-- =============================================================

-- 1) Backfill posts orphan
DO $$
DECLARE
    orphan_count   INT;
    fallback_id    BIGINT;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM posts
    WHERE post_category_id IS NULL;

    IF orphan_count > 0 THEN
        INSERT INTO post_categories (name, slug, description)
        VALUES ('Chưa phân loại', 'chua-phan-loai',
                'Bài viết chưa được gán danh mục cụ thể — admin nên chuyển sang danh mục phù hợp.')
        ON CONFLICT (slug) DO NOTHING;

        SELECT id INTO fallback_id
        FROM post_categories
        WHERE slug = 'chua-phan-loai';

        UPDATE posts
        SET post_category_id = fallback_id
        WHERE post_category_id IS NULL;

        RAISE NOTICE 'V27: đã gán % bài viết orphan sang danh mục "Chưa phân loại" (id=%)',
                     orphan_count, fallback_id;
    END IF;
END $$;


-- 2) Đổi FK posts.post_category_id sang RESTRICT
--    Dùng DO block tìm tên constraint hiện tại (Postgres auto-gen — thường
--    là posts_post_category_id_fkey, nhưng không đảm bảo tuyệt đối).
DO $$
DECLARE
    cname text;
BEGIN
    SELECT conname INTO cname
    FROM pg_constraint
    WHERE conrelid = 'posts'::regclass
      AND contype  = 'f'
      AND pg_get_constraintdef(oid) LIKE '%post_categories%';

    IF cname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE posts DROP CONSTRAINT %I', cname);
    END IF;
END $$;

ALTER TABLE posts
    ADD CONSTRAINT posts_post_category_id_fkey
    FOREIGN KEY (post_category_id) REFERENCES post_categories(id) ON DELETE RESTRICT;


-- 3) Đổi FK orders.partner_id sang RESTRICT
--    V7 đặt tên explicit `fk_orders_partner` — vẫn dùng DO block để phòng
--    trường hợp DB đã bị đổi thủ công.
DO $$
DECLARE
    cname text;
BEGIN
    SELECT conname INTO cname
    FROM pg_constraint
    WHERE conrelid = 'orders'::regclass
      AND contype  = 'f'
      AND pg_get_constraintdef(oid) LIKE '%partners%';

    IF cname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', cname);
    END IF;
END $$;

ALTER TABLE orders
    ADD CONSTRAINT fk_orders_partner
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE RESTRICT;
