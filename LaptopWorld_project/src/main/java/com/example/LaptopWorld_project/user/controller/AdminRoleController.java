package com.example.LaptopWorld_project.user.controller;

import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.user.dto.PermissionDto;
import com.example.LaptopWorld_project.user.dto.RoleDetailDto;
import com.example.LaptopWorld_project.user.dto.RoleListItemDto;
import com.example.LaptopWorld_project.user.dto.RoleRequest;
import com.example.LaptopWorld_project.user.service.PermissionMetadata;
import com.example.LaptopWorld_project.user.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Role (Admin)", description = "Quản lý vai trò & phân quyền — chỉ admin/manage_roles")
@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
public class AdminRoleController {

    private final RoleService roleService;

    @Operation(summary = "Danh sách toàn bộ vai trò (kèm counts)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_roles')")
    public ApiResponse<List<RoleListItemDto>> list() {
        return ApiResponse.ok(roleService.listAll());
    }

    @Operation(summary = "Chi tiết vai trò (kèm list permission codes)")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_roles')")
    public ApiResponse<RoleDetailDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(roleService.findById(id));
    }

    @Operation(summary = "Tạo vai trò mới")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_roles')")
    public ApiResponse<RoleDetailDto> create(@Valid @RequestBody RoleRequest req) {
        return ApiResponse.ok("Tạo vai trò thành công", roleService.create(req));
    }

    @Operation(summary = "Cập nhật vai trò (ADMIN không thể đổi tên và permissions)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_roles')")
    public ApiResponse<RoleDetailDto> update(@PathVariable Long id,
                                             @Valid @RequestBody RoleRequest req) {
        return ApiResponse.ok("Cập nhật thành công", roleService.update(id, req));
    }

    @Operation(summary = "Xóa vai trò (chặn ADMIN + chặn nếu còn user gán)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_roles')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        roleService.delete(id);
        return ApiResponse.message("Đã xóa vai trò");
    }

    @Operation(summary = "Danh sách 30 permission (kèm label + groupName tiếng Việt) — dùng cho form phân quyền")
    @GetMapping("/permissions")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_roles')")
    public ApiResponse<List<PermissionDto>> allPermissions() {
        return ApiResponse.ok(PermissionMetadata.asList());
    }
}
