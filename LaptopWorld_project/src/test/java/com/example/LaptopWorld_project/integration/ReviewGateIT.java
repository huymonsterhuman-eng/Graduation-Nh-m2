package com.example.LaptopWorld_project.integration;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.entity.OrderDetail;
import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.order.entity.PaymentMethod;
import com.example.LaptopWorld_project.order.entity.PaymentStatus;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import com.example.LaptopWorld_project.review.dto.CreateReviewRequest;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.entity.UserStatus;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test review gate: chi user co order status=delivered voi SP moi review duoc.
 */
class ReviewGateIT extends BaseIntegrationTest {

    @Autowired UserRepository userRepository;
    @Autowired ProductRepository productRepository;
    @Autowired OrderRepository orderRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private User seedUser() {
        User u = new User();
        u.setUsername("rv_" + UUID.randomUUID().toString().substring(0, 8));
        u.setEmail(u.getUsername() + "@laptopworld.local");
        u.setPassword(passwordEncoder.encode("Pass1234"));
        u.setFullName("Review Tester");
        u.setStatus(UserStatus.active);
        u.setEmailVerifiedAt(OffsetDateTime.now());
        return userRepository.save(u);
    }

    /** Lay 1 SP bat ky da seed san (V14 seed 200 SP). */
    private Product firstProduct() {
        return productRepository.findAll().stream()
                .filter(Product::isActive)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Khong tim thay SP nao trong DB"));
    }

    /** Tao 1 order voi status chi dinh + item cho SP. */
    @Transactional
    Order seedOrder(User user, Product product, OrderStatus status) {
        Order o = new Order();
        o.setUser(user);
        o.setCode("ORD-TEST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        o.setSubtotal(product.getEffectivePrice());
        o.setDiscountAmount(BigDecimal.ZERO);
        o.setShippingFee(BigDecimal.ZERO);
        o.setTotal(product.getEffectivePrice());
        o.setStatus(status);
        o.setPaymentMethod(PaymentMethod.cod);
        o.setPaymentStatus(PaymentStatus.unpaid);
        o.setShippingName("Test");
        o.setShippingPhone("0900000000");
        o.setShippingAddress("Test address");

        OrderDetail d = new OrderDetail();
        d.setProduct(product);
        d.setProductName(product.getName());
        d.setQuantity(1);
        d.setPriceAtPurchase(product.getEffectivePrice());
        o.addDetail(d);

        return orderRepository.save(o);
    }

    @Test
    @DisplayName("User chua mua SP — POST review tra 400 NOT_PURCHASED")
    void createReview_userNeverPurchased_returnsNotPurchased() throws Exception {
        User user = seedUser();
        Product product = firstProduct();
        CreateReviewRequest req = new CreateReviewRequest(product.getId(), 5, "Rat tot", null);

        mockMvc.perform(post("/api/reviews")
                        .with(user(new UserPrincipal(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("User co order shipping (chua delivered) — POST review tra 400 NOT_PURCHASED")
    void createReview_orderNotDelivered_returnsNotPurchased() throws Exception {
        User user = seedUser();
        Product product = firstProduct();
        seedOrder(user, product, OrderStatus.shipping);

        CreateReviewRequest req = new CreateReviewRequest(product.getId(), 4, "Test", null);

        mockMvc.perform(post("/api/reviews")
                        .with(user(new UserPrincipal(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("User co order delivered — POST review THANH CONG 200")
    void createReview_orderDelivered_succeeds() throws Exception {
        User user = seedUser();
        Product product = firstProduct();
        seedOrder(user, product, OrderStatus.delivered);

        CreateReviewRequest req = new CreateReviewRequest(product.getId(), 5, "SP tot", null);

        mockMvc.perform(post("/api/reviews")
                        .with(user(new UserPrincipal(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }
}
