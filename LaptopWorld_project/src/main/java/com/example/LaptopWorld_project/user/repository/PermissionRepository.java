package com.example.LaptopWorld_project.user.repository;

import com.example.LaptopWorld_project.user.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByCode(String code);
    java.util.List<Permission> findAllByCodeIn(java.util.Collection<String> codes);
}
