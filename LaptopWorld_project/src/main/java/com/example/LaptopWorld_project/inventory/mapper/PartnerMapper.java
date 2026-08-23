package com.example.LaptopWorld_project.inventory.mapper;

import com.example.LaptopWorld_project.inventory.dto.PartnerDto;
import com.example.LaptopWorld_project.inventory.entity.Partner;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface PartnerMapper {

    @Mapping(target = "isActive", source = "active")
    PartnerDto toDto(Partner entity);
}
