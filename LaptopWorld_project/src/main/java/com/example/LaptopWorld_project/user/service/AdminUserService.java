package com.example.LaptopWorld_project.user.service;

import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.order.dto.OrderListItemDto;
import com.example.LaptopWorld_project.order.mapper.OrderMapper;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import com.example.LaptopWorld_project.review.dto.ReviewDto;
import com.example.LaptopWorld_project.review.mapper.ReviewMapper;
import com.example.LaptopWorld_project.review.repository.ReviewRepository;
import com.example.LaptopWorld_project.user.dto.AdminUserDetailDto;
import com.example.LaptopWorld_project.user.dto.AdminUserListItemDto;
import com.example.LaptopWorld_project.user.dto.AdminUserStatsDto;
import com.example.LaptopWorld_project.user.dto.AdminUserVoucherDto;
import com.example.LaptopWorld_project.user.dto.CreateUserRequest;
import com.example.LaptopWorld_project.user.dto.UpdateUserRequest;
import com.example.LaptopWorld_project.user.entity.Gender;
import com.example.LaptopWorld_project.user.entity.Permission;
import com.example.LaptopWorld_project.user.entity.Role;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.entity.UserStatus;
import com.example.LaptopWorld_project.user.repository.RoleRepository;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.example.LaptopWorld_project.voucher.entity.Voucher;
import com.example.LaptopWorld_project.voucher.repository.UserVoucherRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Quản lý user cho admin: list/filter/detail + đổi trạng thái + gán vai trò.
 *
 * Guardrails quan trọng:
 *  - CANNOT_BAN_SELF: admin không được ban chính mình
 *  - CANNOT_REMOVE_OWN_ADMIN: admin không được tự gỡ role ADMIN của chính mình
 *  - LAST_ADMIN_LOCKED: không được ban HOẶC gỡ role ADMIN của user ADMIN active cuối cùng
 *    (dùng chung 1 helper — chốt với sinh viên 2026-08-24)
 */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final String ADMIN_ROLE = "ADMIN";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrderRepository orderRepository;
    private final ReviewRepository reviewRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final OrderMapper orderMapper;
    private final ReviewMapper reviewMapper;
    private final PasswordEncoder passwordEncoder;

    // ==================== Query ====================

    @Transactional(readOnly = true)
    public Page<AdminUserListItemDto> list(String keyword, String status, Long roleId,
                                           Pageable pageable) {
        Specification<User> spec = buildSpec(keyword, status, roleId);
        return userRepository.findAll(spec, pageable).map(this::toListItem);
    }

    /** 5 KPI cho trang danh sách người dùng (Sprint 9G Bước B1). */
    @Transactional(readOnly = true)
    public AdminUserStatsDto stats() {
        long total  = userRepository.count();
        long active = userRepository.countByStatus(UserStatus.active);
        long banned = userRepository.countByStatus(UserStatus.banned);
        long unverified = userRepository.countByStatus(UserStatus.unverified);

        // Tuần bắt đầu thứ Hai theo múi giờ VN — phù hợp thị hiếu người Việt.
        ZoneId vn = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate mondayThisWeek = LocalDate.now(vn).with(DayOfWeek.MONDAY);
        OffsetDateTime from = mondayThisWeek.atTime(LocalTime.MIDNIGHT)
                .atZone(vn).toOffsetDateTime();
        long newThisWeek = userRepository.countByCreatedAtGreaterThanEqual(from);

        return new AdminUserStatsDto(total, active, banned, unverified, newThisWeek);
    }

    /** Lịch sử mua hàng của user — reuse OrderMapper để đồng nhất format với AdminOrdersPage. */
    @Transactional(readOnly = true)
    public Page<OrderListItemDto> ordersOfUser(Long userId, Pageable pageable) {
        ensureUserExists(userId);
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(orderMapper::toListItem);
    }

    /** Toàn bộ review user đã viết — kèm product (dùng EntityGraph). */
    @Transactional(readOnly = true)
    public List<ReviewDto> reviewsOfUser(Long userId) {
        ensureUserExists(userId);
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(reviewMapper::toDto)
                .toList();
    }

    /** Voucher trong kho — cả đã dùng lẫn chưa dùng, sắp xếp mới nhất trước. */
    @Transactional(readOnly = true)
    public List<AdminUserVoucherDto> vouchersOfUser(Long userId) {
        ensureUserExists(userId);
        return userVoucherRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(uv -> {
                    Voucher v = uv.getVoucher();
                    return new AdminUserVoucherDto(
                            v.getId(), v.getCode(), v.getName(), v.getType(),
                            v.getDiscountAmount(), v.getMinOrderValue(), v.getMaxDiscount(),
                            v.getStartedAt(), v.getExpiresAt(),
                            uv.isUsed(), uv.getUsedAt(), uv.getOrderId(), uv.getCreatedAt()
                    );
                })
                .toList();
    }

    private void ensureUserExists(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", userId);
        }
    }

    @Transactional(readOnly = true)
    public AdminUserDetailDto findById(Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        return toDetail(u);
    }

    // ==================== Command ====================

    @Transactional
    public AdminUserDetailDto create(CreateUserRequest req) {
        String username = req.username().trim();
        String email    = req.email().trim();

        if (userRepository.existsByUsername(username)) {
            throw new BusinessException("USERNAME_TAKEN", "Tên đăng nhập đã tồn tại: " + username);
        }
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException("EMAIL_TAKEN", "Email đã được đăng ký: " + email);
        }

        UserStatus initialStatus = req.status() == null || req.status().isBlank()
                ? UserStatus.active
                : UserStatus.valueOf(req.status());

        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(req.password()));
        u.setFullName(req.fullName());
        u.setPhone(req.phone());
        if (req.gender() != null && !req.gender().isBlank()) {
            u.setGender(Gender.valueOf(req.gender()));
        }
        u.setBirthday(req.birthday());
        u.setStatus(initialStatus);
        // Admin tạo → xem như đã xác thực email (khỏi buộc user click link)
        u.setEmailVerifiedAt(OffsetDateTime.now());

        if (req.roleIds() != null && !req.roleIds().isEmpty()) {
            u.setRoles(resolveRoles(req.roleIds()));
        }

        userRepository.save(u);
        return toDetail(u);
    }

    @Transactional
    public AdminUserDetailDto update(Long id, UpdateUserRequest req) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        u.setFullName(req.fullName());
        u.setPhone(req.phone());
        if (req.gender() == null || req.gender().isBlank()) {
            u.setGender(null);
        } else {
            u.setGender(Gender.valueOf(req.gender()));
        }
        u.setBirthday(req.birthday());

        userRepository.save(u);
        return toDetail(u);
    }

    /** Convert list roleIds → Set<Role>, throw ROLE_NOT_FOUND nếu có id không tồn tại. */
    private java.util.Set<Role> resolveRoles(List<Long> roleIds) {
        List<Long> distinct = roleIds.stream().distinct().toList();
        List<Role> found = roleRepository.findAllById(distinct);
        if (found.size() != distinct.size()) {
            HashSet<Long> foundIds = new HashSet<>();
            found.forEach(r -> foundIds.add(r.getId()));
            List<Long> missing = distinct.stream().filter(x -> !foundIds.contains(x)).toList();
            throw new BusinessException("ROLE_NOT_FOUND", "Có vai trò không tồn tại: " + missing);
        }
        return new HashSet<>(found);
    }

    @Transactional
    public AdminUserDetailDto setStatus(Long targetId, String newStatusRaw, Long actorId) {
        UserStatus newStatus = parseStatus(newStatusRaw);
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("User", targetId));

        // Guard 1: không được tự ban chính mình
        if (newStatus == UserStatus.banned && actorId != null && actorId.equals(targetId)) {
            throw new BusinessException("CANNOT_BAN_SELF",
                    "Không thể tự khóa tài khoản của chính mình");
        }

        // Guard 2: nếu đổi trạng thái sẽ khiến ADMIN cuối cùng "biến mất" khỏi
        // pool active, chặn lại. Áp dụng khi target đang active + là ADMIN, và
        // status mới không còn active (banned/unverified).
        if (newStatus != UserStatus.active && hasAdminRole(target) && target.isActive()) {
            long remaining = roleRepository.countActiveUsersHavingRoleName(ADMIN_ROLE);
            if (remaining <= 1) {
                throw new BusinessException("LAST_ADMIN_LOCKED",
                        "Đây là tài khoản ADMIN đang hoạt động cuối cùng, không thể khóa");
            }
        }

        target.setStatus(newStatus);
        userRepository.save(target);
        return toDetail(target);
    }

    @Transactional
    public AdminUserDetailDto setRoles(Long targetId, List<Long> newRoleIds, Long actorId) {
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("User", targetId));

        List<Long> distinctIds = newRoleIds == null ? List.of()
                : newRoleIds.stream().distinct().toList();

        // Load các role hợp lệ + check thiếu id nào không
        List<Role> foundRoles = distinctIds.isEmpty()
                ? List.of()
                : roleRepository.findAllById(distinctIds);
        if (foundRoles.size() != distinctIds.size()) {
            Set<Long> foundIds = new HashSet<>();
            foundRoles.forEach(r -> foundIds.add(r.getId()));
            List<Long> missing = distinctIds.stream().filter(id -> !foundIds.contains(id)).toList();
            throw new BusinessException("ROLE_NOT_FOUND",
                    "Có vai trò không tồn tại: " + missing);
        }

        boolean targetHadAdmin = hasAdminRole(target);
        boolean newHasAdmin = foundRoles.stream().anyMatch(r -> ADMIN_ROLE.equalsIgnoreCase(r.getName()));

        // Guard 3: không được tự gỡ ADMIN của chính mình
        if (actorId != null && actorId.equals(targetId) && targetHadAdmin && !newHasAdmin) {
            throw new BusinessException("CANNOT_REMOVE_OWN_ADMIN",
                    "Không thể tự gỡ vai trò ADMIN của chính mình");
        }

        // Guard 4: LAST_ADMIN_LOCKED cho set-roles.
        // Nếu đang gỡ role ADMIN của target (target là ADMIN, mới không còn ADMIN)
        // và target đang active, và target là ADMIN active duy nhất → chặn.
        if (targetHadAdmin && !newHasAdmin && target.isActive()) {
            long remaining = roleRepository.countActiveUsersHavingRoleName(ADMIN_ROLE);
            if (remaining <= 1) {
                throw new BusinessException("LAST_ADMIN_LOCKED",
                        "Đây là tài khoản ADMIN đang hoạt động cuối cùng, không thể gỡ vai trò ADMIN");
            }
        }

        target.setRoles(new HashSet<>(foundRoles));
        userRepository.save(target);
        return toDetail(target);
    }

    // ==================== Helpers ====================

    private Specification<User> buildSpec(String keyword, String status, Long roleId) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();

            if (keyword != null && !keyword.isBlank()) {
                String kw = "%" + keyword.trim().toLowerCase() + "%";
                Predicate byUsername = cb.like(cb.lower(root.get("username")), kw);
                Predicate byEmail    = cb.like(cb.lower(root.get("email")), kw);
                Predicate byFullName = cb.like(
                        cb.lower(cb.coalesce(root.get("fullName"), "")), kw);
                preds.add(cb.or(byUsername, byEmail, byFullName));
            }

            if (status != null && !status.isBlank()) {
                try {
                    UserStatus st = UserStatus.valueOf(status.trim());
                    preds.add(cb.equal(root.get("status"), st));
                } catch (IllegalArgumentException ignored) {
                    // status không hợp lệ → coi như không lọc (an toàn hơn 500)
                }
            }

            if (roleId != null) {
                Join<User, Role> roleJoin = root.join("roles");
                preds.add(cb.equal(roleJoin.get("id"), roleId));
                if (query != null) query.distinct(true);
            }

            return preds.isEmpty() ? cb.conjunction() : cb.and(preds.toArray(new Predicate[0]));
        };
    }

    private UserStatus parseStatus(String raw) {
        try {
            return UserStatus.valueOf(raw.trim());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("INVALID_STATUS",
                    "Trạng thái không hợp lệ: " + raw);
        }
    }

    private boolean hasAdminRole(User u) {
        return u.getRoles().stream()
                .anyMatch(r -> ADMIN_ROLE.equalsIgnoreCase(r.getName()));
    }

    private AdminUserListItemDto toListItem(User u) {
        List<String> roleNames = u.getRoles().stream()
                .map(Role::getName)
                .sorted()
                .toList();
        return new AdminUserListItemDto(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.isEmailVerified(),
                u.getFullName(),
                u.getPhone(),
                u.getAvatar(),
                u.getStatus().name(),
                roleNames,
                u.getCreatedAt()
        );
    }

    private AdminUserDetailDto toDetail(User u) {
        List<AdminUserDetailDto.RoleRef> roles = u.getRoles().stream()
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .map(r -> new AdminUserDetailDto.RoleRef(r.getId(), r.getName(), r.getDescription()))
                .toList();

        long orderCount  = orderRepository.countByUserId(u.getId());
        long reviewCount = reviewRepository.countByUserId(u.getId());
        BigDecimal spent = orderRepository.sumDeliveredTotalByUserId(u.getId());
        if (spent == null) spent = BigDecimal.ZERO;

        AdminUserDetailDto.Stats stats = new AdminUserDetailDto.Stats(orderCount, reviewCount, spent);

        return new AdminUserDetailDto(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.isEmailVerified(),
                u.getEmailVerifiedAt(),
                u.getFullName(),
                u.getPhone(),
                u.getAvatar(),
                u.getGender() != null ? u.getGender().name() : null,
                u.getBirthday(),
                u.getStatus().name(),
                roles,
                stats,
                u.getCreatedAt(),
                u.getUpdatedAt()
        );
    }
}
