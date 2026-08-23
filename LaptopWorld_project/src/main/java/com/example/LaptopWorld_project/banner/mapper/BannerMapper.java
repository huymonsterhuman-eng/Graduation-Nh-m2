package com.example.LaptopWorld_project.banner.mapper;

import com.example.LaptopWorld_project.banner.dto.BannerDto;
import com.example.LaptopWorld_project.banner.entity.Banner;
import org.mapstruct.Mapper;

@Mapper
public interface BannerMapper {

    default BannerDto toDto(Banner b) {
        if (b == null) return null;
        return new BannerDto(
                b.getId(),
                b.getTitle(),
                b.getImage(),
                b.getLink(),
                b.getSortOrder(),
                b.isActive(),
                b.getAuthor() != null ? b.getAuthor().getId() : null,
                b.getAuthor() != null ? b.getAuthor().getFullName() : null,
                b.getCreatedAt(),
                b.getUpdatedAt()
        );
    }
}
