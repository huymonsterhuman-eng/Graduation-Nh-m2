-- =============================================================
-- V20: Expand permissions cho Sprint 9G-perm
-- Bo 15 permission le te o V12, seed lai 30 permission chi tiet
-- theo mau webthegioididong (Spatie Permission), chia 4 nhom.
--
-- ADMIN role bypass moi check permission (handle o tang Java @PreAuthorize).
-- STAFF role duoc gan 11 permission co ban cho nhan vien ban hang mau.
-- CUSTOMER khong co permission admin nao.
--
-- Idempotent: dung TRUNCATE + INSERT (Flyway chi chay 1 lan nhung
-- giu code safe neu can rebuild DB).
-- =============================================================

-- Buoc 1: Xoa toan bo mapping role-permission cu (khong dung tuc, chi truncate junction)
TRUNCATE TABLE role_permissions RESTART IDENTITY;

-- Buoc 2: Xoa toan bo permission cu (khong con reference nao sau khi truncate junction)
TRUNCATE TABLE permissions RESTART IDENTITY CASCADE;


-- Buoc 3: Seed 30 permission moi (chia 4 nhom)
-- Nhom 1: He thong (3)
INSERT INTO permissions (code, description) VALUES
    ('access_admin',           'Truy cap trang Quan tri'),
    ('manage_roles',           'Quan ly Vai tro & Phan quyen'),
    ('view_reports',           'Xem Bao cao & Thong ke (Dashboard)');

-- Nhom 2: San pham & Noi dung (11)
INSERT INTO permissions (code, description) VALUES
    ('view_products',          'Xem danh sach san pham'),
    ('create_products',        'Them san pham moi'),
    ('edit_products',          'Sua thong tin san pham'),
    ('delete_products',        'Xoa san pham'),
    ('view_categories',        'Xem danh muc'),
    ('manage_categories',      'Quan ly danh muc'),
    ('view_brands',            'Xem thuong hieu'),
    ('manage_brands',          'Quan ly thuong hieu'),
    ('manage_collections',     'Quan ly bo suu tap'),
    ('manage_banners',         'Quan ly banner trang chu'),
    ('manage_posts',           'Quan ly bai viet blog + danh muc bai');

-- Nhom 3: Kho & Van chuyen (5)
INSERT INTO permissions (code, description) VALUES
    ('view_inventory',         'Xem ton kho + batches FIFO'),
    ('view_partners',          'Xem doi tac (NCC + DVVC)'),
    ('manage_partners',        'Quan ly doi tac'),
    ('manage_goods_receipt',   'Quan ly phieu nhap kho'),
    ('manage_goods_issue',     'Quan ly phieu xuat kho (duyet/tu choi)');

-- Nhom 4: Ban hang & Khach hang (11)
INSERT INTO permissions (code, description) VALUES
    ('view_orders',            'Xem danh sach don hang'),
    ('manage_orders',          'Xu ly don hang (xac nhan, huy, chuyen kho)'),
    ('create_orders_manual',   'Tao don thay khach (admin)'),
    ('view_vouchers',          'Xem voucher'),
    ('manage_vouchers',        'Quan ly voucher'),
    ('view_reviews',           'Xem danh gia'),
    ('manage_reviews',         'Quan ly danh gia (an, phan hoi, xoa)'),
    ('view_users',             'Xem danh sach khach hang'),
    ('manage_users',           'Quan ly khach hang (khoa/mo tai khoan)'),
    ('assign_user_roles',      'Gan vai tro cho khach hang'),
    ('manage_ai_embedding',    'Quan ly tro ly AI: re-embed san pham + xem lich su chat');


-- Buoc 4: Gan tat ca 30 permissions cho ADMIN
-- (Mac du @PreAuthorize da bypass, van seed cho consistent + de query khi can)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'ADMIN';


-- Buoc 5: Gan 11 permission co ban cho STAFF (mau nhan vien ban hang)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'STAFF'
  AND p.code IN (
    'access_admin',
    'view_products',
    'edit_products',
    'view_categories',
    'view_brands',
    'view_orders',
    'manage_orders',
    'view_reviews',
    'manage_reviews',
    'view_vouchers',
    'view_partners'
  );

-- CUSTOMER khong duoc gan permission admin nao (khong co INSERT).
