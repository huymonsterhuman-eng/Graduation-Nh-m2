-- V33: Chatbot AI chỉ phục vụ khách đã đăng nhập.
-- (1) Xoá toàn bộ phiên guest hiện tại — cascade dọn chat_messages theo FK.
-- (2) Siết user_id thành NOT NULL để đảm bảo mọi phiên sau này đều có chủ.
-- (3) Drop partial index cũ "chỉ index khi user_id NOT NULL" vì giờ mọi row đều NOT NULL.

DELETE FROM chat_sessions WHERE user_id IS NULL;

ALTER TABLE chat_sessions
    ALTER COLUMN user_id SET NOT NULL;

DROP INDEX IF EXISTS idx_chat_sessions_user;
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
