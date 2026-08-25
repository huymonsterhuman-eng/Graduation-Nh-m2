package com.example.LaptopWorld_project.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * VNPay sandbox credentials + endpoints.
 * Load từ application-local.properties (gitignored) — Phase 10.
 *
 * Đăng ký sandbox: https://sandbox.vnpayment.vn/devreg
 * Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * @param tmnCode      Mã website merchant (do VNPay cấp)
 * @param hashSecret   Secret key để ký HMAC-SHA512 checksum
 * @param payUrl       URL redirect khách sang VNPay để nhập thẻ
 *                     (sandbox: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html)
 * @param returnUrl    URL FE nhận query params khi khách quay về sau thanh toán
 *                     (dev: http://localhost:5173/thanh-toan/vnpay/ket-qua)
 * @param apiUrl       URL API tra soát giao dịch (optional, dùng cho refund/query)
 * @param version      VNPay API version (mặc định "2.1.0")
 * @param command      "pay" cho thanh toán thường
 * @param currCode     "VND"
 * @param locale       "vn"
 * @param orderType    Loại hàng hóa — 250000 = "Khac" theo bảng VNPay
 */
@ConfigurationProperties(prefix = "app.payment.vnpay")
public record VnpayProperties(
        String tmnCode,
        String hashSecret,
        String payUrl,
        String returnUrl,
        String apiUrl,
        String version,
        String command,
        String currCode,
        String locale,
        String orderType
) {}
