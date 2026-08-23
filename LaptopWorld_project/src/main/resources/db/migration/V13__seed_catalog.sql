-- =============================================================
-- V13: Seed categories + brands + spec_template (chuyen tu reference)
-- Products seed o V14 (Sprint 3D) sau khi upload lam xong.
-- =============================================================

-- ---------- Categories ----------
-- 5 root + 6 sub (thuoc "Phu Kien") + 1 root "May Cu"
INSERT INTO categories (id, name, slug, parent_id, description, is_active, sort_order, spec_template) VALUES
    (1, 'Điện thoại', 'dien-thoai', NULL, 'Điện thoại di động các hãng', TRUE, 1,
     '[
        {"key":"screen",   "label":"Màn hình",   "type":"text", "required":true},
        {"key":"chip",     "label":"Chip",       "type":"text", "required":true},
        {"key":"ram",      "label":"RAM",        "type":"text", "required":true},
        {"key":"storage",  "label":"Bộ nhớ",     "type":"text", "required":true},
        {"key":"camera",   "label":"Camera",     "type":"text"},
        {"key":"battery",  "label":"Pin",        "type":"text"},
        {"key":"os",       "label":"Hệ điều hành","type":"text"}
     ]'::jsonb),

    (2, 'Laptop', 'laptop', NULL, 'Laptop văn phòng, gaming, đồ họa', TRUE, 2,
     '[
        {"key":"cpu",         "label":"CPU",          "type":"text", "required":true},
        {"key":"ram",         "label":"RAM",          "type":"text", "required":true},
        {"key":"storage",     "label":"Ổ cứng",       "type":"text", "required":true},
        {"key":"gpu",         "label":"Card đồ họa",  "type":"text"},
        {"key":"screen_size", "label":"Kích thước màn hình", "type":"text", "required":true},
        {"key":"screen_hz",   "label":"Tần số quét",  "type":"text"},
        {"key":"weight",      "label":"Trọng lượng",  "type":"text"},
        {"key":"battery",     "label":"Pin",          "type":"text"},
        {"key":"os",          "label":"Hệ điều hành", "type":"text"}
     ]'::jsonb),

    (3, 'Tablet', 'tablet', NULL, 'Máy tính bảng', TRUE, 3,
     '[
        {"key":"screen",  "label":"Màn hình",   "type":"text", "required":true},
        {"key":"chip",    "label":"Chip",       "type":"text", "required":true},
        {"key":"ram",     "label":"RAM",        "type":"text"},
        {"key":"storage", "label":"Bộ nhớ",     "type":"text"},
        {"key":"battery", "label":"Pin",        "type":"text"},
        {"key":"os",      "label":"Hệ điều hành","type":"text"}
     ]'::jsonb),

    (4, 'Smartwatch', 'smartwatch', NULL, 'Đồng hồ thông minh', TRUE, 4,
     '[
        {"key":"screen",     "label":"Màn hình",   "type":"text"},
        {"key":"battery",    "label":"Pin",        "type":"text"},
        {"key":"connectivity","label":"Kết nối",   "type":"text"},
        {"key":"waterproof", "label":"Chống nước", "type":"text"}
     ]'::jsonb),

    (5, 'Phụ kiện', 'phu-kien', NULL, 'Tai nghe, chuột, bàn phím, sạc, loa', TRUE, 5, NULL),

    (6, 'Tai nghe',       'tai-nghe',       5, 'Tai nghe không dây, có dây', TRUE, 0,
     '[
        {"key":"driver",      "label":"Driver",      "type":"text"},
        {"key":"battery",     "label":"Pin",         "type":"text"},
        {"key":"connectivity","label":"Kết nối",     "type":"text"},
        {"key":"noise_cancel","label":"Chống ồn",    "type":"boolean"}
     ]'::jsonb),

    (7, 'Sạc nhanh',      'sac-nhanh',      5, 'Củ sạc, cáp sạc nhanh', TRUE, 0,
     '[
        {"key":"wattage",     "label":"Công suất",   "type":"text", "required":true},
        {"key":"connector",   "label":"Đầu cắm",     "type":"text"},
        {"key":"standard",    "label":"Chuẩn sạc",   "type":"text"}
     ]'::jsonb),

    (8, 'Chuột',          'chuot',          5, 'Chuột văn phòng, gaming', TRUE, 0,
     '[
        {"key":"dpi",         "label":"DPI",         "type":"text"},
        {"key":"connectivity","label":"Kết nối",     "type":"text"},
        {"key":"buttons",     "label":"Số nút",      "type":"text"},
        {"key":"weight",      "label":"Trọng lượng", "type":"text"}
     ]'::jsonb),

    (9, 'Bàn phím',       'ban-phim',       5, 'Bàn phím cơ, silent', TRUE, 0,
     '[
        {"key":"switch",      "label":"Loại switch", "type":"text"},
        {"key":"layout",      "label":"Layout",      "type":"text"},
        {"key":"connectivity","label":"Kết nối",     "type":"text"},
        {"key":"backlight",   "label":"Đèn LED",     "type":"text"}
     ]'::jsonb),

    (10,'Sạc dự phòng',   'sac-du-phong',   5, 'Pin dự phòng', TRUE, 0,
     '[
        {"key":"capacity",    "label":"Dung lượng",  "type":"text", "required":true},
        {"key":"wattage",     "label":"Công suất ra","type":"text"},
        {"key":"ports",       "label":"Cổng ra",     "type":"text"}
     ]'::jsonb),

    (11,'Loa bluetooth',  'loa-bluetooth',  5, 'Loa di động', TRUE, 0,
     '[
        {"key":"output",      "label":"Công suất",   "type":"text"},
        {"key":"battery",     "label":"Pin",         "type":"text"},
        {"key":"bluetooth",   "label":"Bluetooth",   "type":"text"},
        {"key":"waterproof",  "label":"Chống nước",  "type":"text"}
     ]'::jsonb),

    (12,'Máy cũ - giá tốt','may-cu',         NULL, 'Sản phẩm đã qua sử dụng, chất lượng cao', TRUE, 6, NULL);

