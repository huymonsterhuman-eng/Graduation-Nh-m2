package com.example.LaptopWorld_project.review.service;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import com.example.LaptopWorld_project.review.dto.AdminReplyRequest;
import com.example.LaptopWorld_project.review.dto.CreateReviewRequest;
import com.example.LaptopWorld_project.review.dto.RatingSummaryDto;
import com.example.LaptopWorld_project.review.dto.ReviewDto;
import com.example.LaptopWorld_project.review.entity.Review;
import com.example.LaptopWorld_project.review.mapper.ReviewMapper;
import com.example.LaptopWorld_project.review.repository.ReviewRepository;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ReviewMapper reviewMapper;

    // ==================== USER ====================

    @Transactional
    public ReviewDto createReview(Long userId, CreateReviewRequest req) {
        Product product = productRepository.findById(req.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", req.productId()));

        // Chặn: user chưa từng mua & nhận hàng SP này
        if (!orderRepository.existsDeliveredOrderWithProduct(userId, req.productId())) {
            throw new BusinessException("NOT_PURCHASED",
                    "Chỉ khách đã mua và nhận hàng mới được đánh giá sản phẩm");
        }

        // Chặn duplicate
        if (reviewRepository.existsByUserIdAndProductId(userId, req.productId())) {
            throw new BusinessException("ALREADY_REVIEWED",
                    "Bạn đã đánh giá sản phẩm này rồi");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Review r = new Review();
        r.setUser(user);
        r.setProduct(product);
        r.setRating((short) req.rating().intValue());
        r.setComment(req.comment());
        if (req.image() != null && !req.image().isBlank()) {
            r.setImages(List.of(req.image()));
        }
        return reviewMapper.toDto(reviewRepository.save(r));
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReviewDto> listByProduct(Long productId, Pageable pageable) {
        Page<Review> page = reviewRepository
                .findByProductIdAndIsHiddenFalseOrderByCreatedAtDesc(productId, pageable);
        return PagedResponse.from(page, reviewMapper::toDto);
    }

    // ==================== ADMIN ====================

    @Transactional(readOnly = true)
    public PagedResponse<ReviewDto> adminList(Boolean isHidden, Pageable pageable) {
        Page<Review> page = isHidden != null
                ? reviewRepository.findByIsHiddenOrderByCreatedAtDesc(isHidden, pageable)
                : reviewRepository.findAllByOrderByCreatedAtDesc(pageable);
        return PagedResponse.from(page, reviewMapper::toDto);
    }

    @Transactional
    public ReviewDto adminSetHidden(Long id, boolean hidden) {
        Review r = getByIdOrThrow(id);
        r.setHidden(hidden);
        return reviewMapper.toDto(reviewRepository.save(r));
    }

    @Transactional
    public ReviewDto adminReply(Long id, AdminReplyRequest req) {
        Review r = getByIdOrThrow(id);
        r.setAdminReply(req.reply());
        return reviewMapper.toDto(reviewRepository.save(r));
    }

    @Transactional
    public void adminDelete(Long id) {
        Review r = getByIdOrThrow(id);
        reviewRepository.delete(r);
    }

    // ==================== Rating aggregate cho catalog ====================

    /** Tổng hợp rating cho 1 SP (dùng cho ProductDetailDto). */
    @Transactional(readOnly = true)
    public RatingSummaryDto getRatingSummary(Long productId) {
        Double avg = reviewRepository.avgRatingByProduct(productId);
        long count = reviewRepository.countByProductAndNotHidden(productId);
        return toDto(avg, count);
    }

    /** Bulk aggregate cho nhiều SP (dùng cho ProductListItemDto — tránh N+1). */
    @Transactional(readOnly = true)
    public Map<Long, RatingSummaryDto> getRatingSummariesBulk(Collection<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) return Collections.emptyMap();
        List<Object[]> rows = reviewRepository.findAggregatesByProductIds(productIds);
        Map<Long, RatingSummaryDto> result = new HashMap<>();
        for (Object[] row : rows) {
            Long pid = ((Number) row[0]).longValue();
            Double avg = row[1] != null ? ((Number) row[1]).doubleValue() : null;
            long count = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            result.put(pid, toDto(avg, count));
        }
        return result;
    }

    private RatingSummaryDto toDto(Double avg, long count) {
        if (avg == null || count == 0) return RatingSummaryDto.empty();
        BigDecimal rounded = BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP);
        return new RatingSummaryDto(rounded, (int) count);
    }

    // ==================== helpers ====================

    private Review getByIdOrThrow(Long id) {
        return reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review", id));
    }
}
