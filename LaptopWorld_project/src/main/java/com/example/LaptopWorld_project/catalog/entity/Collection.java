package com.example.LaptopWorld_project.catalog.entity;

import com.example.LaptopWorld_project.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "collections")
public class Collection extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 160)
    private String slug;

    @Column(length = 500)
    private String image;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Collection parent;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "home_position", nullable = false, length = 20)
    private HomePosition homePosition = HomePosition.NONE;

    /** Toggle độc lập — 1 collection có thể vừa là chip vừa là "nổi bật". */
    @Column(name = "is_featured", nullable = false)
    private boolean isFeatured = false;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @ManyToMany
    @JoinTable(
        name = "collection_product",
        joinColumns = @JoinColumn(name = "collection_id"),
        inverseJoinColumns = @JoinColumn(name = "product_id")
    )
    private Set<Product> products = new HashSet<>();
}
