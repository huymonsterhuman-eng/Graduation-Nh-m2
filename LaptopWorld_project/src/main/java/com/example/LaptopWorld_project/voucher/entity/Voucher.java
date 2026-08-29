package com.example.LaptopWorld_project.voucher.entity;

import com.example.LaptopWorld_project.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "vouchers")
public class Voucher extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private VoucherType type;

    /** Nếu type=fixed: giảm cố định VND. Nếu type=percent: % (0-100). */
    @Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "min_order_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal minOrderValue = BigDecimal.ZERO;

    /** Chỉ dùng khi type=percent — giới hạn discount tối đa. Null = không giới hạn. */
    @Column(name = "max_discount", precision = 15, scale = 2)
    private BigDecimal maxDiscount;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    /** Null = không giới hạn tổng lần dùng. */
    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "used_count", nullable = false)
    private int usedCount = 0;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    // ================== Business logic ==================

    /**
     * Voucher có hợp lệ tại thời điểm hiện tại với đơn có subtotal đã cho?
     */
    public boolean isValid(BigDecimal orderSubtotal) {
        if (!isActive) return false;
        OffsetDateTime now = OffsetDateTime.now();
        if (startedAt != null && now.isBefore(startedAt)) return false;
        if (expiresAt != null && now.isAfter(expiresAt)) return false;
        if (usageLimit != null && usedCount >= usageLimit) return false;
        if (orderSubtotal.compareTo(minOrderValue) < 0) return false;
        return true;
    }

    /**
     * Tính số tiền giảm cho đơn có subtotal đã cho.
     * KHÔNG kiểm tra isValid — caller nên gọi isValid() trước.
     */
    public BigDecimal calculateDiscount(BigDecimal orderSubtotal) {
        BigDecimal discount = switch (type) {
            case fixed   -> discountAmount;
            case percent -> orderSubtotal.multiply(discountAmount)
                                          .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        };
        if (maxDiscount != null && discount.compareTo(maxDiscount) > 0) {
            discount = maxDiscount;
        }
        // Không giảm quá subtotal
        if (discount.compareTo(orderSubtotal) > 0) {
            discount = orderSubtotal;
        }
        return discount;
    }

    public void incrementUsed() {
        this.usedCount++;
    }

    public void decrementUsed() {
        if (this.usedCount > 0) this.usedCount--;
    }
}
