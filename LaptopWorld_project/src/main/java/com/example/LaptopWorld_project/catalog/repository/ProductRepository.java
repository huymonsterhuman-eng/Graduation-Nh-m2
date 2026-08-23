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

    @Modifying
    @Query("UPDATE Product p SET p.views = p.views + 1 WHERE p.id = :id")
    int incrementViews(@Param("id") Long id);

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
}
