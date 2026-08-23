-- =============================================================
-- V18: Partner.code (mã ĐVVC) — dùng để sinh tracking number.
--      Format tracking: {code}{yyMMdd}{5digits}  (VD: GHN26081912345)
-- =============================================================

ALTER TABLE partners
    ADD COLUMN code VARCHAR(10);

-- Backfill code cho các partner hiện có: 3 ký tự in hoa từ tên (unaccent).
-- - "Nhà Cung Cấp X"   → NCC
-- - "Giao Hàng Nhanh"  → GHN
-- - "Viettel Post"     → VP  (2 từ → 2 chữ; nếu dài thì cắt còn 3)
UPDATE partners
SET code = UPPER(
    LEFT(
        REGEXP_REPLACE(
            (
                SELECT string_agg(LEFT(w, 1), '')
                FROM regexp_split_to_table(immutable_unaccent(name), '\s+') AS w
                WHERE LENGTH(w) > 0
            ),
            '[^A-Za-z]', '', 'g'
        ),
        5
    )
)
WHERE code IS NULL;

-- Fallback nếu code vẫn null hoặc rỗng (edge case) — dùng 'PT' + id
UPDATE partners
SET code = 'PT' || id
WHERE code IS NULL OR LENGTH(code) = 0;

-- Sau khi backfill, đặt NOT NULL + UNIQUE
ALTER TABLE partners
    ALTER COLUMN code SET NOT NULL;

ALTER TABLE partners
    ADD CONSTRAINT partners_code_unique UNIQUE (code);

CREATE INDEX idx_partners_code ON partners(code);
