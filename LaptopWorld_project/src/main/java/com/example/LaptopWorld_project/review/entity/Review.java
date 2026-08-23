package com.example.LaptopWorld_project.review.entity;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.common.entity.BaseEntity;
import com.example.LaptopWorld_project.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "reviews", uniqueConstraints = {
        @UniqueConstraint(name = "ux_reviews_user_product", columnNames = {"user_id", "product_id"})
})
public class Review extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private short rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    /** JSONB mảng URL ảnh — hiện chỉ dùng 1 phần tử nhưng schema hỗ trợ nhiều để mở rộng sau. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> images;

    @Column(name = "is_hidden", nullable = false)
    private boolean isHidden = false;

    @Column(name = "admin_reply", columnDefinition = "TEXT")
    private String adminReply;
}
