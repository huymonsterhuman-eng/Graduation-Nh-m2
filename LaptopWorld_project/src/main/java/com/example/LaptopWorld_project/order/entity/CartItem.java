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
@Table(name = "cart_items")
public class CartItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private int quantity;

    /** Snapshot giá tại lần add/update — reference để user thấy đơn giá đã chọn. */
    @Column(name = "price_snapshot", nullable = false, precision = 15, scale = 2)
    private BigDecimal priceSnapshot;

    public BigDecimal getLineTotal() {
        return priceSnapshot.multiply(BigDecimal.valueOf(quantity));
    }
}
