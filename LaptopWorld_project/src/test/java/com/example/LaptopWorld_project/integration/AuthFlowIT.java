package com.example.LaptopWorld_project.integration;

import com.example.LaptopWorld_project.auth.dto.LoginRequest;
import com.example.LaptopWorld_project.auth.dto.RegisterRequest;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.entity.UserStatus;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import tools.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test luồng auth: register + login.
 * Chạy trên Postgres pgvector container that (Testcontainers).
 */
class AuthFlowIT extends BaseIntegrationTest {

    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private String uniqueUsername() {
        return "u_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    /** Seed 1 user verified voi password co the login duoc — dung cho login test. */
    private User seedVerifiedUser(String username, String rawPassword) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(username + "@laptopworld.local");
        u.setPassword(passwordEncoder.encode(rawPassword));
        u.setFullName("Test User " + username);
        u.setStatus(UserStatus.active);
        u.setEmailVerifiedAt(OffsetDateTime.now());
        return userRepository.save(u);
    }

    @Test
    @DisplayName("Register user moi — 200")
    void register_newUser_returns200() throws Exception {
        String username = uniqueUsername();
        RegisterRequest req = new RegisterRequest(
                username, username + "@laptopworld.local",
                "TestPass123", "Test New", "0900000001");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Register username trung — 4xx")
    void register_duplicateUsername_returns4xx() throws Exception {
        String username = uniqueUsername();
        RegisterRequest req = new RegisterRequest(
                username, username + "@laptopworld.local",
                "TestPass123", "Dup Test", "0900000002");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("Login user verified — 200 + tra accessToken + refreshToken")
    void login_verifiedUser_returnsTokens() throws Exception {
        String username = uniqueUsername();
        seedVerifiedUser(username, "TestPass123");

        LoginRequest req = new LoginRequest(username, "TestPass123");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        JsonNode data = root.has("data") ? root.get("data") : root;
        assertThat(data.get("accessToken").asText()).isNotBlank();
        assertThat(data.get("refreshToken").asText()).isNotBlank();
    }

    @Test
    @DisplayName("Login sai password — 4xx (401)")
    void login_wrongPassword_returns4xx() throws Exception {
        String username = uniqueUsername();
        seedVerifiedUser(username, "CorrectPass123");

        LoginRequest req = new LoginRequest(username, "WrongPass456");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("Login user khong ton tai — 4xx (401)")
    void login_nonExistentUser_returns4xx() throws Exception {
        LoginRequest req = new LoginRequest("ghost_zzz_" + UUID.randomUUID(), "AnyPass123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }
}
