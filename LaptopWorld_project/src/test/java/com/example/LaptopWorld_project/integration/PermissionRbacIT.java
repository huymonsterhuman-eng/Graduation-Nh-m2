package com.example.LaptopWorld_project.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test RBAC — @PreAuthorize enforce ADMIN bypass + permission code.
 * Dung SecurityMockMvcRequestPostProcessors.user() de gia lap user voi authorities cu the.
 */
class PermissionRbacIT extends BaseIntegrationTest {

    @Test
    @DisplayName("ADMIN role — bypass moi permission, GET /api/admin/products OK")
    void admin_bypass_accessAdminProducts() throws Exception {
        mockMvc.perform(get("/api/admin/products")
                        .with(user("admin_fake").authorities(
                                new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    @DisplayName("STAFF co view_products — GET /api/admin/products OK")
    void staff_withViewProducts_canReadProducts() throws Exception {
        mockMvc.perform(get("/api/admin/products")
                        .with(user("staff_fake").authorities(
                                new SimpleGrantedAuthority("view_products"))))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    @DisplayName("STAFF chi co view_products — GET /api/admin/users tra 403")
    void staff_withoutViewUsers_forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .with(user("staff_fake").authorities(
                                new SimpleGrantedAuthority("view_products"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("User khong login — GET /api/admin/products tra 401")
    void anonymous_forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/products"))
                .andExpect(status().is4xxClientError());
    }
}
