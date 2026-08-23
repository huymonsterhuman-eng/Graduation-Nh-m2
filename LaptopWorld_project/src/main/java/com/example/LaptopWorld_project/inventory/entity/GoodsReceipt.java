package com.example.LaptopWorld_project.inventory.entity;

import com.example.LaptopWorld_project.common.entity.BaseEntity;
import com.example.LaptopWorld_project.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "goods_receipts")
public class GoodsReceipt extends BaseEntity {

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id")
    private Partner supplier;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String note;

    @OneToMany(mappedBy = "goodsReceipt", fetch = FetchType.LAZY,
               cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GoodsReceiptDetail> details = new ArrayList<>();

    public void addDetail(GoodsReceiptDetail detail) {
        detail.setGoodsReceipt(this);
        details.add(detail);
    }
}
