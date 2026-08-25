-- ==================================================================
-- V21 — Seed demo data for graduation demo
-- ==================================================================
-- 5 user thuong + 5 voucher dang chay + 10 order rai qua nhieu status
-- Idempotent: dung ON CONFLICT DO NOTHING theo natural key (username, code)
--
-- Muc dich: co du data de demo hoi dong bao ve mà không phải bấm tay
-- tao user/voucher/order trong luc demo.
-- ==================================================================

-- ------------------ 1. 5 USER THUONG ------------------
-- Password: admin123 (BCrypt cost 10 — cung hash voi admin)
-- Roles: gan CUSTOMER (role id=3)

INSERT INTO users (username, email, password, full_name, phone, status, email_verified_at,
                   created_at, updated_at)
VALUES
  ('user1', 'user1@laptopworld.local',
   '$2b$10$GlWLGVnAE1GLGoQ7zmhDgO.aoz0MNsjaTQzsx.qVYXJuWhYPBgUui',
   'Nguyễn Văn A', '0901111111', 'active', NOW(), NOW(), NOW()),
  ('user2', 'user2@laptopworld.local',
   '$2b$10$GlWLGVnAE1GLGoQ7zmhDgO.aoz0MNsjaTQzsx.qVYXJuWhYPBgUui',
   'Trần Thị B', '0902222222', 'active', NOW(), NOW(), NOW()),
  ('user3', 'user3@laptopworld.local',
   '$2b$10$GlWLGVnAE1GLGoQ7zmhDgO.aoz0MNsjaTQzsx.qVYXJuWhYPBgUui',
   'Lê Văn C', '0903333333', 'active', NOW(), NOW(), NOW()),
  ('user4', 'user4@laptopworld.local',
   '$2b$10$GlWLGVnAE1GLGoQ7zmhDgO.aoz0MNsjaTQzsx.qVYXJuWhYPBgUui',
   'Phạm Thị D', '0904444444', 'active', NOW(), NOW(), NOW()),
  ('user5', 'user5@laptopworld.local',
   '$2b$10$GlWLGVnAE1GLGoQ7zmhDgO.aoz0MNsjaTQzsx.qVYXJuWhYPBgUui',
   'Hoàng Văn E', '0905555555', 'active', NOW(), NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- Gan role CUSTOMER cho user1..user5
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username IN ('user1', 'user2', 'user3', 'user4', 'user5')
  AND r.name = 'CUSTOMER'
ON CONFLICT DO NOTHING;

-- ------------------ 2. 5 VOUCHER DANG CHAY ------------------
-- Mix fixed + percent. Started = 7 ngay truoc, expires = 90 ngay sau.

INSERT INTO vouchers (code, name, type, discount_amount, min_order_value, max_discount,
                      started_at, expires_at, usage_limit, is_active,
                      created_at, updated_at)
VALUES
  ('WELCOME10', 'Giảm 10% cho đơn đầu tiên',
   'percent', 10, 0, 100000,
   NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days', 100, TRUE,
   NOW(), NOW()),
  ('FLASH50K', 'Giảm 50k cho đơn từ 500k',
   'fixed', 50000, 500000, NULL,
   NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days', 200, TRUE,
   NOW(), NOW()),
  ('LAPTOP200K', 'Giảm 200k cho đơn laptop từ 10 triệu',
   'fixed', 200000, 10000000, NULL,
   NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days', 50, TRUE,
   NOW(), NOW()),
  ('FREESHIP', 'Miễn phí ship (giảm 30k)',
   'fixed', 30000, 200000, NULL,
   NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days', NULL, TRUE,
   NOW(), NOW()),
  ('NEWUSER15', 'Giảm 15% tối đa 200k',
   'percent', 15, 300000, 200000,
   NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days', 300, TRUE,
   NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ------------------ 3. 10 ORDER RAI QUA CAC STATUS ------------------
-- Chi seed neu chua co order nao (avoid duplicate khi rerun).
-- Order code format ORD-YYYYMMDD-XXX de khac voi order that.

DO $$
DECLARE
  v_user1_id BIGINT;
  v_user2_id BIGINT;
  v_user3_id BIGINT;
  v_user4_id BIGINT;
  v_user5_id BIGINT;
  v_product_id BIGINT;
  v_product_name TEXT;
  v_product_price NUMERIC;
  v_new_order_id BIGINT;
BEGIN
  -- Skip neu da co order demo (theo code ORD-DEMO-*)
  IF EXISTS (SELECT 1 FROM orders WHERE code LIKE 'ORD-DEMO-%') THEN
    RAISE NOTICE 'V21: Order demo da ton tai — skip seed order';
    RETURN;
  END IF;

  SELECT id INTO v_user1_id FROM users WHERE username = 'user1';
  SELECT id INTO v_user2_id FROM users WHERE username = 'user2';
  SELECT id INTO v_user3_id FROM users WHERE username = 'user3';
  SELECT id INTO v_user4_id FROM users WHERE username = 'user4';
  SELECT id INTO v_user5_id FROM users WHERE username = 'user5';

  -- Lay 1 SP bat ky con hang de gan cho tat ca order demo
  SELECT id, name, price INTO v_product_id, v_product_name, v_product_price
  FROM products WHERE is_active = TRUE AND stock >= 10
  ORDER BY id LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE NOTICE 'V21: Khong co SP nao con hang — skip seed order';
    RETURN;
  END IF;

  -- Helper: tao 1 order + 1 order_detail
  -- Loop 10 order voi status va user khac nhau
  FOR i IN 1..10 LOOP
    DECLARE
      v_status TEXT;
      v_user_id BIGINT;
      v_qty INT := 1 + (i % 3); -- 1, 2, 3, 1, 2, 3, ...
      v_subtotal NUMERIC;
      v_total NUMERIC;
      v_delivered_at TIMESTAMPTZ := NULL;
      v_cancelled_at TIMESTAMPTZ := NULL;
      v_preparing_at TIMESTAMPTZ := NULL;
    BEGIN
      -- Rai user
      v_user_id := CASE (i - 1) % 5
                     WHEN 0 THEN v_user1_id
                     WHEN 1 THEN v_user2_id
                     WHEN 2 THEN v_user3_id
                     WHEN 3 THEN v_user4_id
                     ELSE       v_user5_id
                   END;

      -- Rai status: 3 delivered / 2 shipping / 2 preparing / 1 confirmed / 1 pending / 1 cancelled
      v_status := CASE i
                    WHEN 1 THEN 'delivered'
                    WHEN 2 THEN 'delivered'
                    WHEN 3 THEN 'delivered'
                    WHEN 4 THEN 'shipping'
                    WHEN 5 THEN 'shipping'
                    WHEN 6 THEN 'preparing'
                    WHEN 7 THEN 'preparing'
                    WHEN 8 THEN 'confirmed'
                    WHEN 9 THEN 'pending'
                    ELSE       'cancelled'
                  END;

      IF v_status = 'delivered' THEN v_delivered_at := NOW() - INTERVAL '3 days'; END IF;
      IF v_status = 'cancelled' THEN v_cancelled_at := NOW() - INTERVAL '1 day';  END IF;
      IF v_status IN ('preparing', 'shipping', 'delivered') THEN
        v_preparing_at := NOW() - INTERVAL '5 days';
      END IF;

      v_subtotal := v_product_price * v_qty;
      v_total := v_subtotal + 30000; -- them shipping fee

      INSERT INTO orders (code, user_id, subtotal, discount_amount, shipping_fee, total,
                          shipping_name, shipping_phone, shipping_address, shipping_method,
                          status, payment_method, payment_status,
                          delivered_at, cancelled_at, preparing_at,
                          created_at, updated_at)
      VALUES (
        'ORD-DEMO-' || LPAD(i::TEXT, 3, '0'),
        v_user_id,
        v_subtotal, 0, 30000, v_total,
        'Khách demo ' || i, '090' || LPAD(i::TEXT, 7, '0'),
        'Số ' || i || ' đường Nguyễn Trãi, Phường 5, Quận 5, TP.HCM',
        'standard',
        v_status, 'cod',
        CASE WHEN v_status = 'delivered' THEN 'paid' ELSE 'unpaid' END,
        v_delivered_at, v_cancelled_at, v_preparing_at,
        NOW() - INTERVAL '7 days' + (i * INTERVAL '1 hour'),
        NOW()
      )
      RETURNING id INTO v_new_order_id;

      INSERT INTO order_details (order_id, product_id, product_name, quantity, price_at_purchase,
                                 created_at, updated_at)
      VALUES (v_new_order_id, v_product_id, v_product_name, v_qty, v_product_price,
              NOW(), NOW());

      -- Voi 2 order status=preparing → tao them goods_issue pending
      IF v_status = 'preparing' THEN
        INSERT INTO goods_issues (code, order_id, type, author_id, status, note,
                                  created_at, updated_at)
        VALUES ('GI-DEMO-' || LPAD(i::TEXT, 3, '0'),
                v_new_order_id, 'auto',
                (SELECT id FROM users WHERE username = 'admin'),
                'pending', 'Phiếu xuất demo — chờ kho duyệt',
                NOW(), NOW());
      END IF;
    END;
  END LOOP;

  RAISE NOTICE 'V21: Đã seed 5 user + 5 voucher + 10 order demo thành công';
END $$;
