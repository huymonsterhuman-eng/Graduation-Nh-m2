package com.example.LaptopWorld_project.order.service;

import com.example.LaptopWorld_project.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Sinh mã đơn dạng ORD-YYYYMMDD-NNN.
 * NNN = số đơn tạo trong ngày + 1, padded 3 số.
 *
 * Race condition: nếu 2 request cùng lúc, có thể sinh cùng mã.
 * Unique constraint trên orders.code sẽ throw DataIntegrityViolationException,
 * CheckoutService bắt và retry với số tiếp theo.
 */
@Component
@RequiredArgsConstructor
public class OrderCodeGenerator {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private final OrderRepository orderRepository;

    public String next() {
        LocalDate today = LocalDate.now();
        OffsetDateTime startOfDay = today.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime startOfNextDay = today.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        long count = orderRepository.countByCreatedAtBetween(startOfDay, startOfNextDay);
        return String.format("ORD-%s-%03d", today.format(DATE_FMT), count + 1);
    }
}
