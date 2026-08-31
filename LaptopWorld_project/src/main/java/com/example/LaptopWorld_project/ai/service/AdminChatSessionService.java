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
    public Page<AdminChatSessionListItemDto> list(OffsetDateTime dateFrom,
                                                  OffsetDateTime dateTo,
                                                  Boolean hasDislike,
                                                  Pageable pageable) {
        // Nếu lọc "chỉ có 👎": load whitelist id trước, empty → trả trang rỗng.
        List<Long> dislikeSessionIds = null;
        if (Boolean.TRUE.equals(hasDislike)) {
            dislikeSessionIds = chatMessageRepository.findSessionIdsWithDislike();
            if (dislikeSessionIds.isEmpty()) {
                return Page.empty(pageable);
            }
        }
        Specification<ChatSession> spec = buildSpec(dateFrom, dateTo, dislikeSessionIds);
        Page<ChatSession> page = chatSessionRepository.findAll(spec, pageable);
        Map<Long, Long> counts = loadMessageCounts(page.getContent());
        Map<Long, long[]> feedback = loadFeedbackCounts(page.getContent());
        return page.map(s -> toListItem(s,
                counts.getOrDefault(s.getId(), 0L),
                feedback.getOrDefault(s.getId(), new long[]{0L, 0L})));
    }

    @Transactional(readOnly = true)
    public AdminChatSessionDetailDto detail(Long id) {
        ChatSession session = chatSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ChatSession", id));
        List<ChatMessage> messages = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(id);
        User u = session.getUser();
        return new AdminChatSessionDetailDto(
                session.getId(),
                session.getTitle(),
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                session.isArchived(),
                session.getLastActivityAt(),
                session.getCreatedAt(),
                messages.stream().map(this::toMessageDto).toList()
        );
    }

    // ==================== helpers ====================

    private Specification<ChatSession> buildSpec(OffsetDateTime dateFrom,
                                                 OffsetDateTime dateTo,
                                                 List<Long> onlyIds) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (dateFrom != null) preds.add(cb.greaterThanOrEqualTo(root.get("createdAt"), dateFrom));
            if (dateTo != null)   preds.add(cb.lessThanOrEqualTo(root.get("createdAt"), dateTo));
            if (onlyIds != null)  preds.add(root.get("id").in(onlyIds));
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

    /** Bulk load số 👍 và 👎 cho danh sách session — tránh N+1. */
    private Map<Long, long[]> loadFeedbackCounts(List<ChatSession> sessions) {
        if (sessions.isEmpty()) return Map.of();
        List<Long> ids = sessions.stream().map(ChatSession::getId).toList();
        Map<Long, long[]> map = new HashMap<>();
        chatMessageRepository.feedbackCountsBySessionIds(ids).forEach(row -> {
            long likes = row.getLikes() == null ? 0L : row.getLikes();
            long dislikes = row.getDislikes() == null ? 0L : row.getDislikes();
            map.put(row.getSid(), new long[]{likes, dislikes});
        });
        return map;
    }

    private AdminChatSessionListItemDto toListItem(ChatSession s, long messageCount, long[] feedback) {
        User u = s.getUser();
        return new AdminChatSessionListItemDto(
                s.getId(),
                s.getTitle(),
                u.getId(),
                u.getUsername(),
                messageCount,
                feedback[0],
                feedback[1],
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
                m.getFeedback(),
                m.getCreatedAt()
        );
    }
}
