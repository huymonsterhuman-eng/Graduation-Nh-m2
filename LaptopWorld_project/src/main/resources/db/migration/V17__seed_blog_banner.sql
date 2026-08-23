-- =============================================================
-- V17: Seed banner + bổ sung post categories và posts mẫu
-- Idempotent với ON CONFLICT DO NOTHING để không dính data test từ Sprint 7B
-- =============================================================

-- ---------- Post categories (thêm 4 danh mục chuẩn, bỏ qua nếu slug đã có) ----------
INSERT INTO post_categories (name, slug, description) VALUES
    ('Tin công nghệ',        'tin-cong-nghe',      'Cập nhật xu hướng công nghệ mới nhất'),
    ('Đánh giá sản phẩm',    'danh-gia-san-pham',  'Bài đánh giá chi tiết laptop, điện thoại'),
    ('Thủ thuật',            'thu-thuat',          'Mẹo hay khi sử dụng thiết bị'),
    ('Khuyến mãi',           'khuyen-mai',         'Chương trình sale và ưu đãi mới nhất')
ON CONFLICT (slug) DO NOTHING;

-- ---------- Posts mẫu (5 bài, all published) ----------
WITH admin_user AS (SELECT id FROM users ORDER BY id ASC LIMIT 1)
INSERT INTO posts (title, slug, post_category_id, author_id, image, excerpt, content,
                   is_published, published_at, views)
SELECT
    t.title, t.slug,
    (SELECT id FROM post_categories WHERE slug = t.cat_slug),
    (SELECT id FROM admin_user),
    t.image, t.excerpt, t.content,
    TRUE, NOW() - (t.days_ago || ' days')::interval, t.views
FROM (VALUES
    ('So sánh Samsung Galaxy S23 Ultra và iPhone 15 Pro Max',
     'so-sanh-s23-ultra-vs-iphone-15-pro-max',
     'danh-gia-san-pham',
     '/uploads/blog/mock-1.jpg',
     'Bài so sánh chi tiết 2 flagship đình đám 2024 — camera, hiệu năng, pin, giá cả.',
     '<p>Samsung Galaxy S23 Ultra và iPhone 15 Pro Max là hai flagship đáng chú ý nhất năm nay...</p><p>Về camera, cả hai đều sở hữu công nghệ hàng đầu...</p>',
     3, 152),

    ('Top 5 laptop gaming đáng mua nhất 2024',
     'top-5-laptop-gaming-2024',
     'danh-gia-san-pham',
     '/uploads/blog/mock-2.jpg',
     'Điểm danh 5 mẫu laptop gaming cấu hình mạnh, giá hợp lý.',
     '<p>Nếu bạn đang tìm kiếm một chiếc laptop gaming cho năm 2024...</p><p>1. ASUS ROG Zephyrus G14 — nhỏ gọn nhưng mạnh mẽ...</p>',
     7, 89),

    ('Cách kéo dài tuổi thọ pin laptop hiệu quả',
     'cach-keo-dai-tuoi-tho-pin-laptop',
     'thu-thuat',
     '/uploads/blog/mock-3.jpg',
     '5 mẹo đơn giản giúp pin laptop bền hơn theo thời gian.',
     '<p>Pin laptop là bộ phận dễ hư hỏng nhất...</p><p>Mẹo 1: Không để pin cạn kiệt về 0%...</p>',
     10, 234),

    ('Ưu đãi tháng 8: giảm đến 30% cho laptop văn phòng',
     'uu-dai-thang-8-laptop-van-phong',
     'khuyen-mai',
     '/uploads/blog/mock-4.jpg',
     'Chương trình sale lớn nhất năm cho laptop văn phòng — chỉ trong tháng 8.',
     '<p>LaptopWorld hân hạnh mang đến chương trình khuyến mãi cực khủng...</p><p>Áp dụng cho các mẫu HP Pavilion, Dell Inspiron...</p>',
     1, 45),

    ('Xu hướng AI trong smartphone năm 2024',
     'xu-huong-ai-trong-smartphone-2024',
     'tin-cong-nghe',
     '/uploads/blog/mock-5.jpg',
     'AI trên điện thoại đang định hình lại trải nghiệm người dùng.',
     '<p>Năm 2024 chứng kiến sự bùng nổ của AI trên smartphone...</p><p>Từ Google Pixel 8 với Magic Editor đến Samsung Galaxy S24 Ultra với Galaxy AI...</p>',
     5, 178)
) AS t(title, slug, cat_slug, image, excerpt, content, days_ago, views)
ON CONFLICT (slug) DO NOTHING;

-- ---------- Banners (3 banner mẫu cho trang chủ) ----------
WITH admin_user AS (SELECT id FROM users ORDER BY id ASC LIMIT 1)
INSERT INTO banners (title, image, link, sort_order, is_active, author_id) VALUES
    ('Sale iPhone 15 series — giảm sốc 5 triệu',
     '/uploads/banners/mock-iphone-15.jpg',
     '/products?keyword=iphone+15',
     1, TRUE, (SELECT id FROM admin_user)),

    ('Laptop gaming ASUS ROG — ưu đãi tháng 8',
     '/uploads/banners/mock-asus-rog.jpg',
     '/products?keyword=asus+rog',
     2, TRUE, (SELECT id FROM admin_user)),

    ('Free ship toàn quốc cho đơn từ 5 triệu',
     '/uploads/banners/mock-freeship.jpg',
     '/khuyen-mai/freeship',
     3, TRUE, (SELECT id FROM admin_user));
