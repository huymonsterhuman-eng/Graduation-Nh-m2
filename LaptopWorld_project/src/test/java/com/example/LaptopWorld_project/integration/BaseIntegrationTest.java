package com.example.LaptopWorld_project.integration;

import com.example.LaptopWorld_project.ai.gemini.GeminiClient;
import com.example.LaptopWorld_project.auth.service.MailService;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Base class cho integration test:
 *  - Khoi tao 1 container pgvector STATIC (share cho ca suite → chi start 1 lan)
 *  - Flyway tu chay V1-V20 tren container
 *  - Load full Spring context (SpringBootTest)
 *  - MockMvc san sang (khong can start server that)
 *  - Mock GeminiClient + MailService de khong goi API/gui email that
 *
 * Yeu cau: Docker Desktop phai bat.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    // Static → JVM chi start 1 container cho toan bo suite
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
            DockerImageName.parse("pgvector/pgvector:pg16")
                    .asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("laptopworld_test")
            .withUsername("test_user")
            .withPassword("test_pw")
            .withReuse(true);

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;

    // Mock GeminiClient — khong goi API Gemini that
    @MockitoBean protected GeminiClient geminiClient;
    // Mock MailService — khong gui email that
    @MockitoBean protected MailService mailService;
}
