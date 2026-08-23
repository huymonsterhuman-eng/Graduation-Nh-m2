package com.example.LaptopWorld_project.catalog.service;

import com.example.LaptopWorld_project.catalog.dto.CategoryDto;
import com.example.LaptopWorld_project.catalog.dto.CategoryRequest;
import com.example.LaptopWorld_project.catalog.dto.CategoryTreeDto;
import com.example.LaptopWorld_project.catalog.entity.Category;
import com.example.LaptopWorld_project.catalog.mapper.CategoryMapper;
import com.example.LaptopWorld_project.catalog.repository.CategoryRepository;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.common.util.SlugGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;
    private final ProductRepository productRepository;

    // ==================== READ ====================
    @Transactional(readOnly = true)
    public List<CategoryDto> findAllActive() {
        return categoryMapper.toDtoList(categoryRepository.findByIsActiveTrueOrderBySortOrderAsc());
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> findAll() {
        return categoryMapper.toDtoList(categoryRepository.findAll());
    }

    @Transactional(readOnly = true)
    public CategoryDto findBySlug(String slug) {
        return categoryMapper.toDto(getBySlugOrThrow(slug));
    }

    @Transactional(readOnly = true)
    public CategoryDto findById(Long id) {
        return categoryMapper.toDto(getByIdOrThrow(id));
    }

    /**
     * Load tất cả category → build cây trong bộ nhớ (chỉ ~12 record, hiệu quả).
     */
    @Transactional(readOnly = true)
    public List<CategoryTreeDto> getTree() {
        List<Category> all = categoryRepository.findByIsActiveTrueOrderBySortOrderAsc();
        Map<Long, List<Category>> byParent = new HashMap<>();
        for (Category c : all) {
            Long parentId = c.getParent() != null ? c.getParent().getId() : null;
            byParent.computeIfAbsent(parentId, k -> new ArrayList<>()).add(c);
        }
        List<Category> roots = byParent.getOrDefault(null, List.of());
        return roots.stream().map(r -> toTreeNode(r, byParent)).toList();
    }

    private CategoryTreeDto toTreeNode(Category c, Map<Long, List<Category>> byParent) {
        List<Category> children = byParent.getOrDefault(c.getId(), List.of());
        List<CategoryTreeDto> childDtos = children.stream()
                .map(child -> toTreeNode(child, byParent))
                .toList();
        return new CategoryTreeDto(c.getId(), c.getName(), c.getSlug(),
                                   c.getImage(), c.getSortOrder(), childDtos);
    }

    // ==================== WRITE ====================
    @Transactional
    public CategoryDto create(CategoryRequest req) {
        String slug = normalizeSlug(req.slug(), req.name());
        if (categoryRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug đã tồn tại: " + slug);
        }
        Category entity = new Category();
        applyRequest(entity, req, slug);
        return categoryMapper.toDto(categoryRepository.save(entity));
    }

    @Transactional
    public CategoryDto update(Long id, CategoryRequest req) {
        Category entity = getByIdOrThrow(id);
        String slug = normalizeSlug(req.slug(), req.name());
        if (!slug.equals(entity.getSlug()) && categoryRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug đã tồn tại: " + slug);
        }
        applyRequest(entity, req, slug);
        return categoryMapper.toDto(categoryRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        Category entity = getByIdOrThrow(id);
        if (!entity.getChildren().isEmpty()) {
            throw new BusinessException("HAS_CHILDREN",
                    "Không thể xóa: danh mục còn danh mục con");
        }
        if (productRepository.existsByCategoryId(id)) {
            throw new BusinessException("CATEGORY_HAS_PRODUCTS",
                    "Không thể xóa: còn sản phẩm thuộc danh mục này. Hãy chuyển SP sang danh mục khác trước.");
        }
        categoryRepository.delete(entity);
    }

    // ==================== helpers ====================
    private Category getByIdOrThrow(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
    }

    private Category getBySlugOrThrow(String slug) {
        return categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục: " + slug));
    }

    private String normalizeSlug(String slug, String name) {
        if (slug != null && !slug.isBlank()) return SlugGenerator.slugify(slug);
        return SlugGenerator.slugify(name);
    }

    private void applyRequest(Category entity, CategoryRequest req, String slug) {
        entity.setName(req.name());
        entity.setSlug(slug);
        entity.setDescription(req.description());
        entity.setImage(req.image());
        entity.setSpecTemplate(req.specTemplate());
        if (req.isActive() != null)  entity.setActive(req.isActive());
        if (req.sortOrder() != null) entity.setSortOrder(req.sortOrder());

        if (req.parentId() != null) {
            if (req.parentId().equals(entity.getId())) {
                throw new BusinessException("INVALID_PARENT", "Danh mục không thể tự làm cha của chính nó");
            }
            entity.setParent(getByIdOrThrow(req.parentId()));
        } else {
            entity.setParent(null);
        }
    }
}
