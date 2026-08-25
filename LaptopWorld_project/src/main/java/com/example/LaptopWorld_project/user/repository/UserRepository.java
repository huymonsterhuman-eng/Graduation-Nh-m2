package com.example.LaptopWorld_project.user.repository;

import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.entity.UserStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>,
                                        JpaSpecificationExecutor<User> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    /**
     * Load user cung roles + permissions trong 1 query (dung boi UserDetailsService).
     */
    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Optional<User> findWithRolesByUsername(String username);

    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Optional<User> findWithRolesByEmail(String email);

    /** Search top-N user theo username/email/fullName cho admin picker. */
    @Query("""
            SELECT u FROM User u
            WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :kw, '%'))
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :kw, '%'))
               OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :kw, '%'))
            ORDER BY u.username ASC
            """)
    java.util.List<User> searchUsers(@Param("kw") String keyword,
                                      org.springframework.data.domain.Pageable pageable);

    long countByStatus(UserStatus status);

    long countByCreatedAtGreaterThanEqual(OffsetDateTime from);
}
