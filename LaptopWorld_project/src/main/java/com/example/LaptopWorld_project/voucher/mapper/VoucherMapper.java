package com.example.LaptopWorld_project.voucher.mapper;

import com.example.LaptopWorld_project.voucher.dto.VoucherDto;
import com.example.LaptopWorld_project.voucher.entity.Voucher;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface VoucherMapper {

    @Mapping(target = "isActive", source = "active")
    @Mapping(target = "isSaved",  ignore = true)
    VoucherDto toDto(Voucher entity);
}
