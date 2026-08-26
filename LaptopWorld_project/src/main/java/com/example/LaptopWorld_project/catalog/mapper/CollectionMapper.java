package com.example.LaptopWorld_project.catalog.mapper;

import com.example.LaptopWorld_project.catalog.dto.CollectionDto;
import com.example.LaptopWorld_project.catalog.entity.Collection;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;
import java.util.Set;

@Mapper
public interface CollectionMapper {

    @Mapping(target = "parentId",     source = "parent.id")
    @Mapping(target = "isActive",     source = "active")
    @Mapping(target = "isFeatured",   source = "featured")
    @Mapping(target = "productCount", source = "products", qualifiedByName = "countProducts")
    CollectionDto toDto(Collection entity);

    List<CollectionDto> toDtoList(List<Collection> entities);

    @Named("countProducts")
    default int countProducts(Set<?> products) {
        return products == null ? 0 : products.size();
    }
}
