package com.example.LaptopWorld_project.catalog.service;

import com.example.LaptopWorld_project.catalog.dto.BrandDto;
import com.example.LaptopWorld_project.catalog.dto.BrandRequest;
import com.example.LaptopWorld_project.catalog.entity.Brand;
import com.example.LaptopWorld_project.catalog.mapper.BrandMapper;
import com.example.LaptopWorld_project.catalog.repository.BrandRepository;
import com.example.LaptopWorld_project.catalog.repository.CategoryRepository;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.common.util.SlugGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BrandService {

    private final BrandRepository brandRepository;
    private final BrandMapper brandMapper;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<BrandDto> findAllActive() {
        return brandMapper.toDtoList(brandRepository.findByIsActiveTrueOrderByNameAsc());
    }

    /**
     * Trả list brand chỉ chứa những brand thực sự có SP đang bán trong category
     * (và bao gồm cả sub-category con). Dùng cho MegaMenu.
     */
    @Transactional(readOnly = true)
    public List<BrandDto> findByCategory(Long categoryId) {
        if (categoryId == null) return findAllActive();
        if (!categoryRepository.existsById(categoryId)) return List.of();

        List<Long> catIds = new java.util.ArrayList<>();
        catIds.add(categoryId);
        categoryRepository.findByParentIdOrderBySortOrderAsc(categoryId)
                .forEach(c -> catIds.add(c.getId()));

        return brandMapper.toDtoList(
                productRepository.findDistinctBrandsByCategoryIds(catIds));
    }

    @Transactional(readOnly = true)
    public List<BrandDto> findAll() {
        List<Brand> brands = brandRepository.findAll();
        Map<Long, Long> countMap = productRepository.countGroupByBrandId().stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> ((Number) row[1]).longValue()));
        return brands.stream()
                .map(b -> withProductCount(brandMapper.toDto(b), countMap.getOrDefault(b.getId(), 0L)))
                .toList();
    }

    private BrandDto withProductCount(BrandDto dto, long count) {
        return new BrandDto(dto.id(), dto.name(), dto.slug(), dto.logo(),
                dto.description(), dto.isActive(),
                dto.createdAt(), dto.updatedAt(), count);
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
        if (!slug.equals(entity.getSlug())) {
            if (productRepository.existsByBrandId(id)) {
                throw new BusinessException("SLUG_LOCKED_HAS_PRODUCTS",
                        "Không thể đổi slug: thương hiệu này đang có sản phẩm. " +
                        "Đổi slug sẽ làm gãy URL /thuong-hieu/... cũ.");
            }
            if (brandRepository.existsBySlug(slug)) {
                throw new BusinessException("SLUG_TAKEN", "Slug đã tồn tại: " + slug);
            }
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
