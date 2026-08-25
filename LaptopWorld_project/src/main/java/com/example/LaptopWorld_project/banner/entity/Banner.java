package com.example.LaptopWorld_project.banner.entity;

import com.example.LaptopWorld_project.common.entity.BaseEntity;
import com.example.LaptopWorld_project.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "banners")
public class Banner extends BaseEntity {

    @Column(length = 255)
    private String title;

    @Column(nullable = false, length = 500)
    private String image;

    @Column(length = 500)
    private String link;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    /**
     * Vị trí slot trên trang chủ: 'hero_carousel', 'sidebar_phone', 'sidebar_laptop', v.v.
     * Null = coi như carousel (backward compat với banner cũ trước V23).
     */
    @Column(length = 50)
    private String position;

    /** Cách hiển thị ảnh khi tỷ lệ khác khung: 'cover' (crop lấp đầy) | 'contain' (fit toàn ảnh). */
    @Column(name = "image_fit", nullable = false, length = 10)
    private String imageFit = "cover";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;
}
