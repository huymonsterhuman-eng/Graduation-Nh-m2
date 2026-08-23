package com.example.LaptopWorld_project.inventory.entity;

/**
 * Phiếu xuất kho có 3 trạng thái:
 * - pending:   kho chờ duyệt (FIFO chưa chạy, stock chưa trừ)
 * - completed: kho đã duyệt (FIFO đã chạy, stock đã trừ)
 * - cancelled: kho từ chối hoặc đơn hàng bị hủy sau khi đã trừ (hoàn kho)
 */
public enum GoodsIssueStatus {
    pending,
    completed,
    cancelled
}
