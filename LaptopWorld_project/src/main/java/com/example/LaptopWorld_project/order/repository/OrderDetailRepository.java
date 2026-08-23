package com.example.LaptopWorld_project.order.repository;

import com.example.LaptopWorld_project.order.entity.OrderDetail;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderDetailRepository extends JpaRepository<OrderDetail, Long> {

    boolean existsByProductId(Long productId);
}
