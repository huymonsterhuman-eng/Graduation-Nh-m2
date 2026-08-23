package com.example.LaptopWorld_project.user.entity;

/**
 * Ten enum viet thuong de trung khop voi CHECK constraint trong DB
 * (users.status IN ('active','banned','unverified')). @Enumerated(EnumType.STRING)
 * se luu ten enum truc tiep — khong can converter.
 */
public enum UserStatus {
    active,
    banned,
    unverified
}
