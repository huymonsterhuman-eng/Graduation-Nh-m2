package com.example.LaptopWorld_project.order.repository;

import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.order.entity.PaymentMethod;
import com.example.LaptopWorld_project.order.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
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

    long countByUserId(Long userId);

    /**
     * Tổng chi tiêu của user — tính theo các đơn đã ở trạng thái delivered.
     * Trả 0 khi user chưa có đơn delivered nào (COALESCE trong JPQL).
     */
    @Query("""
            SELECT COALESCE(SUM(o.total), 0)
            FROM Order o
            WHERE o.user.id = :userId
              AND o.status  = com.example.LaptopWorld_project.order.entity.OrderStatus.delivered
            """)
    java.math.BigDecimal sumDeliveredTotalByUserId(Long userId);

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

    /**
     * Đơn VNPay pending unpaid đã quá hạn thanh toán — PaymentTimeoutService quét.
     * Kèm details+voucher để cancel trong 1 fetch (tránh N+1).
     */
    @EntityGraph(attributePaths = {"details", "voucher"})
    @Query("""
            SELECT o FROM Order o
            WHERE o.status = :status
              AND o.paymentMethod = :method
              AND o.paymentStatus = :payStatus
              AND o.paymentExpiresAt IS NOT NULL
              AND o.paymentExpiresAt < :now
            """)
    List<Order> findExpiredUnpaidOrders(@Param("status") OrderStatus status,
                                        @Param("method") PaymentMethod method,
                                        @Param("payStatus") PaymentStatus payStatus,
                                        @Param("now") OffsetDateTime now);

    /**
     * Đếm đơn user tạo trong khoảng thời gian — dùng cho rate limit checkout
     * (max 10 đơn / 15 phút / user).
     */
    long countByUserIdAndCreatedAtAfter(Long userId, OffsetDateTime after);

    /** Đếm đơn hàng gán 1 đơn vị vận chuyển — gate xoá Partner (shipping_provider). */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.partnerId = :partnerId")
    long countByPartnerId(@Param("partnerId") Long partnerId);

    /** Bulk count đơn theo ĐVVC — tránh N+1 khi list Partner. */
    @Query("SELECT o.partnerId, COUNT(o) FROM Order o WHERE o.partnerId IS NOT NULL GROUP BY o.partnerId")
    List<Object[]> countGroupByPartnerId();
}
