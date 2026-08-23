package com.example.LaptopWorld_project.common.util;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Sinh slug URL-friendly từ tiếng Việt.
 *   "Điện thoại iPhone 15 Pro Max" → "dien-thoai-iphone-15-pro-max"
 */
public final class SlugGenerator {

    private SlugGenerator() {}

    public static String slugify(String input) {
        if (input == null) return null;
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("đ", "d")
                .replaceAll("Đ", "D");
        String lower = normalized.toLowerCase(Locale.ROOT);
        String slug = lower.replaceAll("[^a-z0-9]+", "-")
                           .replaceAll("^-|-$", "");
        return slug.isEmpty() ? "n-a" : slug;
    }
}
