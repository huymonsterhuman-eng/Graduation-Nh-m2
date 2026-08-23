package com.example.LaptopWorld_project.catalog.dto;

import java.util.List;

/**
 * Node cho endpoint /api/catalog/categories/tree. Recursive children.
 */
public record CategoryTreeDto(
        Long id,
        String name,
        String slug,
        String image,
        int sortOrder,
        List<CategoryTreeDto> children
) {}
