package com.example.LaptopWorld_project.order.repository;

import com.example.LaptopWorld_project.order.entity.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {

    /**
     * Không fetch product.images ở đây — sẽ gây MultipleBagFetchException
     * (Hibernate không cho fetch 2 List collection cùng 1 query).
     * Images sẽ auto-load LAZY khi service duyệt items (vẫn trong @Transactional session).
     */
    @EntityGraph(attributePaths = {"items", "items.product"})
    Optional<Cart> findByUserId(Long userId);
}
