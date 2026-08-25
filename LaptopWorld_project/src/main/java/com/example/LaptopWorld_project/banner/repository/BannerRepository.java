package com.example.LaptopWorld_project.banner.repository;

import com.example.LaptopWorld_project.banner.entity.Banner;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Long> {

    /** Public: chỉ banner đang bật, sort tăng dần theo sort_order. */
    List<Banner> findByIsActiveTrueOrderBySortOrderAscIdAsc();

    /** Public: banner đang bật ở slot cụ thể. */
    List<Banner> findByIsActiveTrueAndPositionOrderBySortOrderAscIdAsc(String position);

    /** Public: banner đầu tiên đang bật ở slot cụ thể (dùng cho sidebar chỉ hiện 1 banner). */
    java.util.Optional<Banner> findFirstByIsActiveTrueAndPositionOrderBySortOrderAscIdAsc(String position);

    /** Admin: tất cả banner, sort giống public để consistent. */
    @EntityGraph(attributePaths = {"author"})
    List<Banner> findAllByOrderBySortOrderAscIdAsc();
}
