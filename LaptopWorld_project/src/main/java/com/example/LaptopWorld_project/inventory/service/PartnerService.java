package com.example.LaptopWorld_project.inventory.service;

import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.inventory.dto.PartnerDto;
import com.example.LaptopWorld_project.inventory.dto.PartnerRequest;
import com.example.LaptopWorld_project.inventory.entity.Partner;
import com.example.LaptopWorld_project.inventory.entity.PartnerType;
import com.example.LaptopWorld_project.inventory.mapper.PartnerMapper;
import com.example.LaptopWorld_project.inventory.repository.GoodsReceiptRepository;
import com.example.LaptopWorld_project.inventory.repository.PartnerRepository;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PartnerService {

    private final PartnerRepository partnerRepository;
    private final PartnerMapper partnerMapper;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public List<PartnerDto> list(PartnerType type) {
        List<Partner> partners = type != null
                ? partnerRepository.findByTypeOrderByNameAsc(type)
                : partnerRepository.findAllByOrderByNameAsc();

        // Bulk count 2 loại 1 shot mỗi loại (2 query tổng, không N+1)
        Map<Long, Long> receiptCountByPartner = new HashMap<>();
        for (Object[] row : goodsReceiptRepository.countGroupBySupplierId()) {
            receiptCountByPartner.put((Long) row[0], (Long) row[1]);
        }
        Map<Long, Long> orderCountByPartner = new HashMap<>();
        for (Object[] row : orderRepository.countGroupByPartnerId()) {
            orderCountByPartner.put((Long) row[0], (Long) row[1]);
        }

        return partners.stream()
                .map(p -> partnerMapper.withCounts(
                        partnerMapper.toDto(p),
                        receiptCountByPartner.getOrDefault(p.getId(), 0L),
                        orderCountByPartner.getOrDefault(p.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public PartnerDto findById(Long id) {
        Partner p = getByIdOrThrow(id);
        return partnerMapper.withCounts(
                partnerMapper.toDto(p),
                goodsReceiptRepository.countBySupplier_Id(id),
                orderRepository.countByPartnerId(id));
    }

    @Transactional
    public PartnerDto create(PartnerRequest req) {
        Partner p = new Partner();
        apply(p, req);
        return partnerMapper.toDto(partnerRepository.save(p));
    }

    @Transactional
    public PartnerDto update(Long id, PartnerRequest req) {
        Partner p = getByIdOrThrow(id);

        // Đếm 1 lần để check type + code (partner đã có tham chiếu chưa)
        long refCount = (p.getType() == PartnerType.supplier)
                ? goodsReceiptRepository.countBySupplier_Id(id)
                : orderRepository.countByPartnerId(id);

        // 1) Khoá TYPE khi có tham chiếu — đổi type sẽ phá logic dropdown NCC/ĐVVC
        if (req.type() != null && req.type() != p.getType() && refCount > 0) {
            String loaiCu = p.getType() == PartnerType.supplier ? "Nhà cung cấp" : "Đơn vị vận chuyển";
            String truong = p.getType() == PartnerType.supplier ? "phiếu nhập kho" : "đơn hàng";
            throw new BusinessException("TYPE_LOCKED_HAS_REFS",
                    "Không đổi được loại đối tác — đang là \"" + loaiCu + "\" và có "
                    + refCount + " " + truong + " tham chiếu. Đổi loại sẽ khiến các "
                    + truong + " cũ không còn hợp lệ trong nghiệp vụ.");
        }

        // 2) Khoá CODE khi có tham chiếu — với ĐVVC, tracking number đã snapshot theo code cũ
        String newCode = req.code() != null && !req.code().isBlank()
                ? req.code().trim().toUpperCase()
                : p.getCode();  // giữ code cũ nếu form không đổi
        if (!newCode.equals(p.getCode()) && refCount > 0) {
            String truong = p.getType() == PartnerType.supplier ? "phiếu nhập kho" : "đơn hàng";
            String lyDo = p.getType() == PartnerType.supplier
                    ? "để giữ đúng mã đối tác trên phiếu cũ"
                    : "để giữ mã vận đơn cũ (VD " + p.getCode() + "26...) hợp lệ";
            throw new BusinessException("CODE_LOCKED_HAS_REFS",
                    "Không đổi được mã đối tác — có " + refCount + " " + truong
                    + " đang dùng mã \"" + p.getCode() + "\". " + lyDo + ".");
        }

        apply(p, req);
        return partnerMapper.toDto(partnerRepository.save(p));
    }

    @Transactional
    public void delete(Long id) {
        Partner p = getByIdOrThrow(id);

        // Check proactive để trả message rõ theo type — chi tiết hơn DataIntegrityViolationException.
        if (p.getType() == PartnerType.supplier) {
            long receipts = goodsReceiptRepository.countBySupplier_Id(id);
            if (receipts > 0) {
                throw new BusinessException("PARTNER_IN_USE",
                        "Không thể xoá nhà cung cấp \"" + p.getName() + "\" — còn " + receipts
                        + " phiếu nhập kho. Tắt trạng thái Hoạt động để ẩn khỏi form tạo phiếu mới.");
            }
        } else if (p.getType() == PartnerType.shipping_provider) {
            long orders = orderRepository.countByPartnerId(id);
            if (orders > 0) {
                throw new BusinessException("PARTNER_IN_USE",
                        "Không thể xoá đơn vị vận chuyển \"" + p.getName() + "\" — còn " + orders
                        + " đơn hàng dùng đơn vị này. Tắt trạng thái Hoạt động để ẩn khỏi form duyệt phiếu xuất.");
            }
        }

        try {
            partnerRepository.delete(p);
            partnerRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException("PARTNER_IN_USE",
                    "Không thể xoá đối tác vì đang được tham chiếu ở nơi khác. Tắt trạng thái Hoạt động để ẩn.");
        }
    }

    private Partner getByIdOrThrow(Long id) {
        return partnerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Partner", id));
    }

    private void apply(Partner p, PartnerRequest req) {
        p.setName(req.name());
        p.setType(req.type());
        p.setPhone(req.phone());
        p.setEmail(req.email());
        p.setAddress(req.address());
        if (req.isActive() != null) p.setActive(req.isActive());

        // Code: nếu user không nhập → auto-gen từ name. Nếu trùng, thêm số cuối.
        String code = req.code() != null && !req.code().isBlank()
                ? req.code().trim().toUpperCase()
                : generateCodeFromName(req.name());
        // Nếu code trùng với 1 partner khác (không phải p đang edit) → thêm số cuối
        if (!code.equals(p.getCode()) && partnerRepository.existsByCode(code)) {
            for (int i = 2; i < 100; i++) {
                String candidate = code + i;
                if (candidate.length() > 10) candidate = code.substring(0, 8) + i;
                if (!partnerRepository.existsByCode(candidate)) { code = candidate; break; }
            }
        }
        p.setCode(code);
    }

    /**
     * Tự sinh code từ tên: bỏ dấu, lấy chữ cái đầu mỗi từ, tối đa 5 ký tự.
     * VD: "Giao Hàng Nhanh" → GHN. "J&T Express" → JTE. "Viettel Post" → VP.
     */
    private String generateCodeFromName(String name) {
        if (name == null) return "PTN";
        String normalized = java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[đĐ]", "D")
                .toUpperCase();
        StringBuilder sb = new StringBuilder();
        for (String word : normalized.split("\\s+")) {
            String clean = word.replaceAll("[^A-Z0-9]", "");
            if (!clean.isEmpty()) sb.append(clean.charAt(0));
        }
        String code = sb.length() > 0 ? sb.toString() : "PTN";
        return code.length() > 5 ? code.substring(0, 5) : code;
    }
}
