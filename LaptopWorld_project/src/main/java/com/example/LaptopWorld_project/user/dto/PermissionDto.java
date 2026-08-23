package com.example.LaptopWorld_project.user.dto;

/**
 * Metadata 1 permission cho form phân quyền — kèm label + groupName tiếng Việt
 * để FE render tabs theo nhóm.
 */
public record PermissionDto(
        String code,          // 'view_products'
        String label,         // '👁️ Xem danh sách sản phẩm'
        String groupName      // 'Sản phẩm & Nội dung'
) {}
