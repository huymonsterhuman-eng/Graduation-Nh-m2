package com.example.LaptopWorld_project.ai.repository;

import com.example.LaptopWorld_project.ai.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    /** Lấy N message gần nhất — dùng cho context RAG. */
    List<ChatMessage> findTop20BySessionIdOrderByCreatedAtDesc(Long sessionId);

    /** Đếm tổng message của 1 session — dùng để phát hiện câu đầu tiên (auto-title). */
    long countBySessionId(Long sessionId);

    /** Count message theo từng session — dùng cho list admin (tránh N+1). */
    @Query("SELECT cm.session.id AS sid, COUNT(cm) AS cnt FROM ChatMessage cm " +
           "WHERE cm.session.id IN :ids GROUP BY cm.session.id")
    List<SessionMessageCount> countBySessionIds(@Param("ids") Collection<Long> ids);

    interface SessionMessageCount {
        Long getSid();
        Long getCnt();
    }

    /**
     * Aggregate số 👍 / 👎 cho mỗi session — dùng cho list admin (tránh N+1).
     * Chỉ đếm message của assistant có feedback ≠ null.
     */
    @Query("SELECT cm.session.id AS sid, " +
           "SUM(CASE WHEN cm.feedback = 1  THEN 1 ELSE 0 END) AS likes, " +
           "SUM(CASE WHEN cm.feedback = -1 THEN 1 ELSE 0 END) AS dislikes " +
           "FROM ChatMessage cm " +
           "WHERE cm.session.id IN :ids AND cm.feedback IS NOT NULL " +
           "GROUP BY cm.session.id")
    List<SessionFeedbackCount> feedbackCountsBySessionIds(@Param("ids") Collection<Long> ids);

    interface SessionFeedbackCount {
        Long getSid();
        Long getLikes();
        Long getDislikes();
    }

    /** Tập hợp id session có ít nhất 1 message bị 👎 — dùng cho filter admin. */
    @Query("SELECT DISTINCT cm.session.id FROM ChatMessage cm WHERE cm.feedback = -1")
    List<Long> findSessionIdsWithDislike();
}
