package com.example.LaptopWorld_project.catalog.repository;

import com.example.LaptopWorld_project.catalog.entity.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long>,
                                           JpaSpecificationExecutor<Product> {

    @EntityGraph(attributePaths = {"brand", "category", "images"})
    Optional<Product> findBySlug(String slug);

    @EntityGraph(attributePaths = {"brand", "category", "images"})
    Optional<Product> findWithDetailsById(Long id);

    /**
     * Lock row Product cho race-safe reserve/release stock.
     * Dùng khi checkout / cancel order để tránh 2 khách cùng đặt SP cuối.
     */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    boolean existsBySlug(String slug);

    boolean existsBySku(String sku);

    boolean existsByCategoryId(Long categoryId);

    boolean existsByBrandId(Long brandId);

    /** Đếm SP theo từng brand (đã lọc soft-delete qua @SQLRestriction). */
    @Query("SELECT p.brand.id, COUNT(p) FROM Product p WHERE p.brand.id IS NOT NULL GROUP BY p.brand.id")
    java.util.List<Object[]> countGroupByBrandId();

    /**
     * Lấy list Brand DISTINCT có ít nhất 1 SP đang bán trong các category chỉ định.
     * Dùng cho MegaMenu: hover category → chỉ hiện brand thực sự có hàng.
     * @SQLRestriction trên Product tự lọc soft-delete.
     */
    @Query("SELECT DISTINCT p.brand FROM Product p " +
           "WHERE p.brand.id IS NOT NULL " +
           "AND p.category.id IN :categoryIds " +
           "AND p.isActive = true " +
           "AND p.brand.isActive = true " +
           "ORDER BY p.brand.name ASC")
    java.util.List<com.example.LaptopWorld_project.catalog.entity.Brand>
        findDistinctBrandsByCategoryIds(@Param("categoryIds") java.util.List<Long> categoryIds);

    @Modifying
    @Query("UPDATE Product p SET p.views = p.views + 1 WHERE p.id = :id")
    int incrementViews(@Param("id") Long id);

    /**
     * SP liên quan trong bracket giá — cùng category, giá trong [minPrice, maxPrice],
     * sort theo khoảng cách giá tuyệt đối tăng dần (gần giá nhất trước), tie-break bằng views.
     * Loại trừ chính SP đang xem. @SQLRestriction lọc soft-delete tự động.
     */
    @Query("""
            SELECT p FROM Product p
            WHERE p.category.id = :categoryId
              AND p.id <> :excludeId
              AND p.isActive = true
              AND p.price BETWEEN :minPrice AND :maxPrice
            ORDER BY ABS(p.price - :basePrice) ASC, p.views DESC
            """)
    java.util.List<Product> findRelatedInPriceBracket(
            @Param("categoryId") Long categoryId,
            @Param("excludeId") Long excludeId,
            @Param("basePrice") java.math.BigDecimal basePrice,
            @Param("minPrice") java.math.BigDecimal minPrice,
            @Param("maxPrice") java.math.BigDecimal maxPrice,
            org.springframework.data.domain.Pageable pageable);

    /** Fallback: SP cùng category không giới hạn giá, sort views — khi bracket thiếu SP. */
    @Query("""
            SELECT p FROM Product p
            WHERE p.category.id = :categoryId
              AND p.id <> :excludeId
              AND p.isActive = true
            ORDER BY p.views DESC
            """)
    java.util.List<Product> findRelatedByCategory(
            @Param("categoryId") Long categoryId,
            @Param("excludeId") Long excludeId,
            org.springframework.data.domain.Pageable pageable);

    /** Load toàn bộ SP kèm brand + category eager — dùng cho embedding job. */
    @EntityGraph(attributePaths = {"brand", "category"})
    @Query("SELECT p FROM Product p")
    java.util.List<Product> findAllForEmbedding();

    /** List SP đã soft-delete (native — bypass @SQLRestriction). */
    @Query(value = "SELECT * FROM products WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC",
           nativeQuery = true)
    java.util.List<Product> findAllDeleted();

    /** Restore 1 SP đã soft-delete. Trả về số row updated (0 = không tìm thấy). */
    @Modifying
    @Query(value = "UPDATE products SET deleted_at = NULL WHERE id = :id AND deleted_at IS NOT NULL",
           nativeQuery = true)
    int restoreSoftDeleted(@Param("id") Long id);

    /**
     * Đếm số SP đang có giá trị non-empty cho từng key trong template thông số kỹ thuật.
     * Dùng để chặn admin đổi kiểu / xoá field khi đang có SP dùng.
     * Chỉ đếm SP active + chưa soft-delete + specs JSONB không null + value non-empty.
     */
    @Query(value = """
            SELECT entry.k AS key, COUNT(*) AS n
            FROM products p, LATERAL jsonb_each_text(p.specs) AS entry(k, v)
            WHERE p.category_id = :categoryId
              AND p.deleted_at IS NULL
              AND p.specs IS NOT NULL
              AND entry.v IS NOT NULL AND entry.v <> '' AND entry.v <> 'null'
            GROUP BY entry.k
            """, nativeQuery = true)
    java.util.List<Object[]> countSpecUsageByCategoryId(@Param("categoryId") Long categoryId);

    /**
     * Aggregate: distinct value + count cho từng key trong specs JSONB.
     * Dùng để build filter thông số kỹ thuật ở trang danh mục user site.
     * Chỉ đếm SP active + chưa soft-delete + trong các category chỉ định
     * (đã bao gồm sub-cat con — caller resolve trước).
     * Sort trong Java để giữ SQL đơn giản.
     */
    @Query(value = """
            SELECT entry.k AS spec_key, entry.v AS spec_value, COUNT(*) AS cnt
            FROM products p, LATERAL jsonb_each_text(p.specs) AS entry(k, v)
            WHERE p.category_id IN (:categoryIds)
              AND p.deleted_at IS NULL
              AND p.is_active = true
              AND p.specs IS NOT NULL
              AND entry.v IS NOT NULL AND entry.v <> '' AND entry.v <> 'null'
            GROUP BY entry.k, entry.v
            """, nativeQuery = true)
    java.util.List<Object[]> aggregateSpecValuesByCategoryIds(
            @Param("categoryIds") java.util.List<Long> categoryIds);
}
