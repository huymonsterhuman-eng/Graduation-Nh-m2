package com.example.LaptopWorld_project.user.mapper;

import com.example.LaptopWorld_project.user.dto.AddressDto;
import com.example.LaptopWorld_project.user.entity.Address;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper
public interface AddressMapper {

    @Mapping(target = "isDefault", source = "default")
    AddressDto toDto(Address entity);

    List<AddressDto> toDtoList(List<Address> entities);
}
