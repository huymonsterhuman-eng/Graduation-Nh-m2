package com.example.LaptopWorld_project.user.service;

import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.user.dto.RoleDetailDto;
import com.example.LaptopWorld_project.user.dto.RoleListItemDto;
import com.example.LaptopWorld_project.user.dto.RoleRequest;
import com.example.LaptopWorld_project.user.entity.Permission;
import com.example.LaptopWorld_project.user.entity.Role;
import com.example.LaptopWorld_project.user.repository.PermissionRepository;
import com.example.LaptopWorld_project.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * CRUD role + gán/gỡ permissions. ADMIN role được bảo vệ đặc biệt:
 *  - Không cho xóa
 *  - Không cho đổi tên
 *  - Không cho sửa permissions (ADMIN luôn có full)
 */
@Service
@RequiredArgsConstructor
public class RoleService {

    private static final String ADMIN_ROLE = "ADMIN";

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Transactional(readOnly = true)
    public List<RoleListItemDto> listAll() {
        return roleRepository.findAllByOrderByNameAsc().stream()
                .map(r -> new RoleListItemDto(
                        r.getId(),
                        r.getName(),
                        r.getDescription(),
                        r.getPermissions().size(),
                        roleRepository.countUsersByRoleId(r.getId()),
                        r.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public RoleDetailDto findById(Long id) {
        Role r = roleRepository.findWithPermissionsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));
        return toDetail(r);
    }

    @Transactional
    public RoleDetailDto create(RoleRequest req) {
        String name = req.name().trim();
        if (roleRepository.existsByName(name)) {
            throw new BusinessException("ROLE_NAME_TAKEN", "Tên vai trò đã tồn tại: " + name);
        }
        Role r = new Role();
        r.setName(name);
        r.setDescription(req.description());
        if (req.permissions() != null) {
            r.setPermissions(resolvePermissions(req.permissions()));
        }
        roleRepository.save(r);
        return toDetail(r);
    }

    @Transactional
    public RoleDetailDto update(Long id, RoleRequest req) {
        Role r = roleRepository.findWithPermissionsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));

        boolean isAdminRole = ADMIN_ROLE.equalsIgnoreCase(r.getName());
        String newName = req.name().trim();

        if (isAdminRole && !ADMIN_ROLE.equalsIgnoreCase(newName)) {
            throw new BusinessException("ADMIN_ROLE_LOCKED",
                    "Không thể đổi tên vai trò ADMIN");
        }
        if (!r.getName().equalsIgnoreCase(newName) && roleRepository.existsByName(newName)) {
            throw new BusinessException("ROLE_NAME_TAKEN", "Tên vai trò đã tồn tại: " + newName);
        }

        r.setName(newName);
        r.setDescription(req.description());

        // ADMIN không cho sửa permissions — luôn giữ full quyền
        if (req.permissions() != null && !isAdminRole) {
            r.setPermissions(resolvePermissions(req.permissions()));
        }

        roleRepository.save(r);
        return toDetail(r);
    }

    @Transactional
    public void delete(Long id) {
        Role r = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));
        if (ADMIN_ROLE.equalsIgnoreCase(r.getName())) {
            throw new BusinessException("ADMIN_ROLE_LOCKED",
                    "Không thể xóa vai trò ADMIN");
        }
        long userCount = roleRepository.countUsersByRoleId(id);
        if (userCount > 0) {
            throw new BusinessException("ROLE_IN_USE",
                    String.format("Vai trò \"%s\" đang được %d người dùng, không thể xóa. " +
                                  "Vui lòng gỡ vai trò khỏi các user trước.", r.getName(), userCount));
        }
        roleRepository.delete(r);
    }

    // ==================== Helpers ====================

    private RoleDetailDto toDetail(Role r) {
        List<String> permCodes = r.getPermissions().stream()
                .map(Permission::getCode)
                .sorted()
                .toList();
        return new RoleDetailDto(
                r.getId(),
                r.getName(),
                r.getDescription(),
                permCodes,
                roleRepository.countUsersByRoleId(r.getId()),
                r.getCreatedAt(),
                r.getUpdatedAt());
    }

    /** Convert list of permission codes → Set<Permission> (fail nếu có code không tồn tại). */
    private Set<Permission> resolvePermissions(List<String> codes) {
        if (codes == null || codes.isEmpty()) return new HashSet<>();
        List<Permission> found = permissionRepository.findAllByCodeIn(codes);
        if (found.size() != codes.stream().distinct().count()) {
            Set<String> foundCodes = new HashSet<>();
            found.forEach(p -> foundCodes.add(p.getCode()));
            List<String> missing = codes.stream()
                    .distinct()
                    .filter(c -> !foundCodes.contains(c))
                    .toList();
            throw new BusinessException("PERMISSION_NOT_FOUND",
                    "Có permission không hợp lệ: " + String.join(", ", missing));
        }
        return new HashSet<>(found);
    }
}
