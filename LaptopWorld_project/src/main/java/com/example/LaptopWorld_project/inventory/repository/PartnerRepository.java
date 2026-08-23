package com.example.LaptopWorld_project.inventory.repository;

import com.example.LaptopWorld_project.inventory.entity.Partner;
import com.example.LaptopWorld_project.inventory.entity.PartnerType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartnerRepository extends JpaRepository<Partner, Long> {

    List<Partner> findByTypeOrderByNameAsc(PartnerType type);

    List<Partner> findAllByOrderByNameAsc();

    boolean existsByCode(String code);
}