-- Update sequence
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));


-- ---------- Brands ----------
INSERT INTO brands (id, name, slug, is_active) VALUES
    (1, 'Samsung',      'samsung',      TRUE),
    (2, 'Apple',        'apple',        TRUE),
    (3, 'OPPO',         'oppo',         TRUE),
    (4, 'Xiaomi',       'xiaomi',       TRUE),
    (5, 'Google',       'google',       TRUE),
    (6, 'Huawei',       'huawei',       TRUE),
    (7, 'Sony',         'sony',         TRUE),
    (8, 'Asus',         'asus',         TRUE),
    (9, 'MSI',          'msi',          TRUE),
    (10,'Dell',         'dell',         TRUE),
    (11,'HP',           'hp',           TRUE),
    (12,'Microsoft',    'microsoft',    TRUE),
    (13,'Lenovo',       'lenovo',       TRUE),
    (14,'JBL',          'jbl',          TRUE),
    (15,'Anker',        'anker',        TRUE),
    (16,'RAVPower',     'ravpower',     TRUE),
    (17,'Logitech',     'logitech',     TRUE),
    (18,'Razer',        'razer',        TRUE),
    (19,'Corsair',      'corsair',      TRUE),
    (20,'SteelSeries',  'steelseries',  TRUE),
    (21,'Akko',         'akko',         TRUE),
    (22,'Keychron',     'keychron',     TRUE),
    (23,'Energizer',    'energizer',    TRUE),
    (24,'Baseus',       'baseus',       TRUE),
    (25,'Bose',         'bose',         TRUE),
    (26,'Marshall',     'marshall',     TRUE);

SELECT setval('brands_id_seq', (SELECT MAX(id) FROM brands));
