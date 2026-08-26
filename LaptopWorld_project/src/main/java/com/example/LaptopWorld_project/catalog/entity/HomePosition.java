package com.example.LaptopWorld_project.catalog.entity;

/**
 * Vị trí hiển thị Collection trên trang chủ.
 * FE render section tương ứng dựa vào giá trị này.
 */
public enum HomePosition {
    /** Không hiển thị vào section chip nào — vẫn có thể là featured (toggle isFeatured riêng). */
    NONE,
    /** Chip filter trong section Điện thoại. */
    PHONE_CHIP,
    /** Chip filter trong section Laptop. */
    LAPTOP_CHIP;
}
