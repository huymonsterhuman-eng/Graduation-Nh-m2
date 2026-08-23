package com.example.LaptopWorld_project.user.controller;

import com.example.LaptopWorld_project.auth.UserPrincipal;
import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.user.dto.AddressDto;
import com.example.LaptopWorld_project.user.dto.AddressRequest;
import com.example.LaptopWorld_project.user.service.AddressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Address", description = "Địa chỉ giao hàng của user hiện tại")
@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @Operation(summary = "Danh sách địa chỉ của tôi (default lên đầu)")
    @GetMapping
    public ApiResponse<List<AddressDto>> list(@AuthenticationPrincipal UserPrincipal me) {
        return ApiResponse.ok(addressService.listMyAddresses(me.getId()));
    }

    @Operation(summary = "Thêm địa chỉ mới")
    @PostMapping
    public ApiResponse<AddressDto> create(@AuthenticationPrincipal UserPrincipal me,
                                          @Valid @RequestBody AddressRequest req) {
        return ApiResponse.ok("Thêm địa chỉ thành công", addressService.create(me.getId(), req));
    }

    @Operation(summary = "Cập nhật địa chỉ")
    @PutMapping("/{id}")
    public ApiResponse<AddressDto> update(@AuthenticationPrincipal UserPrincipal me,
                                          @PathVariable Long id,
                                          @Valid @RequestBody AddressRequest req) {
        return ApiResponse.ok("Cập nhật thành công", addressService.update(me.getId(), id, req));
    }

    @Operation(summary = "Xóa địa chỉ")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal UserPrincipal me,
                                    @PathVariable Long id) {
        addressService.delete(me.getId(), id);
        return ApiResponse.message("Đã xóa địa chỉ");
    }

    @Operation(summary = "Đặt địa chỉ làm mặc định")
    @PutMapping("/{id}/set-default")
    public ApiResponse<AddressDto> setDefault(@AuthenticationPrincipal UserPrincipal me,
                                              @PathVariable Long id) {
        return ApiResponse.ok("Đã đặt làm địa chỉ mặc định", addressService.setDefault(me.getId(), id));
    }

    // ---------- Admin ----------
    @Operation(summary = "[Admin] Danh sách địa chỉ của 1 user cụ thể (dùng khi admin tạo đơn thay khách)")
    @GetMapping("/of-user/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('view_users','create_orders_manual')")
    public ApiResponse<List<AddressDto>> listOfUser(@PathVariable Long userId) {
        return ApiResponse.ok(addressService.listMyAddresses(userId));
    }
}
