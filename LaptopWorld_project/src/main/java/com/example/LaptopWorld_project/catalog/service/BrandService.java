package com.example.LaptopWorld_project.catalog.service;

import com.example.LaptopWorld_project.catalog.dto.BrandDto;
import com.example.LaptopWorld_project.catalog.dto.BrandRequest;
import com.example.LaptopWorld_project.catalog.entity.Brand;
import com.example.LaptopWorld_project.catalog.mapper.BrandMapper;
import com.example.LaptopWorld_project.catalog.repository.BrandRepository;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.common.util.SlugGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BrandService {

    private final BrandRepository brandRepository;
    private final BrandMapper brandMapper;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<BrandDto> findAllActive() {
        return brandMapper.toDtoList(brandRepository.findByIsActiveTrueOrderByNameAsc());
    }

    @Transactional(readOnly = true)
    public List<BrandDto> findAll() {
        return brandMapper.toDtoList(brandRepository.findAll());
    }

    @Transactional(readOnly = true)
    public BrandDto findBySlug(String slug) {
        return brandMapper.toDto(brandRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thương hiệu: " + slug)));
    }

    @Transactional(readOnly = true)
    public BrandDto findById(Long id) {
        return brandMapper.toDto(getByIdOrThrow(id));
    }

    @Transactional
    public BrandDto create(BrandRequest req) {
        String slug = normalizeSlug(req.slug(), req.name());
        if (brandRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug đã tồn tại: " + slug);
        }
        Brand entity = new Brand();
        applyRequest(entity, req, slug);
        return brandMapper.toDto(brandRepository.save(entity));
    }

    @Transactional
    public BrandDto update(Long id, BrandRequest req) {
        Brand entity = getByIdOrThrow(id);
        String slug = normalizeSlug(req.slug(), req.name());
        if (!slug.equals(entity.getSlug()) && brandRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug đã tồn tại: " + slug);
        }
        applyRequest(entity, req, slug);
        return brandMapper.toDto(brandRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        Brand entity = getByIdOrThrow(id);
        if (productRepository.existsByBrandId(id)) {
            throw new BusinessException("BRAND_HAS_PRODUCTS",
                    "Không thể xóa: còn sản phẩm thuộc thương hiệu này. Hãy chuyển SP sang brand khác trước.");
        }
        brandRepository.delete(entity);
    }

    private Brand getByIdOrThrow(Long id) {
        return brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", id));
    }

    private String normalizeSlug(String slug, String name) {
        if (slug != null && !slug.isBlank()) return SlugGenerator.slugify(slug);
        return SlugGenerator.slugify(name);
    }

    private void applyRequest(Brand entity, BrandRequest req, String slug) {
        entity.setName(req.name());
        entity.setSlug(slug);
        entity.setLogo(req.logo());
        entity.setDescription(req.description());
        if (req.isActive() != null) entity.setActive(req.isActive());
    }
}
