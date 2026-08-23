package com.example.LaptopWorld_project.order.mapper;

import com.example.LaptopWorld_project.order.dto.OrderDetailDto;
import com.example.LaptopWorld_project.order.dto.OrderListItemDto;
import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.entity.OrderDetail;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

@Mapper
public interface OrderMapper {

    @Mapping(target = "itemCount", source = "details", qualifiedByName = "sumQuantity")
    OrderListItemDto toListItem(Order entity);

    @Mapping(target = "userId",       source = "user.id")
    @Mapping(target = "username",     source = "user.username")
    @Mapping(target = "voucherCode",  source = "voucher.code")
    @Mapping(target = "items",        source = "details")
    OrderDetailDto toDetail(Order entity);

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "lineTotal", expression = "java(entity.getLineTotal())")
    OrderDetailDto.OrderItemDto toItemDto(OrderDetail entity);

    @Named("sumQuantity")
    default int sumQuantity(List<OrderDetail> details) {
        return details == null ? 0 : details.stream().mapToInt(OrderDetail::getQuantity).sum();
    }
}
