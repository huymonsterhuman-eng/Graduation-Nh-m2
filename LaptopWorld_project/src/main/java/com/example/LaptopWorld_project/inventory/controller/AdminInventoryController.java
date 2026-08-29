package com.example.LaptopWorld_project.inventory.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.inventory.dto.CreateManualIssueRequest;
import com.example.LaptopWorld_project.inventory.dto.GoodsIssueDto;
import com.example.LaptopWorld_project.inventory.dto.GoodsIssueListItemDto;
import com.example.LaptopWorld_project.inventory.dto.ProductStockSummaryDto;
import com.example.LaptopWorld_project.inventory.dto.RejectIssueRequest;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssue;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueStatus;
import com.example.LaptopWorld_project.catalog.service.ReservedStockAuditService;
import com.example.LaptopWorld_project.inventory.service.InventoryQueryService;
import com.example.LaptopWorld_project.inventory.service.InventoryService;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Inventory (Admin)", description = "Xem tồn kho + duyệt/từ chối phiếu xuất — chỉ admin/staff")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminInventoryController {

    private final InventoryQueryService inventoryQueryService;
    private final InventoryService inventoryService;
    private final UserRepository userRepository;
    private final ReservedStockAuditService reservedStockAuditService;

    @Operation(summary = "Xem tồn kho theo lô của 1 sản phẩm (FIFO, cũ nhất trước)")
    @GetMapping("/inventory/products/{productId}/batches")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_inventory')")
    public ApiResponse<ProductStockSummaryDto> productBatches(@PathVariable Long productId) {
        return ApiResponse.ok(inventoryQueryService.getProductBatches(productId));
    }

    @Operation(summary = "Danh sách phiếu xuất kho — filter theo status + type")
    @GetMapping("/goods-issues")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_goods_issue')")
    public ApiResponse<PagedResponse<GoodsIssueListItemDto>> listIssues(
            @RequestParam(required = false) GoodsIssueStatus status,
            @RequestParam(required = false) com.example.LaptopWorld_project.inventory.entity.GoodsIssueType type,
            @PageableDefault(size = 20, sort = "createdAt",
                    direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.ok(inventoryQueryService.listIssues(status, type, pageable));
    }

    @Operation(summary = "Đếm phiếu xuất theo type + status — dùng cho tabs")
    @GetMapping("/goods-issues/counts")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_goods_issue')")
    public ApiResponse<java.util.Map<String, Long>> issueCounts() {
        return ApiResponse.ok(inventoryQueryService.countByTypeAndStatus());
    }

    @Operation(summary = "Chi tiết phiếu xuất kho (kèm batch nguồn)")
    @GetMapping("/goods-issues/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_goods_issue')")
    public ApiResponse<GoodsIssueDto> issueDetail(@PathVariable Long id) {
        return ApiResponse.ok(inventoryQueryService.findIssueById(id));
    }

    @Operation(summary = "Kho duyệt phiếu xuất — chạy FIFO + gán ĐVVC + sinh tracking + đẩy đơn sang Đang giao (auto)")
    @PostMapping("/goods-issues/{id}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_goods_issue')")
    public ApiResponse<GoodsIssueDto> approve(@PathVariable Long id,
                                              @RequestBody(required = false) java.util.Map<String, Object> body,
                                              @AuthenticationPrincipal UserPrincipal me) {
        User actor = userRepository.findById(me.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", me.getId()));
        Long shippingPartnerId = null;
        if (body != null && body.get("shippingPartnerId") != null) {
            Object v = body.get("shippingPartnerId");
            shippingPartnerId = v instanceof Number n ? n.longValue() : Long.parseLong(v.toString());
        }
        GoodsIssue saved = inventoryService.approveIssue(id, actor, shippingPartnerId);
        // Reload qua query service để trigger EntityGraph + lazy load images trong transaction
        return ApiResponse.ok("Đã duyệt phiếu xuất kho", inventoryQueryService.findIssueById(saved.getId()));
    }

    @Operation(summary = "Kho từ chối phiếu xuất — auto phiếu thì đưa đơn về Đã xác nhận để sales xử lý")
    @PostMapping("/goods-issues/{id}/reject")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_goods_issue')")
    public ApiResponse<GoodsIssueDto> reject(@PathVariable Long id,
                                             @Valid @RequestBody(required = false) RejectIssueRequest req) {
        String reason = req != null ? req.reason() : null;
        GoodsIssue saved = inventoryService.rejectIssue(id, reason);
        return ApiResponse.ok("Đã từ chối phiếu xuất kho", inventoryQueryService.findIssueById(saved.getId()));
    }

    @Operation(summary = "Admin tạo phiếu xuất kho manual (không gắn đơn hàng) — vd xuất hủy, tặng quà. Vẫn cần approve để trừ kho")
    @PostMapping("/goods-issues")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_goods_issue')")
    public ApiResponse<GoodsIssueDto> createManual(@Valid @RequestBody CreateManualIssueRequest req,
                                                   @AuthenticationPrincipal UserPrincipal me) {
        User author = userRepository.findById(me.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", me.getId()));
        GoodsIssue saved = inventoryService.createManualPendingIssue(req, author);
        return ApiResponse.ok("Đã tạo phiếu xuất manual (chờ duyệt)",
                inventoryQueryService.findIssueById(saved.getId()));
    }

    @Operation(summary = "Kiểm toán reserved_stock — đối chiếu con số hệ thống vs đếm lại từ đơn active")
    @PostMapping("/inventory/reserved-stock-audit")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_inventory')")
    public ApiResponse<java.util.List<ReservedStockAuditService.MismatchRow>> runReservedStockAudit() {
        var rows = reservedStockAuditService.runAudit();
        String msg = rows.isEmpty()
                ? "Kho sạch — không có SP nào lệch reserved_stock"
                : "Phát hiện " + rows.size() + " SP lệch reserved_stock";
        return ApiResponse.ok(msg, rows);
    }
}
