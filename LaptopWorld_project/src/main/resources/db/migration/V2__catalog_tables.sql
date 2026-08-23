-- =============================================================
-- V2: Catalog — categories, brands, products, product_images,
--     collections, collection_product
-- =============================================================

-- ---------- categories ----------
CREATE TABLE categories (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    slug          VARCHAR(160) NOT NULL UNIQUE,
    parent_id     BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    description   TEXT,
    image         VARCHAR(500),
    spec_template JSONB,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order    INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_active    ON categories(is_active);

CREATE TRIGGER trg_categories_updated
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- brands ----------
CREATE TABLE brands (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(160) NOT NULL UNIQUE,
    logo        VARCHAR(500),
    description TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_brands_active ON brands(is_active);

CREATE TRIGGER trg_brands_updated
BEFORE UPDATE ON brands
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- products ----------
CREATE TABLE products (
    id                BIGSERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    slug              VARCHAR(280) NOT NULL UNIQUE,
    sku               VARCHAR(80)  UNIQUE,
    short_description VARCHAR(500),
    description       TEXT,
    price             NUMERIC(15,2) NOT NULL,
    sale_price        NUMERIC(15,2),
    brand_id          BIGINT REFERENCES brands(id)     ON DELETE SET NULL,
    category_id       BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    specs             JSONB,
    stock             INTEGER      NOT NULL DEFAULT 0,
    views             INTEGER      NOT NULL DEFAULT 0,
    is_featured       BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT products_price_nonneg      CHECK (price >= 0),
    CONSTRAINT products_sale_price_nonneg CHECK (sale_price IS NULL OR sale_price >= 0),
    CONSTRAINT products_sale_lte_price    CHECK (sale_price IS NULL OR sale_price <= price),
    CONSTRAINT products_stock_nonneg      CHECK (stock >= 0)
);
CREATE INDEX idx_products_category   ON products(category_id);
CREATE INDEX idx_products_brand      ON products(brand_id);
CREATE INDEX idx_products_active     ON products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_featured   ON products(is_featured) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_products_created_at ON products(created_at DESC);

CREATE TRIGGER trg_products_updated
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- product_images ----------
CREATE TABLE product_images (
    id         BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    path       VARCHAR(500) NOT NULL,
    alt        VARCHAR(255),
    sort_order INTEGER     NOT NULL DEFAULT 0,
    is_primary BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_images_product ON product_images(product_id);
-- Chỉ 1 ảnh primary/product
CREATE UNIQUE INDEX ux_product_images_one_primary
    ON product_images(product_id) WHERE is_primary = TRUE;

CREATE TRIGGER trg_product_images_updated
BEFORE UPDATE ON product_images
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- collections ----------
CREATE TABLE collections (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    slug         VARCHAR(160) NOT NULL UNIQUE,
    image        VARCHAR(500),
    description  TEXT,
    parent_id    BIGINT REFERENCES collections(id) ON DELETE SET NULL,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    show_on_home BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order   INTEGER     NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_collections_parent  ON collections(parent_id);
CREATE INDEX idx_collections_home    ON collections(show_on_home) WHERE is_active = TRUE;

CREATE TRIGGER trg_collections_updated
BEFORE UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- collection_product (pivot) ----------
CREATE TABLE collection_product (
    collection_id BIGINT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    product_id    BIGINT NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection_id, product_id)
);
CREATE INDEX idx_collection_product_product ON collection_product(product_id);
