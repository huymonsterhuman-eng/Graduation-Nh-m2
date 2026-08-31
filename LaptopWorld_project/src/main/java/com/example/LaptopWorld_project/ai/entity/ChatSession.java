package com.example.LaptopWorld_project.ai.entity;

import com.example.LaptopWorld_project.common.entity.BaseEntity;
import com.example.LaptopWorld_project.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "chat_sessions")
public class ChatSession extends BaseEntity {

    /** Chủ phiên — bắt buộc login. Bỏ hỗ trợ guest từ V33. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 255)
    private String title;

    @Column(name = "is_archived", nullable = false)
    private boolean isArchived = false;

    @Column(name = "last_activity_at", nullable = false)
    private OffsetDateTime lastActivityAt = OffsetDateTime.now();
}
