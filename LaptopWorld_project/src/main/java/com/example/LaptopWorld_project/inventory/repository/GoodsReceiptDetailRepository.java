package com.example.LaptopWorld_project.inventory.repository;

import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptDetail;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface GoodsReceiptDetailRepository extends JpaRepository<GoodsReceiptDetail, Long> {

    boolean existsByProductId(Long productId);


    /**
     * Lấy các batch còn hàng của 1 sản phẩm, cũ nhất trước (FIFO).
     * Dùng pessimistic write lock để tránh race condition khi 2 order cùng
     * xuất kho một sản phẩm.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT d FROM GoodsReceiptDetail d
            WHERE d.product.id = :productId
              AND d.remainingQuantity > 0
            ORDER BY d.createdAt ASC, d.id ASC
            """)
    List<GoodsReceiptDetail> findFifoBatchesForUpdate(Long productId);

    /**
     * Version không lock — dùng cho endpoint xem tồn kho của admin.
     */
    @Query("""
            SELECT d FROM GoodsReceiptDetail d
            JOIN FETCH d.goodsReceipt gr
            JOIN FETCH gr.supplier
            WHERE d.product.id = :productId
              AND d.remainingQuantity > 0
            ORDER BY d.createdAt ASC, d.id ASC
            """)
    List<GoodsReceiptDetail> findRemainingBatches(Long productId);
}
