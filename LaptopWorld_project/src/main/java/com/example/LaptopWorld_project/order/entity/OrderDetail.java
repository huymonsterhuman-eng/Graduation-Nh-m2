package com.example.LaptopWorld_project.order.entity;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "order_details")
public class OrderDetail extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /** Nullable: nếu SP bị xóa (soft delete), FK set null nhưng snapshot vẫn giữ nguyên. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    /** Snapshot tên SP tại thời điểm mua. */
    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    /** Snapshot ảnh primary. */
    @Column(name = "product_image", length = 500)
    private String productImage;

    @Column(nullable = false)
    private int quantity;

    /** Snapshot giá tại thời điểm mua (sale_price nếu có, ngược lại là price). */
    @Column(name = "price_at_purchase", nullable = false, precision = 15, scale = 2)
    private BigDecimal priceAtPurchase;

    public BigDecimal getLineTotal() {
        return priceAtPurchase.multiply(BigDecimal.valueOf(quantity));
    }
}
