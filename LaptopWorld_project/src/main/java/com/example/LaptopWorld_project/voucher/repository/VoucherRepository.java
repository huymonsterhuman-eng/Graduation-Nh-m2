package com.example.LaptopWorld_project.voucher.repository;

import com.example.LaptopWorld_project.voucher.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCode(String code);

    boolean existsByCode(String code);

    /** Voucher đang public (còn hạn + active) — dùng để list cho user chọn lưu. */
    List<Voucher> findByIsActiveTrueAndExpiresAtAfterOrderByExpiresAtAsc(OffsetDateTime now);
}
