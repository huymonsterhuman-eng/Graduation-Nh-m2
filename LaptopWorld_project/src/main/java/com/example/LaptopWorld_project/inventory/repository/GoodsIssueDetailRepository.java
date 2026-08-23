package com.example.LaptopWorld_project.inventory.repository;

import com.example.LaptopWorld_project.inventory.entity.GoodsIssueDetail;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoodsIssueDetailRepository extends JpaRepository<GoodsIssueDetail, Long> {

    boolean existsByProductId(Long productId);
}
