package com.example.LaptopWorld_project.voucher.entity;

public enum VoucherType {
    fixed,     // discount_amount là VND cố định
    percent    // discount_amount là % (0-100), có max_discount cap
}
