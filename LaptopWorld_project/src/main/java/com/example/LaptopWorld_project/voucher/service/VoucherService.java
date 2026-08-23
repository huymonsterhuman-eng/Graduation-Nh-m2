package com.example.LaptopWorld_project.voucher.service;

import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import com.example.LaptopWorld_project.voucher.dto.VoucherCheckResponse;
import com.example.LaptopWorld_project.voucher.dto.VoucherDto;
import com.example.LaptopWorld_project.voucher.dto.VoucherRequest;
import com.example.LaptopWorld_project.voucher.entity.UserVoucher;
import com.example.LaptopWorld_project.voucher.entity.Voucher;
import com.example.LaptopWorld_project.voucher.entity.VoucherType;
import com.example.LaptopWorld_project.voucher.mapper.VoucherMapper;
import com.example.LaptopWorld_project.voucher.repository.UserVoucherRepository;
import com.example.LaptopWorld_project.voucher.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final UserRepository userRepository;
    private final VoucherMapper voucherMapper;

    // ==================== ADMIN CRUD ====================
    @Transactional(readOnly = true)
    public List<VoucherDto> adminListAll() {
        return voucherRepository.findAll().stream()
                .map(voucherMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public VoucherDto adminFindById(Long id) {
        return voucherMapper.toDto(getByIdOrThrow(id));
    }

    @Transactional
    public VoucherDto adminCreate(VoucherRequest req) {
        validateBusiness(req);
        if (voucherRepository.existsByCode(req.code())) {
            throw new BusinessException("VOUCHER_CODE_TAKEN", "Mã voucher đã tồn tại");
        }
        Voucher v = new Voucher();
        v.setCode(req.code());
        apply(v, req);
        return voucherMapper.toDto(voucherRepository.save(v));
    }

    @Transactional
    public VoucherDto adminUpdate(Long id, VoucherRequest req) {
        validateBusiness(req);
        Voucher v = getByIdOrThrow(id);
        if (!v.getCode().equals(req.code()) && voucherRepository.existsByCode(req.code())) {
            throw new BusinessException("VOUCHER_CODE_TAKEN", "Mã voucher đã tồn tại");
        }
        v.setCode(req.code());
        apply(v, req);
        return voucherMapper.toDto(voucherRepository.save(v));
    }

    @Transactional
    public void adminDelete(Long id) {
        Voucher v = getByIdOrThrow(id);
        if (v.getUsedCount() > 0) {
            throw new BusinessException("VOUCHER_IN_USE",
                    "Không thể xóa voucher đã có người dùng. Tắt is_active để ẩn.");
        }
        voucherRepository.delete(v);
    }

    // ==================== USER ====================
    @Transactional(readOnly = true)
    public List<VoucherDto> listAvailable(Long userId) {
        List<Voucher> vouchers = voucherRepository
                .findByIsActiveTrueAndExpiresAtAfterOrderByExpiresAtAsc(OffsetDateTime.now());
        return vouchers.stream().map(v -> {
            VoucherDto dto = voucherMapper.toDto(v);
            boolean saved = userVoucherRepository.existsByUserIdAndVoucherId(userId, v.getId());
            return withSavedFlag(dto, saved);
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<VoucherDto> listMySaved(Long userId) {
        return userVoucherRepository.findByUserIdAndIsUsedFalseOrderByCreatedAtDesc(userId).stream()
                .map(UserVoucher::getVoucher)
                .map(v -> withSavedFlag(voucherMapper.toDto(v), true))
                .toList();
    }

    @Transactional
    public VoucherDto saveVoucher(Long userId, String code) {
        Voucher v = voucherRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher: " + code));
        if (userVoucherRepository.existsByUserIdAndVoucherId(userId, v.getId())) {
            throw new BusinessException("ALREADY_SAVED", "Bạn đã lưu voucher này rồi");
        }
        if (!v.isActive()) {
            throw new BusinessException("VOUCHER_INACTIVE", "Voucher không còn hoạt động");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        UserVoucher uv = new UserVoucher();
        uv.setUser(user);
        uv.setVoucher(v);
        userVoucherRepository.save(uv);
        return withSavedFlag(voucherMapper.toDto(v), true);
    }

    /**
     * Check + tính discount cho subtotal cho trước.
     * KHÔNG mark used — chỉ preview.
     */
    @Transactional(readOnly = true)
    public VoucherCheckResponse check(String code, BigDecimal subtotal) {
        Voucher v = voucherRepository.findByCode(code).orElse(null);
        if (v == null) {
            return new VoucherCheckResponse(false, code, subtotal, BigDecimal.ZERO, subtotal,
                    "Mã voucher không tồn tại");
        }
        if (!v.isValid(subtotal)) {
            String reason = buildInvalidReason(v, subtotal);
            return new VoucherCheckResponse(false, code, subtotal, BigDecimal.ZERO, subtotal, reason);
        }
        BigDecimal discount = v.calculateDiscount(subtotal);
        BigDecimal totalAfter = subtotal.subtract(discount);
        return new VoucherCheckResponse(true, code, subtotal, discount, totalAfter,
                "Áp dụng voucher thành công");
    }

    // ==================== helpers ====================
    private Voucher getByIdOrThrow(Long id) {
        return voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voucher", id));
    }

    private void validateBusiness(VoucherRequest req) {
        if (req.type() == VoucherType.percent && req.discountAmount().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessException("INVALID_PERCENT", "Voucher percent không quá 100%");
        }
        if (req.startedAt() != null && req.expiresAt() != null
                && req.expiresAt().isBefore(req.startedAt())) {
            throw new BusinessException("INVALID_DATES",
                    "Thời gian hết hạn phải sau thời gian bắt đầu");
        }
    }

    private void apply(Voucher v, VoucherRequest req) {
        v.setName(req.name());
        v.setType(req.type());
        v.setDiscountAmount(req.discountAmount());
        v.setMinOrderValue(req.minOrderValue() != null ? req.minOrderValue() : BigDecimal.ZERO);
        v.setMaxDiscount(req.maxDiscount());
        v.setStartedAt(req.startedAt());
        v.setExpiresAt(req.expiresAt());
        v.setUsageLimit(req.usageLimit());
        if (req.isActive() != null) v.setActive(req.isActive());
    }

    private String buildInvalidReason(Voucher v, BigDecimal subtotal) {
        OffsetDateTime now = OffsetDateTime.now();
        if (!v.isActive()) return "Voucher đã bị vô hiệu hóa";
        if (v.getStartedAt() != null && now.isBefore(v.getStartedAt()))
            return "Voucher chưa đến thời gian sử dụng";
        if (v.getExpiresAt() != null && now.isAfter(v.getExpiresAt()))
            return "Voucher đã hết hạn";
        if (v.getUsageLimit() != null && v.getUsedCount() >= v.getUsageLimit())
            return "Voucher đã hết lượt sử dụng";
        if (subtotal.compareTo(v.getMinOrderValue()) < 0)
            return "Đơn hàng chưa đạt giá trị tối thiểu " + v.getMinOrderValue().toPlainString() + "đ";
        return "Voucher không hợp lệ";
    }

    private VoucherDto withSavedFlag(VoucherDto dto, boolean saved) {
        return new VoucherDto(
                dto.id(), dto.code(), dto.name(), dto.type(),
                dto.discountAmount(), dto.minOrderValue(), dto.maxDiscount(),
                dto.startedAt(), dto.expiresAt(), dto.usageLimit(), dto.usedCount(),
                dto.isActive(), saved, dto.createdAt(), dto.updatedAt()
        );
    }
}
