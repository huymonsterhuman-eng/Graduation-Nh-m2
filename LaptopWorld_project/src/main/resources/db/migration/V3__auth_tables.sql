-- =============================================================
-- V3: Auth — users, addresses, roles, permissions, refresh_tokens
-- =============================================================

-- ---------- users ----------
CREATE TABLE users (
    id                BIGSERIAL PRIMARY KEY,
    username          VARCHAR(60)  NOT NULL UNIQUE,
    email             VARCHAR(150) UNIQUE,
    email_verified_at TIMESTAMPTZ,
    password          VARCHAR(255) NOT NULL,       -- BCrypt hash
    full_name         VARCHAR(150),
    phone             VARCHAR(20),
    avatar            VARCHAR(500),
    gender            VARCHAR(10),
    birthday          DATE,
    status            VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT users_status_check CHECK (status IN ('active','banned','unverified')),
    CONSTRAINT users_gender_check CHECK (gender IS NULL OR gender IN ('male','female','other'))
);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_phone  ON users(phone) WHERE phone IS NOT NULL;

CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- addresses ----------
CREATE TABLE addresses (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    phone       VARCHAR(20)  NOT NULL,
    address     VARCHAR(500) NOT NULL,
    ward        VARCHAR(100),
    district    VARCHAR(100),
    province    VARCHAR(100),
    is_default  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addresses_user ON addresses(user_id);
-- Mỗi user chỉ 1 default address
CREATE UNIQUE INDEX ux_addresses_one_default
    ON addresses(user_id) WHERE is_default = TRUE;

CREATE TRIGGER trg_addresses_updated
BEFORE UPDATE ON addresses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- roles ----------
CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,     -- 'ADMIN', 'STAFF', 'CUSTOMER'
    description VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_roles_updated
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- permissions ----------
CREATE TABLE permissions (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(80)  NOT NULL UNIQUE,     -- 'product.create', 'order.update.status'
    description VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_permissions_updated
BEFORE UPDATE ON permissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- user_roles (pivot) ----------
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);


-- ---------- role_permissions (pivot) ----------
CREATE TABLE role_permissions (
    role_id       BIGINT NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX idx_role_permissions_perm ON role_permissions(permission_id);


-- ---------- refresh_tokens ----------
CREATE TABLE refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) NOT NULL UNIQUE,        -- SHA hash của token gốc
    expires_at TIMESTAMPTZ  NOT NULL,
    revoked_at TIMESTAMPTZ,
    user_agent VARCHAR(500),
    ip         VARCHAR(45),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user      ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires   ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;
