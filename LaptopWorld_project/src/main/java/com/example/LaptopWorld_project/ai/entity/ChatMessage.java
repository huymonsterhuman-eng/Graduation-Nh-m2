package com.example.LaptopWorld_project.ai.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Không kế thừa BaseEntity vì không có updated_at (chat message immutable).
 */
@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChatRole role;

    @Column(columnDefinition = "TEXT")
    private String content;

    // Tool calling — Sprint 5C sẽ dùng
    @Column(name = "tool_name", length = 80)
    private String toolName;

    @Column(name = "tool_call_id", length = 120)
    private String toolCallId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tool_input", columnDefinition = "jsonb")
    private Map<String, Object> toolInput;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tool_output", columnDefinition = "jsonb")
    private Map<String, Object> toolOutput;

    @Column(name = "tokens_input")
    private Integer tokensInput;

    @Column(name = "tokens_output")
    private Integer tokensOutput;

    @Column(name = "response_time_ms")
    private Integer responseTimeMs;

    /** Feedback của người dùng cho message assistant. 1 = 👍, -1 = 👎, null = chưa đánh giá. */
    @Column(name = "feedback")
    private Short feedback;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
