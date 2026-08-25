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

    /** Count message theo từng session — dùng cho list admin (tránh N+1). */
    @Query("SELECT cm.session.id AS sid, COUNT(cm) AS cnt FROM ChatMessage cm " +
           "WHERE cm.session.id IN :ids GROUP BY cm.session.id")
    List<SessionMessageCount> countBySessionIds(@Param("ids") Collection<Long> ids);

    interface SessionMessageCount {
        Long getSid();
        Long getCnt();
    }
}
