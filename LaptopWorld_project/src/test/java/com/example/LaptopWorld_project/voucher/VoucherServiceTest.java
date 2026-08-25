package com.example.LaptopWorld_project.voucher;

import com.example.LaptopWorld_project.voucher.entity.Voucher;
import com.example.LaptopWorld_project.voucher.entity.VoucherType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test business logic tren Voucher entity — nen phan trong VoucherService la thin wrapper
 * chi delegate ve entity method (isValid + calculateDiscount).
 */
class VoucherServiceTest {

    private Voucher buildVoucher(VoucherType type, BigDecimal discountAmount) {
        Voucher v = new Voucher();
        v.setCode("TEST");
        v.setName("Test voucher");
        v.setType(type);
        v.setDiscountAmount(discountAmount);
        v.setMinOrderValue(BigDecimal.ZERO);
        v.setActive(true);
        return v;
    }

    @Test
    @DisplayName("Fixed voucher — giam co dinh dung so tien")
    void calculateDiscount_fixed_returnsFixedAmount() {
        Voucher v = buildVoucher(VoucherType.fixed, new BigDecimal("50000"));

        BigDecimal discount = v.calculateDiscount(new BigDecimal("500000"));

        assertThat(discount).isEqualByComparingTo("50000");
    }

    @Test
    @DisplayName("Percent voucher — giam theo phan tram subtotal")
    void calculateDiscount_percent_returnsPercentOfSubtotal() {
        Voucher v = buildVoucher(VoucherType.percent, new BigDecimal("10"));

        BigDecimal discount = v.calculateDiscount(new BigDecimal("500000"));

        assertThat(discount).isEqualByComparingTo("50000");
    }

    @Test
    @DisplayName("Percent voucher voi max_discount — cap khi vuot tran")
    void calculateDiscount_percent_cappedByMaxDiscount() {
        Voucher v = buildVoucher(VoucherType.percent, new BigDecimal("20"));
        v.setMaxDiscount(new BigDecimal("100000"));

        // 20% cua 1_000_000 = 200_000, nhung bi cap ve 100_000
        BigDecimal discount = v.calculateDiscount(new BigDecimal("1000000"));

        assertThat(discount).isEqualByComparingTo("100000");
    }

    @Test
    @DisplayName("Fixed voucher lon hon subtotal — chi giam bang subtotal (khong am)")
    void calculateDiscount_fixedLargerThanSubtotal_clampsToSubtotal() {
        Voucher v = buildVoucher(VoucherType.fixed, new BigDecimal("200000"));

        BigDecimal discount = v.calculateDiscount(new BigDecimal("150000"));

        assertThat(discount).isEqualByComparingTo("150000");
    }

    @Test
    @DisplayName("isValid — subtotal < min_order_value tra ve false")
    void isValid_belowMinOrder_returnsFalse() {
        Voucher v = buildVoucher(VoucherType.fixed, new BigDecimal("50000"));
        v.setMinOrderValue(new BigDecimal("500000"));

        assertThat(v.isValid(new BigDecimal("400000"))).isFalse();
        assertThat(v.isValid(new BigDecimal("500000"))).isTrue();
    }

    @Test
    @DisplayName("isValid — voucher het luot (used_count >= usage_limit) tra ve false")
    void isValid_usageLimitExhausted_returnsFalse() {
        Voucher v = buildVoucher(VoucherType.fixed, new BigDecimal("50000"));
        v.setUsageLimit(10);
        // usedCount = 10 → bang limit → khong con luot
        for (int i = 0; i < 10; i++) v.incrementUsed();

        assertThat(v.isValid(new BigDecimal("1000000"))).isFalse();

        v.decrementUsed(); // 9 → con 1 luot
        assertThat(v.isValid(new BigDecimal("1000000"))).isTrue();
    }

    @Test
    @DisplayName("isValid — voucher het han (expires_at < now) tra ve false")
    void isValid_expired_returnsFalse() {
        Voucher v = buildVoucher(VoucherType.fixed, new BigDecimal("50000"));
        v.setExpiresAt(OffsetDateTime.now().minusDays(1));

        assertThat(v.isValid(new BigDecimal("1000000"))).isFalse();
    }

    @Test
    @DisplayName("isValid — voucher chua den ngay bat dau (started_at > now) tra ve false")
    void isValid_notStartedYet_returnsFalse() {
        Voucher v = buildVoucher(VoucherType.fixed, new BigDecimal("50000"));
        v.setStartedAt(OffsetDateTime.now().plusDays(1));

        assertThat(v.isValid(new BigDecimal("1000000"))).isFalse();
    }

    @Test
    @DisplayName("isValid — voucher inactive tra ve false")
    void isValid_inactive_returnsFalse() {
        Voucher v = buildVoucher(VoucherType.fixed, new BigDecimal("50000"));
        v.setActive(false);

        assertThat(v.isValid(new BigDecimal("1000000"))).isFalse();
    }
}
