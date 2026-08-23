package com.example.LaptopWorld_project.admin.controller;

import com.example.LaptopWorld_project.common.dto.ApiResponse;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Search user cho admin picker (tạo đơn thay khách...). Sprint 9G sẽ có Users management đầy đủ.
 */
@Tag(name = "Admin User Search", description = "Search user picker cho admin flows")
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('create_orders_manual','view_users')")
public class AdminUserSearchController {

    private final UserRepository userRepository;

    public record UserPickDto(
            Long id,
            String username,
            String email,
            String fullName,
            String phone
    ) {}

    @Operation(summary = "Search top-20 user theo username/email/fullName")
    @GetMapping("/search")
    public ApiResponse<List<UserPickDto>> search(@RequestParam(required = false) String keyword) {
        String kw = keyword == null ? "" : keyword.trim();
        if (kw.isBlank()) return ApiResponse.ok(List.of());
        return ApiResponse.ok(
                userRepository.searchUsers(kw, PageRequest.of(0, 20)).stream()
                        .map(u -> new UserPickDto(
                                u.getId(), u.getUsername(), u.getEmail(),
                                u.getFullName(), u.getPhone()))
                        .toList()
        );
    }
}
