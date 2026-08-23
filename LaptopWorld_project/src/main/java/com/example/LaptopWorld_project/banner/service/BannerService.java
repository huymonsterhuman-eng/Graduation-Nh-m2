package com.example.LaptopWorld_project.banner.service;

import com.example.LaptopWorld_project.banner.dto.BannerDto;
import com.example.LaptopWorld_project.banner.dto.BannerRequest;
import com.example.LaptopWorld_project.banner.entity.Banner;
import com.example.LaptopWorld_project.banner.mapper.BannerMapper;
import com.example.LaptopWorld_project.banner.repository.BannerRepository;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BannerService {

    private final BannerRepository bannerRepository;
    private final UserRepository userRepository;
    private final BannerMapper bannerMapper;

    // ==================== PUBLIC ====================
    @Transactional(readOnly = true)
    public List<BannerDto> publicListActive() {
        return bannerRepository.findByIsActiveTrueOrderBySortOrderAscIdAsc().stream()
                .map(bannerMapper::toDto)
                .toList();
    }

    // ==================== ADMIN ====================
    @Transactional(readOnly = true)
    public List<BannerDto> adminListAll() {
        return bannerRepository.findAllByOrderBySortOrderAscIdAsc().stream()
                .map(bannerMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public BannerDto adminFindById(Long id) {
        return bannerMapper.toDto(getByIdOrThrow(id));
    }

    @Transactional
    public BannerDto adminCreate(Long authorId, BannerRequest req) {
        Banner b = new Banner();
        apply(b, req, true);
        setAuthor(b, authorId);
        return bannerMapper.toDto(bannerRepository.save(b));
    }

    @Transactional
    public BannerDto adminUpdate(Long id, BannerRequest req) {
        Banner b = getByIdOrThrow(id);
        apply(b, req, false);
        return bannerMapper.toDto(bannerRepository.save(b));
    }

    @Transactional
    public void adminDelete(Long id) {
        Banner b = getByIdOrThrow(id);
        bannerRepository.delete(b);
    }

    // ==================== helpers ====================
    private Banner getByIdOrThrow(Long id) {
        return bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner", id));
    }

    private void apply(Banner b, BannerRequest req, boolean isCreate) {
        b.setTitle(req.title());
        b.setImage(req.image());
        b.setLink(req.link());
        b.setSortOrder(req.sortOrder() != null ? req.sortOrder() : (isCreate ? 0 : b.getSortOrder()));
        if (req.isActive() != null) {
            b.setActive(req.isActive());
        } else if (isCreate) {
            b.setActive(true);
        }
    }

    private void setAuthor(Banner b, Long authorId) {
        if (authorId == null) return;
        User u = userRepository.findById(authorId).orElse(null);
        if (u != null) b.setAuthor(u);
    }
}
