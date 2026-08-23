package com.example.LaptopWorld_project.user.repository;

import com.example.LaptopWorld_project.user.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
    boolean existsByName(String name);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"permissions"})
    Optional<Role> findWithPermissionsById(Long id);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"permissions"})
    java.util.List<Role> findAllByOrderByNameAsc();

    /** Đếm số user đang gán role này (dùng cho list + chặn xóa). */
    @org.springframework.data.jpa.repository.Query(
        "SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.id = :roleId")
    long countUsersByRoleId(@org.springframework.data.repository.query.Param("roleId") Long roleId);
}
