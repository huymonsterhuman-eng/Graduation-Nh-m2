package com.example.LaptopWorld_project.catalog.mapper;

import com.example.LaptopWorld_project.catalog.dto.BrandDto;
import com.example.LaptopWorld_project.catalog.entity.Brand;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper
public interface BrandMapper {

    // Field entity `boolean isActive` -> Lombok bean property = "active"
    // Record component `isActive` -> MapStruct dùng name trực tiếp = "isActive"
    // -> Mismatch. Cần map explicit.
    @Mapping(target = "isActive", source = "active")
    BrandDto toDto(Brand entity);

    List<BrandDto> toDtoList(List<Brand> entities);
}
