-- Chạy tự động một lần khi container PostgreSQL init lần đầu.
-- Bật các extension cần thiết cho LaptopWorld.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
