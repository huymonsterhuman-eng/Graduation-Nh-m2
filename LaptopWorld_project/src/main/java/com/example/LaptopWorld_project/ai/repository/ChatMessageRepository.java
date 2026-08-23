package com.example.LaptopWorld_project.ai.repository;

import com.example.LaptopWorld_project.ai.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    /** Lấy N message gần nhất — dùng cho context RAG. */
    List<ChatMessage> findTop20BySessionIdOrderByCreatedAtDesc(Long sessionId);
}
