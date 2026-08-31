-- V31: Thêm feedback (👍/👎) cho tin nhắn của trợ lý AI.
-- Cho phép admin lọc phiên có phản hồi tiêu cực để xem bot trả lời sai ở đâu.
-- feedback: 1 = like, -1 = dislike, NULL = chưa đánh giá.
ALTER TABLE chat_messages
    ADD COLUMN feedback SMALLINT NULL;

-- Index partial: chỉ index các message có feedback (đa số message không có → tiết kiệm).
CREATE INDEX ix_chat_messages_feedback
    ON chat_messages (session_id, feedback)
    WHERE feedback IS NOT NULL;
