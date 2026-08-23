package com.example.LaptopWorld_project.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Exception nghiep vu chung. Cac exception khac ke thua tu day.
 * Mac dinh HTTP 400. GlobalExceptionHandler doc statusCode de tra ve.
 */
@Getter
public class BusinessException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public BusinessException(String message) {
        this(HttpStatus.BAD_REQUEST, "BUSINESS_ERROR", message);
    }

    public BusinessException(String code, String message) {
        this(HttpStatus.BAD_REQUEST, code, message);
    }

    public BusinessException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
