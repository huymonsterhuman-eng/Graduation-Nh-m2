package com.example.LaptopWorld_project.order.entity;

/**
 * Lifecycle:
 *   pending → confirmed → preparing → shipping → delivered
 *                            ↕                ↘ cancelled
 *                     (kho reject phiếu xuất
 *                      → order về confirmed)
 *
 * Bước preparing tự tạo phiếu xuất kho (goods_issue) trạng thái pending.
 * Kho duyệt phiếu → order tự chuyển shipping. Kho từ chối → order về confirmed.
 */
public enum OrderStatus {
    pending,
    confirmed,
    preparing,
    shipping,
    delivered,
    cancelled
}
