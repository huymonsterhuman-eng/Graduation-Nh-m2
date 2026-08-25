package com.example.LaptopWorld_project.review.repository;

import com.example.LaptopWorld_project.review.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    boolean existsByUserIdAndProductId(Long userId, Long productId);

    long countByUserId(Long userId);

    @EntityGraph(attributePaths = {"product"})
    List<Review> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Review chưa bị ẩn — dùng cho public list. */
    @EntityGraph(attributePaths = {"user"})
    Page<Review> findByProductIdAndIsHiddenFalseOrderByCreatedAtDesc(Long productId, Pageable pageable);

    /** Admin list — có thể lọc theo is_hidden. */
    @EntityGraph(attributePaths = {"user", "product"})
    Page<Review> findByIsHiddenOrderByCreatedAtDesc(boolean isHidden, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "product"})
    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // ==================== Aggregate cho product rating ====================

    /** AVG rating (chưa hidden) — null nếu SP chưa có review. */
    @Query("""
            SELECT AVG(CAST(r.rating AS double))
            FROM Review r
            WHERE r.product.id = :productId AND r.isHidden = false
            """)
    Double avgRatingByProduct(Long productId);

    /** Số review chưa hidden của 1 SP. */
    @Query("""
            SELECT COUNT(r)
            FROM Review r
            WHERE r.product.id = :productId AND r.isHidden = false
            """)
    long countByProductAndNotHidden(Long productId);

    /**
     * Bulk aggregate cho nhiều SP — mỗi row là [productId, avg, count].
     * Chỉ có row cho SP đã có review chưa hidden.
     */
    @Query("""
            SELECT r.product.id, AVG(CAST(r.rating AS double)), COUNT(r)
            FROM Review r
            WHERE r.product.id IN :productIds AND r.isHidden = false
            GROUP BY r.product.id
            """)
    List<Object[]> findAggregatesByProductIds(Collection<Long> productIds);
}
