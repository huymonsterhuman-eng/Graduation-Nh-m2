package com.example.LaptopWorld_project.order.repository;

import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long>,
                                          JpaSpecificationExecutor<Order> {

    Optional<Order> findByCode(String code);

    @EntityGraph(attributePaths = {"details", "voucher"})
    Optional<Order> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"details", "voucher"})
    Optional<Order> findWithDetailsByCode(String code);

    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Order> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, OrderStatus status, Pageable pageable);

    /**
     * Đếm số đơn tạo trong ngày (dùng để sinh mã ORD-YYYYMMDD-NNN).
     * NOTE: cẩn thận race — dùng WITH LOCK ở service khi cần.
     */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :startOfDay AND o.createdAt < :startOfNextDay")
    long countByCreatedAtBetween(OffsetDateTime startOfDay, OffsetDateTime startOfNextDay);

    long countByStatus(OrderStatus status);

    /**
     * User có đơn nào chứa sản phẩm này và đã ở trạng thái delivered chưa?
     * Dùng để chặn review khi khách chưa từng mua & nhận hàng.
     */
    @Query("""
            SELECT CASE WHEN COUNT(od) > 0 THEN true ELSE false END
            FROM OrderDetail od
            WHERE od.order.user.id = :userId
              AND od.product.id   = :productId
              AND od.order.status = com.example.LaptopWorld_project.order.entity.OrderStatus.delivered
            """)
    boolean existsDeliveredOrderWithProduct(Long userId, Long productId);
}
