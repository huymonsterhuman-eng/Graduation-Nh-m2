package com.example.LaptopWorld_project.user.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.order.dto.OrderListItemDto;
import com.example.LaptopWorld_project.review.dto.ReviewDto;
import com.example.LaptopWorld_project.user.dto.AdminUserDetailDto;
import com.example.LaptopWorld_project.user.dto.AdminUserListItemDto;
import com.example.LaptopWorld_project.user.dto.AdminUserStatsDto;
import com.example.LaptopWorld_project.user.dto.AdminUserVoucherDto;
import com.example.LaptopWorld_project.user.dto.CreateUserRequest;
import com.example.LaptopWorld_project.user.dto.SetUserRolesRequest;
import com.example.LaptopWorld_project.user.dto.SetUserStatusRequest;
import com.example.LaptopWorld_project.user.dto.UpdateUserRequest;

import java.util.List;
import com.example.LaptopWorld_project.user.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Users management cho admin — Sprint 9G Bước A.
 *
 * Cùng base path /api/admin/users với {@link com.example.LaptopWorld_project.admin.controller.AdminUserSearchController}
 * (đã có endpoint /search cho picker AdminCreateOrderPage). Spring cho phép 2
 * controller cùng base miễn full path không trùng — ở đây picker giữ /search,
 * còn management dùng "", /{id}, /{id}/status, /{id}/roles.
 */
@Tag(name = "Admin Users", description = "Quản lý khách hàng — khóa/mở, gán vai trò")
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @Operation(summary = "List user paginated + filter (keyword/status/roleId)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_users')")
    public ApiResponse<PagedResponse<AdminUserListItemDto>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long roleId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        Page<AdminUserListItemDto> page = adminUserService.list(keyword, status, roleId, pageable);
        return ApiResponse.ok(PagedResponse.from(page));
    }

    @Operation(summary = "Tạo user mới (admin nhập password, auto verified)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_users')")
    public ApiResponse<AdminUserDetailDto> create(@Valid @RequestBody CreateUserRequest req) {
        return ApiResponse.ok("Tạo người dùng thành công", adminUserService.create(req));
    }

    @Operation(summary = "Cập nhật thông tin cá nhân (fullName/phone/gender/birthday) — không đổi username/email/password")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_users')")
    public ApiResponse<AdminUserDetailDto> update(@PathVariable Long id,
                                                  @Valid @RequestBody UpdateUserRequest req) {
        return ApiResponse.ok("Cập nhật thành công", adminUserService.update(id, req));
    }

    @Operation(summary = "5 KPI cho trang danh sách (total/active/banned/unverified/newThisWeek)")
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_users')")
    public ApiResponse<AdminUserStatsDto> stats() {
        return ApiResponse.ok(adminUserService.stats());
    }

    @Operation(summary = "Chi tiết user + stats (orderCount / reviewCount / totalSpent)")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_users')")
    public ApiResponse<AdminUserDetailDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(adminUserService.findById(id));
    }

    @Operation(summary = "Lịch sử mua hàng của user — dùng tab 'Lịch sử mua hàng' ở trang chi tiết admin")
    @GetMapping("/{id}/orders")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_users')")
    public ApiResponse<PagedResponse<OrderListItemDto>> orders(
            @PathVariable Long id,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ApiResponse.ok(PagedResponse.from(adminUserService.ordersOfUser(id, pageable)));
    }

    @Operation(summary = "Toàn bộ đánh giá user đã viết")
    @GetMapping("/{id}/reviews")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_users')")
    public ApiResponse<List<ReviewDto>> reviews(@PathVariable Long id) {
        return ApiResponse.ok(adminUserService.reviewsOfUser(id));
    }

    @Operation(summary = "Kho voucher của user — cả đã dùng và chưa")
    @GetMapping("/{id}/vouchers")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('view_users')")
    public ApiResponse<List<AdminUserVoucherDto>> vouchers(@PathVariable Long id) {
        return ApiResponse.ok(adminUserService.vouchersOfUser(id));
    }

    @Operation(summary = "Đổi trạng thái user (active|banned|unverified) — có guard CANNOT_BAN_SELF + LAST_ADMIN_LOCKED")
    @PostMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_users')")
    public ApiResponse<AdminUserDetailDto> setStatus(
            @PathVariable Long id,
            @Valid @RequestBody SetUserStatusRequest req,
            @AuthenticationPrincipal UserPrincipal me) {
        Long actorId = me != null ? me.getId() : null;
        return ApiResponse.ok("Cập nhật trạng thái thành công",
                adminUserService.setStatus(id, req.status(), actorId));
    }

    @Operation(summary = "Gán/thay vai trò user — có guard CANNOT_REMOVE_OWN_ADMIN + LAST_ADMIN_LOCKED + ROLE_NOT_FOUND")
    @PostMapping("/{id}/roles")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('assign_user_roles')")
    public ApiResponse<AdminUserDetailDto> setRoles(
            @PathVariable Long id,
            @Valid @RequestBody SetUserRolesRequest req,
            @AuthenticationPrincipal UserPrincipal me) {
        Long actorId = me != null ? me.getId() : null;
        return ApiResponse.ok("Cập nhật vai trò thành công",
                adminUserService.setRoles(id, req.roleIds(), actorId));
    }
}
