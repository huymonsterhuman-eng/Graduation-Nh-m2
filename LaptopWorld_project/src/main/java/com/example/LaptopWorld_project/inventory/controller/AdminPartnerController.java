package com.example.LaptopWorld_project.inventory.controller;

import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.inventory.dto.PartnerDto;
import com.example.LaptopWorld_project.inventory.dto.PartnerRequest;
import com.example.LaptopWorld_project.inventory.entity.PartnerType;
import com.example.LaptopWorld_project.inventory.service.PartnerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Partner (Admin)", description = "CRUD đối tác (nhà cung cấp / đơn vị vận chuyển)")
@RestController
@RequestMapping("/api/admin/partners")
@RequiredArgsConstructor
public class AdminPartnerController {

    private final PartnerService partnerService;

    @Operation(summary = "Danh sách đối tác (filter theo type)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('view_partners','manage_partners')")
    public ApiResponse<List<PartnerDto>> list(@RequestParam(required = false) PartnerType type) {
        return ApiResponse.ok(partnerService.list(type));
    }

    @Operation(summary = "Chi tiết đối tác")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('view_partners','manage_partners')")
    public ApiResponse<PartnerDto> detail(@PathVariable Long id) {
        return ApiResponse.ok(partnerService.findById(id));
    }

    @Operation(summary = "Tạo đối tác mới")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_partners')")
    public ApiResponse<PartnerDto> create(@Valid @RequestBody PartnerRequest req) {
        return ApiResponse.ok("Tạo đối tác thành công", partnerService.create(req));
    }

    @Operation(summary = "Cập nhật đối tác")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_partners')")
    public ApiResponse<PartnerDto> update(@PathVariable Long id,
                                          @Valid @RequestBody PartnerRequest req) {
        return ApiResponse.ok("Cập nhật thành công", partnerService.update(id, req));
    }

    @Operation(summary = "Xóa đối tác (chỉ khi chưa có phiếu nhập / đơn hàng nào dùng)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('manage_partners')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        partnerService.delete(id);
        return ApiResponse.message("Đã xóa đối tác");
    }
}
