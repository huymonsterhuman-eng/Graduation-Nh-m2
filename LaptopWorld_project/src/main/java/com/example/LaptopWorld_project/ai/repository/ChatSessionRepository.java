package com.example.LaptopWorld_project.ai.repository;

import com.example.LaptopWorld_project.ai.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ChatSessionRepository
        extends JpaRepository<ChatSession, Long>, JpaSpecificationExecutor<ChatSession> {

    List<ChatSession> findByUserIdAndIsArchivedFalseOrderByLastActivityAtDesc(Long userId);
}
