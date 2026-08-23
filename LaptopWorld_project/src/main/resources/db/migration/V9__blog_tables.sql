-- =============================================================
-- V9: Blog + Banner
-- =============================================================

-- ---------- post_categories ----------
CREATE TABLE post_categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(160) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_post_categories_updated
BEFORE UPDATE ON post_categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- posts ----------
CREATE TABLE posts (
    id                BIGSERIAL PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    slug              VARCHAR(280) NOT NULL UNIQUE,
    post_category_id  BIGINT REFERENCES post_categories(id) ON DELETE SET NULL,
    author_id         BIGINT REFERENCES users(id)           ON DELETE SET NULL,
    image             VARCHAR(500),
    excerpt           TEXT,
    content           TEXT,
    is_published      BOOLEAN     NOT NULL DEFAULT FALSE,
    published_at      TIMESTAMPTZ,
    views             INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_posts_category  ON posts(post_category_id);
CREATE INDEX idx_posts_published ON posts(is_published, published_at DESC) WHERE is_published = TRUE;

CREATE TRIGGER trg_posts_updated
BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- banners ----------
CREATE TABLE banners (
    id         BIGSERIAL PRIMARY KEY,
    title      VARCHAR(255),
    image      VARCHAR(500) NOT NULL,
    link       VARCHAR(500),
    sort_order INTEGER     NOT NULL DEFAULT 0,
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    author_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_banners_active_sort ON banners(is_active, sort_order);

CREATE TRIGGER trg_banners_updated
BEFORE UPDATE ON banners
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
