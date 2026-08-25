package com.example.LaptopWorld_project.ai.service;

import com.example.LaptopWorld_project.ai.dto.AdminChatMessageDto;
import com.example.LaptopWorld_project.ai.dto.AdminChatSessionDetailDto;
import com.example.LaptopWorld_project.ai.dto.AdminChatSessionListItemDto;
import com.example.LaptopWorld_project.ai.entity.ChatMessage;
import com.example.LaptopWorld_project.ai.entity.ChatSession;
import com.example.LaptopWorld_project.ai.repository.ChatMessageRepository;
import com.example.LaptopWorld_project.ai.repository.ChatSessionRepository;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.user.entity.User;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin xem session chat của trợ lý AI — Sprint 9G Bước D.
 *
 * List paginated + filter loggedIn (guest/user) + date range. Detail trả về toàn bộ
 * messages ordered by createdAt asc để render dạng bubble timeline.
 */
@Service
@RequiredArgsConstructor
public class AdminChatSessionService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;

    @Transactional(readOnly = true)
    public Page<AdminChatSessionListItemDto> list(Boolean loggedIn,
                                                  OffsetDateTime dateFrom,
                                                  OffsetDateTime dateTo,
                                                  Pageable pageable) {
        Specification<ChatSession> spec = buildSpec(loggedIn, dateFrom, dateTo);
        Page<ChatSession> page = chatSessionRepository.findAll(spec, pageable);
        Map<Long, Long> counts = loadMessageCounts(page.getContent());
        return page.map(s -> toListItem(s, counts.getOrDefault(s.getId(), 0L)));
    }

    @Transactional(readOnly = true)
    public AdminChatSessionDetailDto detail(Long id) {
        ChatSession session = chatSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ChatSession", id));
        List<ChatMessage> messages = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(id);
        User u = session.getUser();
        boolean guest = u == null;
        return new AdminChatSessionDetailDto(
                session.getId(),
                session.getTitle(),
                guest ? null : u.getId(),
                guest ? null : u.getUsername(),
                guest ? null : u.getEmail(),
                guest,
                session.isArchived(),
                session.getLastActivityAt(),
                session.getCreatedAt(),
                messages.stream().map(this::toMessageDto).toList()
        );
    }

    // ==================== helpers ====================

    private Specification<ChatSession> buildSpec(Boolean loggedIn,
                                                 OffsetDateTime dateFrom,
                                                 OffsetDateTime dateTo) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (loggedIn != null) {
                if (Boolean.TRUE.equals(loggedIn)) {
                    preds.add(cb.isNotNull(root.get("user")));
                } else {
                    preds.add(cb.isNull(root.get("user")));
                }
            }
            if (dateFrom != null) preds.add(cb.greaterThanOrEqualTo(root.get("createdAt"), dateFrom));
            if (dateTo != null)   preds.add(cb.lessThanOrEqualTo(root.get("createdAt"), dateTo));
            return preds.isEmpty() ? cb.conjunction() : cb.and(preds.toArray(new Predicate[0]));
        };
    }

    private Map<Long, Long> loadMessageCounts(List<ChatSession> sessions) {
        if (sessions.isEmpty()) return Map.of();
        List<Long> ids = sessions.stream().map(ChatSession::getId).toList();
        Map<Long, Long> map = new HashMap<>();
        chatMessageRepository.countBySessionIds(ids)
                .forEach(row -> map.put(row.getSid(), row.getCnt()));
        return map;
    }

    private AdminChatSessionListItemDto toListItem(ChatSession s, long messageCount) {
        User u = s.getUser();
        boolean guest = u == null;
        return new AdminChatSessionListItemDto(
                s.getId(),
                s.getTitle(),
                guest ? null : u.getId(),
                guest ? null : u.getUsername(),
                guest,
                messageCount,
                s.getLastActivityAt(),
                s.getCreatedAt()
        );
    }

    private AdminChatMessageDto toMessageDto(ChatMessage m) {
        return new AdminChatMessageDto(
                m.getId(),
                m.getRole(),
                m.getContent(),
                m.getToolName(),
                m.getTokensInput(),
                m.getTokensOutput(),
                m.getResponseTimeMs(),
                m.getCreatedAt()
        );
    }
}
