-- =============================================================
-- V8: AI — chat sessions, chat messages, product embeddings (pgvector)
-- =============================================================

-- ---------- chat_sessions ----------
CREATE TABLE chat_sessions (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT REFERENCES users(id) ON DELETE CASCADE,  -- NULL = guest
    title             VARCHAR(255),                -- auto sinh từ câu đầu
    is_archived       BOOLEAN     NOT NULL DEFAULT FALSE,
    last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_sessions_user     ON chat_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_chat_sessions_activity ON chat_sessions(last_activity_at DESC);

CREATE TRIGGER trg_chat_sessions_updated
BEFORE UPDATE ON chat_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- chat_messages ----------
CREATE TABLE chat_messages (
    id                BIGSERIAL PRIMARY KEY,
    session_id        BIGINT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role              VARCHAR(20) NOT NULL,        -- 'user' | 'assistant' | 'system' | 'tool'
    content           TEXT,
    tool_name         VARCHAR(80),                 -- khi role=tool: tên function
    tool_call_id      VARCHAR(120),
    tool_input        JSONB,
    tool_output       JSONB,
    tokens_input      INTEGER,
    tokens_output     INTEGER,
    response_time_ms  INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chat_msg_role_check CHECK (role IN ('user','assistant','system','tool'))
);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);


-- ---------- product_embeddings ----------
-- 768 dim khớp với Gemini `text-embedding-004`.
-- Nếu đổi model (VD 1536 của text-embedding-3-small OpenAI) phải viết migration mới.
CREATE TABLE product_embeddings (
    product_id  BIGINT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    embedding   vector(768) NOT NULL,
    source_hash CHAR(64)    NOT NULL,             -- SHA256 hex của text đã embed
    embedded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index HNSW tạo ở V11 để đảm bảo có dữ liệu trước (mặc dù ở đây bảng rỗng cũng OK).
