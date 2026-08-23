-- =============================================================
-- V6: Review
-- =============================================================

CREATE TABLE reviews (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating      SMALLINT NOT NULL,
    comment     TEXT,
    images      JSONB,                          -- mảng URL: ["/uploads/xxx.jpg", ...]
    is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
    admin_reply TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reviews_rating_range     CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ux_reviews_user_product  UNIQUE (user_id, product_id)
);
CREATE INDEX idx_reviews_product_visible
    ON reviews(product_id) WHERE is_hidden = FALSE;

CREATE TRIGGER trg_reviews_updated
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
