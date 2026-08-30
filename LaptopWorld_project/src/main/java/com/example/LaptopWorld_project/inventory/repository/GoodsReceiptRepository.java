package com.example.LaptopWorld_project.inventory.repository;

import com.example.LaptopWorld_project.inventory.entity.GoodsReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long>,
                                                JpaSpecificationExecutor<GoodsReceipt> {

    @EntityGraph(attributePaths = {"supplier", "user"})
    Page<GoodsReceipt> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"supplier", "user"})
    Page<GoodsReceipt> findBySupplierIdOrderByCreatedAtDesc(Long supplierId, Pageable pageable);

    @EntityGraph(attributePaths = {"supplier", "user", "details", "details.product"})
    Optional<GoodsReceipt> findWithDetailsById(Long id);

    /** Đếm số phiếu tạo cùng ngày để sinh số tuần tự trong code GR-YYYYMMDD-NNN */
    @Query("SELECT COUNT(g) FROM GoodsReceipt g WHERE g.createdAt >= :startOfDay AND g.createdAt < :startOfNextDay")
    long countByCreatedDate(OffsetDateTime startOfDay, OffsetDateTime startOfNextDay);

    /** Đếm phiếu nhập của 1 NCC — gate xoá Partner (supplier). */
    long countBySupplier_Id(Long supplierId);

    /** Bulk count phiếu nhập theo NCC — tránh N+1 khi list Partner. */
    @Query("SELECT g.supplier.id, COUNT(g) FROM GoodsReceipt g GROUP BY g.supplier.id")
    java.util.List<Object[]> countGroupBySupplierId();
}
