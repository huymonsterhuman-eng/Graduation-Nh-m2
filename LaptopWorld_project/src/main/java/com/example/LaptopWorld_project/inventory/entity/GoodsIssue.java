package com.example.LaptopWorld_project.inventory.entity;

import com.example.LaptopWorld_project.common.entity.BaseEntity;
import com.example.LaptopWorld_project.order.entity.Order;
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
@Table(name = "goods_issues")
public class GoodsIssue extends BaseEntity {

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    /** Nullable: phiếu manual do admin tự tạo không gắn với đơn hàng nào. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private GoodsIssueType type = GoodsIssueType.auto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "total_cogs", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalCogs = BigDecimal.ZERO;

    /** Mặc định là pending — chờ kho duyệt. Approve → completed, reject → cancelled. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GoodsIssueStatus status = GoodsIssueStatus.pending;

    @OneToMany(mappedBy = "goodsIssue", fetch = FetchType.LAZY,
               cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GoodsIssueDetail> details = new ArrayList<>();

    public void addDetail(GoodsIssueDetail detail) {
        detail.setGoodsIssue(this);
        details.add(detail);
    }
}
