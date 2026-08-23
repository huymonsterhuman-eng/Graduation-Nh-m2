package com.example.LaptopWorld_project.voucher.entity;

import com.example.LaptopWorld_project.common.entity.BaseEntity;
import com.example.LaptopWorld_project.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * User lưu voucher vào tài khoản để dùng sau.
 * Unique(user_id, voucher_id): mỗi user chỉ lưu 1 lần / voucher.
 */
@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "user_vouchers")
public class UserVoucher extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "voucher_id", nullable = false)
    private Voucher voucher;

    @Column(name = "is_used", nullable = false)
    private boolean isUsed = false;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    /**
     * Order đã dùng voucher này (nullable — chưa dùng thì null).
     * Không có FK entity — Order chưa ổn định về design (partner_id, v.v.), lưu raw ID.
     */
    @Column(name = "order_id")
    private Long orderId;
}
