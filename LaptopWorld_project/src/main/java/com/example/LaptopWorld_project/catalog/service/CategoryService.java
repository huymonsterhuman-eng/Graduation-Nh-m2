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
        // Bảo vệ SP đã có giá trị: cấm đổi type / xoá field đang được dùng
        validateSpecTemplateChanges(id, entity.getSpecTemplate(), req.specTemplate());
        applyRequest(entity, req, slug);
        return categoryMapper.toDto(categoryRepository.save(entity));
    }

    /**
     * Đếm số SP đang có giá trị non-empty cho từng key của danh mục.
     * Endpoint dành cho FE khoá UI (disable Select Kiểu + nút Xoá field).
     */
    @Transactional(readOnly = true)
    public Map<String, Integer> getSpecUsage(Long categoryId) {
        if (!categoryRepository.existsById(categoryId)) return Map.of();
        Map<String, Integer> result = new HashMap<>();
        for (Object[] row : productRepository.countSpecUsageByCategoryId(categoryId)) {
            String key = (String) row[0];
            Number count = (Number) row[1];
            result.put(key, count.intValue());
        }
        return result;
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
        validateSpecTemplate(req.specTemplate());
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

    /**
     * Chặn admin đổi kiểu / xoá field khi SP đã có giá trị cho field đó.
     * Đổi label vẫn cho phép vì không gãy dữ liệu (chỉ đổi chữ hiển thị).
     */
    private void validateSpecTemplateChanges(Long categoryId,
                                             List<Map<String, Object>> oldTemplate,
                                             List<Map<String, Object>> newTemplate) {
        if (oldTemplate == null || oldTemplate.isEmpty()) return;
        Map<String, Integer> usage = getSpecUsage(categoryId);
        if (usage.isEmpty()) return;

        Map<String, String> newTypeByKey = new HashMap<>();
        if (newTemplate != null) {
            for (Map<String, Object> f : newTemplate) {
                Object k = f.get("key");
                Object t = f.get("type");
                if (k != null) newTypeByKey.put(k.toString(), t == null ? "text" : t.toString());
            }
        }

        for (Map<String, Object> oldField : oldTemplate) {
            Object oldKeyObj = oldField.get("key");
            if (oldKeyObj == null) continue;
            String key = oldKeyObj.toString();
            Integer used = usage.get(key);
            if (used == null || used == 0) continue;

            Object oldLabelObj = oldField.get("label");
            String label = oldLabelObj == null ? key : oldLabelObj.toString();

            if (!newTypeByKey.containsKey(key)) {
                throw new BusinessException("SPEC_KEY_IN_USE_CANNOT_DELETE",
                        "Không thể xoá trường \"" + label + "\": đang có " + used
                                + " sản phẩm dùng. Xoá giá trị ở SP trước hoặc đổi danh mục cho SP.");
            }
            String oldType = oldField.get("type") == null ? "text" : oldField.get("type").toString();
            String newType = newTypeByKey.get(key);
            if (!oldType.equals(newType)) {
                throw new BusinessException("SPEC_TYPE_LOCKED",
                        "Không thể đổi kiểu dữ liệu của trường \"" + label + "\": đang có "
                                + used + " sản phẩm dùng.");
            }
        }
    }

    /**
     * Chặn spec template không hợp lệ trước khi lưu:
     * - Nhãn không được rỗng
     * - Key không được rỗng (được FE tự sinh từ nhãn nhưng vẫn double-check)
     * - Key không được trùng nhau trong cùng 1 template (tránh SP ghi chồng)
     */
    private void validateSpecTemplate(List<Map<String, Object>> template) {
        if (template == null || template.isEmpty()) return;
        java.util.Set<String> seenKeys = new java.util.HashSet<>();
        for (int i = 0; i < template.size(); i++) {
            Map<String, Object> field = template.get(i);
            Object labelObj = field.get("label");
            Object keyObj = field.get("key");
            String label = labelObj == null ? "" : labelObj.toString().trim();
            String key = keyObj == null ? "" : keyObj.toString().trim();

            if (label.isBlank()) {
                throw new BusinessException("SPEC_LABEL_BLANK",
                        "Trường số " + (i + 1) + " thiếu nhãn hiển thị");
            }
            if (key.isBlank()) {
                throw new BusinessException("SPEC_KEY_BLANK",
                        "Trường \"" + label + "\" chưa có mã định danh (key)");
            }
            if (!seenKeys.add(key)) {
                throw new BusinessException("SPEC_KEY_DUPLICATED",
                        "Trường \"" + label + "\" bị trùng với trường khác — hãy đổi nhãn cho khác biệt");
            }
        }
    }
}
