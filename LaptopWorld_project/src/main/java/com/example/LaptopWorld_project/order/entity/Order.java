package com.example.LaptopWorld_project.order.entity;

import com.example.LaptopWorld_project.common.entity.BaseEntity;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.voucher.entity.Voucher;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "orders")
public class Order extends BaseEntity {

    /** Mã đơn: ORD-YYYYMMDD-NNN — sinh ở CheckoutService (Sprint 4D). */
    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "shipping_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal total;

    @Column(name = "shipping_name", length = 150)
    private String shippingName;

    @Column(name = "shipping_address", length = 500)
    private String shippingAddress;

    @Column(name = "shipping_phone", length = 20)
    private String shippingPhone;

    @Column(name = "shipping_method", length = 50)
    private String shippingMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.pending;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod = PaymentMethod.cod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus = PaymentStatus.unpaid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_id")
    private Voucher voucher;

    /** FK sang partners (shipping provider). Partner entity Phase 6 mới có. */
    @Column(name = "partner_id")
    private Long partnerId;

    @Column(name = "tracking_number", length = 100)
    private String trackingNumber;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    /** vnp_TransactionNo — mã giao dịch VNPay trả về khi thanh toán thành công. */
    @Column(name = "payment_transaction_ref", length = 50)
    private String paymentTransactionRef;

    @Column(name = "preparing_at")
    private OffsetDateTime preparingAt;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    /**
     * Hạn thanh toán VNPay (createdAt + 15 phút). PaymentTimeoutService quét cột này
     * mỗi 60s — quá hạn mà chưa paid → auto cancel + release reserved + refund voucher.
     * COD và đơn đã paid: null (không bao giờ hết hạn).
     */
    @Column(name = "payment_expires_at")
    private OffsetDateTime paymentExpiresAt;

    @Column(name = "delivered_at")
    private OffsetDateTime deliveredAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<OrderDetail> details = new ArrayList<>();

    public void addDetail(OrderDetail d) {
        d.setOrder(this);
        this.details.add(d);
    }
}
