-- =============================================================
-- V30: Bỏ danh mục "Chưa phân loại" (V29 tạo tạm thời)
--   - Tạo 2 danh mục mới: "Tin công nghệ" + "Đánh giá sản phẩm"
--   - Chia đều các post đang thuộc "Chưa phân loại" vào 2 danh mục mới
--     (theo id: id lẻ → cat A, id chẵn → cat B)
--   - Xoá danh mục "Chưa phân loại" (giờ đã rỗng, FK RESTRICT không chặn)
--
-- Admin có thể vào /admin/danh-muc-bai sau để đổi tên/slug 2 danh mục
-- mới cho khớp nội dung thực tế.
-- =============================================================

DO $$
DECLARE
    cat_tin_id     BIGINT;
    cat_review_id  BIGINT;
    uncat_id       BIGINT;
BEGIN
    -- 1) Tạo 2 danh mục mới (idempotent — ON CONFLICT ignore nếu đã có)
    INSERT INTO post_categories (name, slug, description)
    VALUES ('Tin công nghệ', 'tin-cong-nghe',
            'Tin tức, xu hướng và sự kiện công nghệ mới nhất.')
    ON CONFLICT (slug) DO NOTHING;

    INSERT INTO post_categories (name, slug, description)
    VALUES ('Đánh giá sản phẩm', 'danh-gia-san-pham',
            'Bài đánh giá chi tiết các mẫu laptop, phụ kiện, thiết bị.')
    ON CONFLICT (slug) DO NOTHING;

    SELECT id INTO cat_tin_id    FROM post_categories WHERE slug = 'tin-cong-nghe';
    SELECT id INTO cat_review_id FROM post_categories WHERE slug = 'danh-gia-san-pham';

    -- 2) Chuyển post đang ở "Chưa phân loại" — chia đều theo id
    SELECT id INTO uncat_id FROM post_categories WHERE slug = 'chua-phan-loai';

    IF uncat_id IS NOT NULL THEN
        -- id lẻ → Tin công nghệ, id chẵn → Đánh giá sản phẩm
        UPDATE posts
        SET post_category_id = CASE WHEN (id % 2) = 1 THEN cat_tin_id ELSE cat_review_id END
        WHERE post_category_id = uncat_id;

        -- 3) Xoá "Chưa phân loại" (chắc chắn không còn post nào tham chiếu)
        DELETE FROM post_categories WHERE id = uncat_id;

        RAISE NOTICE 'V30: đã chia post orphan vào 2 danh mục mới + xoá "Chưa phân loại"';
    ELSE
        RAISE NOTICE 'V30: không có danh mục "Chưa phân loại" — bỏ qua bước chuyển post';
    END IF;
END $$;
