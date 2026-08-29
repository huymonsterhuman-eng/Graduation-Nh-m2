package com.example.LaptopWorld_project.inventory.entity;

/**
 * Trạng thái phiếu nhập kho — workflow duyệt (mirror phiếu xuất manual):
 * <ul>
 *   <li>{@code pending}   — mới tạo, chưa cộng stock, {@code remaining_quantity=0}.</li>
 *   <li>{@code completed} — admin duyệt: cộng stock + set {@code remaining=quantity} → available cho FIFO.</li>
 *   <li>{@code cancelled} — admin hủy phiếu pending, không đụng stock.</li>
 * </ul>
 * Đã completed mà nhầm → nhân viên tự tạo Phiếu xuất manual để cân đối, không rollback.
 */
public enum GoodsReceiptStatus {
    pending,
    completed,
    cancelled
}
