-- =============================================================
-- V11: Advanced indexes — full-text, JSONB, trigram, HNSW vector
-- =============================================================

-- ---------- Full-text search cho products (không dấu tiếng Việt) ----------
-- Search: WHERE to_tsvector('simple', immutable_unaccent(name || ' ' || coalesce(short_description,'')))
--            @@ plainto_tsquery('simple', immutable_unaccent(:q))
CREATE INDEX idx_products_fts
    ON products
    USING GIN (
        to_tsvector('simple',
            immutable_unaccent(name || ' ' || COALESCE(short_description, ''))
        )
    );

-- ---------- Fuzzy / partial name search (trigram) ----------
CREATE INDEX idx_products_name_trgm
    ON products
    USING GIN (immutable_unaccent(name) gin_trgm_ops);

-- ---------- Filter theo specs JSONB ----------
-- Ví dụ query: WHERE specs @> '{"cpu":"i7-13700H"}'
CREATE INDEX idx_products_specs_gin
    ON products
    USING GIN (specs jsonb_path_ops);


-- ---------- Vector similarity — HNSW ----------
-- HNSW nhanh, không cần train, phù hợp dataset < 1M rows.
-- vector_cosine_ops: dùng khi embed đã normalize (Gemini text-embedding-004 mặc định normalize).
CREATE INDEX idx_product_embeddings_hnsw
    ON product_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);


-- ---------- Composite indexes cho query thường dùng ----------
-- User xem danh sách đơn của mình sắp xếp mới nhất
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- Review theo product không bị ẩn, mới nhất
CREATE INDEX idx_reviews_product_created
    ON reviews(product_id, created_at DESC) WHERE is_hidden = FALSE;

-- Sản phẩm active theo category (list catalog)
CREATE INDEX idx_products_category_active_created
    ON products(category_id, created_at DESC)
    WHERE is_active = TRUE AND deleted_at IS NULL;
