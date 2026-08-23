package com.example.LaptopWorld_project.inventory.util;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Sinh mã vận đơn theo format: {partnerCode}{yyMMdd}{5 random digits}
 * Ví dụ: GHN26081912345
 *
 * Không dấu, không space, không dash. 5 chữ số cuối random (00000-99999).
 */
public final class TrackingNumberGenerator {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyMMdd");

    private TrackingNumberGenerator() {}

    public static String generate(String partnerCode) {
        if (partnerCode == null || partnerCode.isBlank()) partnerCode = "SHIP";
        String date = LocalDate.now().format(DATE_FMT);
        int rand = ThreadLocalRandom.current().nextInt(0, 100_000);
        return partnerCode.toUpperCase() + date + String.format("%05d", rand);
    }
}
