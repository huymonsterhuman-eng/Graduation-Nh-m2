package com.example.LaptopWorld_project.inventory.mapper;

import com.example.LaptopWorld_project.inventory.dto.PartnerDto;
import com.example.LaptopWorld_project.inventory.entity.Partner;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface PartnerMapper {

    /**
     * receiptCount + orderCount không map ở đây — service tự set qua
     * {@link #withCounts(PartnerDto, long, long)} (bulk count 1 query khi list).
     */
    @Mapping(target = "isActive", source = "active")
    @Mapping(target = "receiptCount", ignore = true)
    @Mapping(target = "orderCount", ignore = true)
    PartnerDto toDto(Partner entity);

    /** Java record immutable — copy toàn bộ + set 2 count. */
    default PartnerDto withCounts(PartnerDto base, long receiptCount, long orderCount) {
        return new PartnerDto(
                base.id(),
                base.name(),
                base.code(),
                base.type(),
                base.phone(),
                base.email(),
                base.address(),
                base.isActive(),
                receiptCount,
                orderCount,
                base.createdAt(),
                base.updatedAt()
        );
    }
}
