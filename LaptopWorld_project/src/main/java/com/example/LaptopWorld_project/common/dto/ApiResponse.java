package com.example.LaptopWorld_project.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

/**
 * Wrapper thong nhat cho moi API response.
 *   success: true/false
 *   message: mo ta ngan
 *   data:    payload chinh khi thanh cong
 *   errors:  chi tiet loi khi that bai (field -> message hoac list message chung)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        Map<String, List<String>> errors
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, null, data, null);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    public static ApiResponse<Void> message(String message) {
        return new ApiResponse<>(true, message, null, null);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null, null);
    }

    public static <T> ApiResponse<T> error(String message, Map<String, List<String>> errors) {
        return new ApiResponse<>(false, message, null, errors);
    }
}
