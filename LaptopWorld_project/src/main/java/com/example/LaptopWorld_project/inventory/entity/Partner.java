package com.example.LaptopWorld_project.inventory.entity;

import com.example.LaptopWorld_project.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "partners")
public class Partner extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String name;

    /** Mã ĐVVC — 2-5 ký tự in hoa, dùng sinh tracking number. VD: GHN, VP, JT */
    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PartnerType type;

    @Column(length = 20)
    private String phone;

    @Column(length = 150)
    private String email;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
