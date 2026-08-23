package com.example.LaptopWorld_project.voucher.repository;

import com.example.LaptopWorld_project.voucher.entity.UserVoucher;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserVoucherRepository extends JpaRepository<UserVoucher, Long> {

    boolean existsByUserIdAndVoucherId(Long userId, Long voucherId);

    Optional<UserVoucher> findByUserIdAndVoucherId(Long userId, Long voucherId);

    @EntityGraph(attributePaths = {"voucher"})
    List<UserVoucher> findByUserIdAndIsUsedFalseOrderByCreatedAtDesc(Long userId);
}
