package com.example.LaptopWorld_project.integration;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.order.dto.AddToCartRequest;
import com.example.LaptopWorld_project.order.dto.CheckoutRequest;
import com.example.LaptopWorld_project.order.entity.PaymentMethod;
import com.example.LaptopWorld_project.user.entity.Address;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.entity.UserStatus;
import com.example.LaptopWorld_project.user.repository.AddressRepository;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test luong Cart + Checkout end-to-end qua REST endpoint.
 */
class OrderFlowIT extends BaseIntegrationTest {

    @Autowired UserRepository userRepository;
    @Autowired ProductRepository productRepository;
    @Autowired AddressRepository addressRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private User seedUser() {
        User u = new User();
        u.setUsername("ord_" + UUID.randomUUID().toString().substring(0, 8));
        u.setEmail(u.getUsername() + "@laptopworld.local");
        u.setPassword(passwordEncoder.encode("Pass1234"));
        u.setFullName("Order Tester");
        u.setStatus(UserStatus.active);
        u.setEmailVerifiedAt(OffsetDateTime.now());
        return userRepository.save(u);
    }

    private Address seedAddress(User user) {
        Address a = new Address();
        a.setUser(user);
        a.setName("Test");
        a.setPhone("0900000000");
        a.setAddress("123 Test");
        a.setWard("P1");
        a.setDistrict("Q1");
        a.setProvince("TPHCM");
        a.setDefault(true);
        return addressRepository.save(a);
    }

    private Product firstActiveProduct() {
        return productRepository.findAll().stream()
                .filter(Product::isActive)
                .filter(p -> p.getAvailableStock() > 0)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Khong co SP con hang"));
    }

    @Test
    @DisplayName("Checkout khi cart rong — 400 EMPTY_CART")
    void checkout_emptyCart_returns400() throws Exception {
        User user = seedUser();
        Address addr = seedAddress(user);
        CheckoutRequest req = new CheckoutRequest(
                addr.getId(), PaymentMethod.cod, null,
                "standard", new BigDecimal("30000"), null);

        mockMvc.perform(post("/api/checkout")
                        .with(user(new UserPrincipal(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Add to cart — 200 + cart co 1 item")
    void addToCart_returnsCartWithItem() throws Exception {
        User user = seedUser();
        Product product = firstActiveProduct();
        AddToCartRequest req = new AddToCartRequest(product.getId(), 2);

        mockMvc.perform(post("/api/cart/items")
                        .with(user(new UserPrincipal(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Full flow: add cart → checkout → order tao thanh cong voi code + status pending")
    void fullCheckoutFlow_createsOrder() throws Exception {
        User user = seedUser();
        Address addr = seedAddress(user);
        Product product = firstActiveProduct();

        // 1. Add to cart
        mockMvc.perform(post("/api/cart/items")
                        .with(user(new UserPrincipal(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AddToCartRequest(product.getId(), 1))))
                .andExpect(status().isOk());

        // 2. Checkout
        CheckoutRequest req = new CheckoutRequest(
                addr.getId(), PaymentMethod.cod, null,
                "standard", new BigDecimal("30000"), "Ghi chu test");

        mockMvc.perform(post("/api/checkout")
                        .with(user(new UserPrincipal(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.order.code").isNotEmpty())
                .andExpect(jsonPath("$.data.order.status").value("pending"))
                .andExpect(jsonPath("$.data.paymentUrl").doesNotExist());
    }

    @Test
    @DisplayName("List orders cua current user — 200 + array")
    void listMyOrders_returnsArray() throws Exception {
        User user = seedUser();

        mockMvc.perform(get("/api/orders")
                        .with(user(new UserPrincipal(user))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
