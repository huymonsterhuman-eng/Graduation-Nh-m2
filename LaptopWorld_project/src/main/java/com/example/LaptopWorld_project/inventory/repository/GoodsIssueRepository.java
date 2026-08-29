package com.example.LaptopWorld_project.inventory.repository;

import com.example.LaptopWorld_project.inventory.entity.GoodsIssue;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueStatus;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface GoodsIssueRepository extends JpaRepository<GoodsIssue, Long>,
                                              JpaSpecificationExecutor<GoodsIssue> {

    Optional<GoodsIssue> findByOrderIdAndStatus(Long orderId, GoodsIssueStatus status);

    @EntityGraph(attributePaths = {"order", "author"})
    Page<GoodsIssue> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"order", "author"})
    Page<GoodsIssue> findByStatusOrderByCreatedAtDesc(GoodsIssueStatus status, Pageable pageable);

    // Không fetch details.product.images ở đây — sẽ gây MultipleBagFetchException
    // (Hibernate không fetch được 2 List cùng lúc). Images được lazy load trong mapper,
    // vẫn OK vì gọi trong @Transactional readOnly (session còn mở).
    @EntityGraph(attributePaths = {
            "order", "author",
            "details",
            "details.product",
            "details.goodsReceiptDetail", "details.goodsReceiptDetail.goodsReceipt"
    })
    Optional<GoodsIssue> findWithDetailsById(Long id);

    @Query("SELECT COUNT(g) FROM GoodsIssue g WHERE g.createdAt >= :startOfDay AND g.createdAt < :startOfNextDay")
    long countByCreatedDate(OffsetDateTime startOfDay, OffsetDateTime startOfNextDay);

    long countByStatus(GoodsIssueStatus status);

    long countByType(GoodsIssueType type);

    long countByTypeAndStatus(GoodsIssueType type, GoodsIssueStatus status);
}
