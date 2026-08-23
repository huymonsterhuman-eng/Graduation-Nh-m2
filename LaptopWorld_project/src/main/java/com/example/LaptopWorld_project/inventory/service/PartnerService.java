package com.example.LaptopWorld_project.inventory.service;

import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.inventory.dto.PartnerDto;
import com.example.LaptopWorld_project.inventory.dto.PartnerRequest;
import com.example.LaptopWorld_project.inventory.entity.Partner;
import com.example.LaptopWorld_project.inventory.entity.PartnerType;
import com.example.LaptopWorld_project.inventory.mapper.PartnerMapper;
import com.example.LaptopWorld_project.inventory.repository.PartnerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PartnerService {

    private final PartnerRepository partnerRepository;
    private final PartnerMapper partnerMapper;

    @Transactional(readOnly = true)
    public List<PartnerDto> list(PartnerType type) {
        List<Partner> partners = type != null
                ? partnerRepository.findByTypeOrderByNameAsc(type)
                : partnerRepository.findAllByOrderByNameAsc();
        return partners.stream().map(partnerMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public PartnerDto findById(Long id) {
        return partnerMapper.toDto(getByIdOrThrow(id));
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
        apply(p, req);
        return partnerMapper.toDto(partnerRepository.save(p));
    }

    @Transactional
    public void delete(Long id) {
        Partner p = getByIdOrThrow(id);
        try {
            partnerRepository.delete(p);
            partnerRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException("PARTNER_IN_USE",
                    "Không thể xóa đối tác đã có phiếu nhập hoặc đơn hàng. Tắt is_active để ẩn.");
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
