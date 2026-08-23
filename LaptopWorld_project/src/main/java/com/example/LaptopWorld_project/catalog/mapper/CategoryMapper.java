package com.example.LaptopWorld_project.catalog.mapper;

import com.example.LaptopWorld_project.catalog.dto.CategoryDto;
import com.example.LaptopWorld_project.catalog.entity.Category;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper
public interface CategoryMapper {

    @Mapping(target = "parentId",   source = "parent.id")
    @Mapping(target = "parentName", source = "parent.name")
    @Mapping(target = "isActive",   source = "active")
    CategoryDto toDto(Category entity);

    List<CategoryDto> toDtoList(List<Category> entities);
}
