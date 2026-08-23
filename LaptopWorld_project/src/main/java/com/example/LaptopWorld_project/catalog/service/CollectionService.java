package com.example.LaptopWorld_project.catalog.service;

import com.example.LaptopWorld_project.catalog.dto.CollectionDto;
import com.example.LaptopWorld_project.catalog.dto.CollectionRequest;
import com.example.LaptopWorld_project.catalog.dto.ProductListItemDto;
import com.example.LaptopWorld_project.catalog.entity.Collection;
import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.mapper.CollectionMapper;
import com.example.LaptopWorld_project.catalog.mapper.ProductMapper;
import com.example.LaptopWorld_project.catalog.repository.CollectionRepository;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.common.util.SlugGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final ProductRepository productRepository;
    private final CollectionMapper collectionMapper;
    private final ProductMapper productMapper;

    @Transactional(readOnly = true)
    public List<CollectionDto> findAll() {
        return collectionMapper.toDtoList(collectionRepository.findAll());
    }

    @Transactional(readOnly = true)
    public List<CollectionDto> findHomeCollections() {
        return collectionMapper.toDtoList(
                collectionRepository.findByShowOnHomeTrueAndIsActiveTrueOrderBySortOrderAsc());
    }

    @Transactional(readOnly = true)
    public CollectionDto findBySlug(String slug) {
        return collectionMapper.toDto(collectionRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy collection: " + slug)));
    }

    @Transactional(readOnly = true)
    public CollectionDto findById(Long id) {
        return collectionMapper.toDto(getByIdOrThrow(id));
    }

    /** Trả danh sách SP thuộc collection — dùng cho trang admin quản lý SP. */
    @Transactional(readOnly = true)
    public List<ProductListItemDto> findProductsInCollection(Long id) {
        Collection c = getByIdOrThrow(id);
        return c.getProducts().stream()
                .sorted(Comparator.comparing(Product::getName))
                .map(productMapper::toListItem)
                .toList();
    }

    /** Public: danh sách SP theo slug — chỉ trả SP đang active. Có limit để hiện trên HomePage. */
    @Transactional(readOnly = true)
    public List<ProductListItemDto> findPublicProductsBySlug(String slug, int limit) {
        Collection c = collectionRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy collection: " + slug));
        int cap = Math.max(1, Math.min(limit, 50));
        return c.getProducts().stream()
                .filter(Product::isActive)
                .sorted(Comparator.comparing(Product::getName))
                .limit(cap)
                .map(productMapper::toListItem)
                .toList();
    }

    @Transactional
    public CollectionDto create(CollectionRequest req) {
        String slug = normalizeSlug(req.slug(), req.name());
        if (collectionRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug đã tồn tại: " + slug);
        }
        Collection entity = new Collection();
        applyRequest(entity, req, slug);
        return collectionMapper.toDto(collectionRepository.save(entity));
    }

    @Transactional
    public CollectionDto update(Long id, CollectionRequest req) {
        Collection entity = getByIdOrThrow(id);
        String slug = normalizeSlug(req.slug(), req.name());
        if (!slug.equals(entity.getSlug()) && collectionRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug đã tồn tại: " + slug);
        }
        applyRequest(entity, req, slug);
        return collectionMapper.toDto(collectionRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        collectionRepository.delete(getByIdOrThrow(id));
    }

    @Transactional
    public CollectionDto addProducts(Long collectionId, List<Long> productIds) {
        Collection collection = getByIdOrThrow(collectionId);
        List<Product> products = productRepository.findAllById(productIds);
        collection.getProducts().addAll(products);
        return collectionMapper.toDto(collectionRepository.save(collection));
    }

    @Transactional
    public CollectionDto removeProduct(Long collectionId, Long productId) {
        Collection collection = getByIdOrThrow(collectionId);
        collection.getProducts().removeIf(p -> p.getId().equals(productId));
        return collectionMapper.toDto(collectionRepository.save(collection));
    }

    // ==================== helpers ====================
    private Collection getByIdOrThrow(Long id) {
        return collectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", id));
    }

    private String normalizeSlug(String slug, String name) {
        if (slug != null && !slug.isBlank()) return SlugGenerator.slugify(slug);
        return SlugGenerator.slugify(name);
    }

    private void applyRequest(Collection entity, CollectionRequest req, String slug) {
        entity.setName(req.name());
        entity.setSlug(slug);
        entity.setImage(req.image());
        entity.setDescription(req.description());
        if (req.isActive() != null)   entity.setActive(req.isActive());
        if (req.showOnHome() != null) entity.setShowOnHome(req.showOnHome());
        if (req.sortOrder() != null)  entity.setSortOrder(req.sortOrder());

        if (req.parentId() != null) {
            if (req.parentId().equals(entity.getId())) {
                throw new BusinessException("INVALID_PARENT", "Collection không thể tự làm cha");
            }
            entity.setParent(getByIdOrThrow(req.parentId()));
        } else {
            entity.setParent(null);
        }
    }
}
