-- =============================================================
-- V1: Extensions + shared trigger functions
-- =============================================================

-- Extensions (idempotent — nếu docker-entrypoint đã chạy thì bỏ qua)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Function chung: tự cập nhật cột updated_at khi UPDATE.
-- Dùng bởi mọi trigger BEFORE UPDATE trong các V tiếp theo.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function unaccent immutable wrapper — cần cho index expression.
-- (unaccent gốc là STABLE, không dùng được trong index.)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
    SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;
