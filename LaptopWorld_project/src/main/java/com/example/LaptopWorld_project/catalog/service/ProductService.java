package com.example.LaptopWorld_project.catalog.service;

import com.example.LaptopWorld_project.catalog.dto.ProductDetailDto;
import com.example.LaptopWorld_project.catalog.dto.ProductListItemDto;
import com.example.LaptopWorld_project.catalog.dto.ProductRequest;
import com.example.LaptopWorld_project.catalog.entity.Brand;
import com.example.LaptopWorld_project.catalog.entity.Category;
import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.entity.ProductImage;
import com.example.LaptopWorld_project.catalog.mapper.ProductMapper;
import com.example.LaptopWorld_project.catalog.repository.BrandRepository;
import com.example.LaptopWorld_project.catalog.repository.CategoryRepository;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.ai.service.ProductEmbeddingService;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.common.util.SlugGenerator;
import com.example.LaptopWorld_project.inventory.repository.GoodsIssueDetailRepository;
import com.example.LaptopWorld_project.inventory.repository.GoodsReceiptDetailRepository;
import com.example.LaptopWorld_project.order.repository.OrderDetailRepository;
import com.example.LaptopWorld_project.review.dto.RatingSummaryDto;
import com.example.LaptopWorld_project.review.service.ReviewService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ProductMapper productMapper;
    private final ReviewService reviewService;
    private final OrderDetailRepository orderDetailRepository;
    private final GoodsReceiptDetailRepository goodsReceiptDetailRepository;
    private final GoodsIssueDetailRepository goodsIssueDetailRepository;
    private final ProductEmbeddingService productEmbeddingService;

    @PersistenceContext
    private EntityManager em;

    // ==================== PUBLIC READ ====================
    @Transactional(readOnly = true)
    public PagedResponse<ProductListItemDto> search(String keyword,
                                                    Long categoryId,
                                                    Long brandId,
                                                    BigDecimal minPrice,
                                                    BigDecimal maxPrice,
                                                    Pageable pageable) {
        return search(keyword, categoryId, brandId, minPrice, maxPrice, null, pageable);
    }

    /** Overload có thêm specs filter — dùng ở trang danh mục user site. */
    @Transactional(readOnly = true)
    public PagedResponse<ProductListItemDto> search(String keyword,
                                                    Long categoryId,
                                                    Long brandId,
                                                    BigDecimal minPrice,
                                                    BigDecimal maxPrice,
                                                    Map<String, List<String>> specs,
                                                    Pageable pageable) {
        List<Long> categoryIds = resolveCategoryIdsWithChildren(categoryId);
        var spec = ProductSpecifications.withFilter(keyword, categoryIds, brandId,
                                                    minPrice, maxPrice, true, specs);
        Page<Product> page = productRepository.findAll(spec, pageable);
        List<ProductListItemDto> items = enrichWithRatings(page.getContent());
        return new PagedResponse<>(items, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(),
                page.hasNext(), page.hasPrevious());
    }

    /**
     * Trả danh sách value + count cho từng key thông số kỹ thuật của 1 category
     * (đã bao gồm sub-cat con). Top N value/key sort theo count desc.
     * Chỉ hiện key có trong spec_template của category để bỏ noise key cũ.
     */
    @Transactional(readOnly = true)
    public java.util.List<SpecFilterGroup> findSpecValuesByCategory(Long categoryId, int topPerKey) {
        if (categoryId == null) return java.util.List.of();
        List<Long> categoryIds = resolveCategoryIdsWithChildren(categoryId);
        if (categoryIds == null || categoryIds.isEmpty()) return java.util.List.of();

        // Load parent template để lấy label + thứ tự hiển thị
        Category parent = categoryRepository.findById(categoryId).orElse(null);
        java.util.LinkedHashMap<String, String> templateOrder = new java.util.LinkedHashMap<>();
        if (parent != null && parent.getSpecTemplate() != null) {
            for (var f : parent.getSpecTemplate()) {
                Object k = f.get("key"); Object l = f.get("label");
                if (k != null) templateOrder.put(k.toString(), l != null ? l.toString() : k.toString());
            }
        }

        List<Object[]> rows = productRepository.aggregateSpecValuesByCategoryIds(categoryIds);
        // Group: key -> list of (value, count)
        java.util.Map<String, java.util.List<SpecFilterValue>> grouped = new java.util.LinkedHashMap<>();
        for (Object[] row : rows) {
            String key = (String) row[0];
            String value = (String) row[1];
            long count = ((Number) row[2]).longValue();
            grouped.computeIfAbsent(key, k -> new java.util.ArrayList<>())
                   .add(new SpecFilterValue(value, count));
        }

        java.util.List<SpecFilterGroup> result = new java.util.ArrayList<>();
        // Ưu tiên key theo thứ tự trong spec_template
        java.util.LinkedHashSet<String> ordered = new java.util.LinkedHashSet<>(templateOrder.keySet());
        for (String key : grouped.keySet()) ordered.add(key);

        for (String key : ordered) {
            var values = grouped.get(key);
            if (values == null || values.isEmpty()) continue;
            values.sort((a, b) -> Long.compare(b.count(), a.count()));
            if (topPerKey > 0 && values.size() > topPerKey) {
                values = new java.util.ArrayList<>(values.subList(0, topPerKey));
            }
            String label = templateOrder.getOrDefault(key, key);
            result.add(new SpecFilterGroup(key, label, values));
        }
        return result;
    }

    public record SpecFilterValue(String value, long count) {}
    public record SpecFilterGroup(String key, String label, java.util.List<SpecFilterValue> values) {}

    /**
     * Nếu category là cha (có con) → trả [catId, ...tất cả id con].
     * Nếu là lá → trả [catId]. Null → null.
     * Dùng cho public search để click "Xem tất cả Phụ kiện" (parent) vẫn ra SP của các con.
     */
    private List<Long> resolveCategoryIdsWithChildren(Long categoryId) {
        if (categoryId == null) return null;
        List<Long> ids = new ArrayList<>();
        ids.add(categoryId);
        categoryRepository.findByParentIdOrderBySortOrderAsc(categoryId)
                .forEach(c -> ids.add(c.getId()));
        return ids;
    }

    @Transactional
    public ProductDetailDto findBySlugAndIncrementViews(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm: " + slug));
        productRepository.incrementViews(product.getId());
        return productMapper.toDetail(product)
                .withRating(reviewService.getRatingSummary(product.getId()));
    }

    /**
     * Lấy danh sách SP theo list id — dùng cho trang wishlist (frontend lưu id trong localStorage).
     * Bỏ qua SP đã soft-delete (do @SQLRestriction). Kết quả giữ đúng thứ tự id đã truyền.
     */
    @Transactional(readOnly = true)
    public List<ProductListItemDto> findByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        List<Product> products = productRepository.findAllById(ids);
        // Giữ nguyên thứ tự truyền vào (findAllById không đảm bảo)
        Map<Long, Product> byId = new java.util.HashMap<>();
        for (Product p : products) byId.put(p.getId(), p);
        List<Product> ordered = new ArrayList<>();
        for (Long id : ids) {
            Product p = byId.get(id);
            if (p != null) ordered.add(p);
        }
        return enrichWithRatings(ordered);
    }

    /**
     * SP liên quan: cùng category + trong bracket giá ±30%, sort theo gần giá nhất trước.
     * Fallback tự nới bracket (±60%, ±100%) rồi bỏ hẳn bracket khi dataset thưa.
     *
     * Lý do bracket: user xem 1 laptop cao cấp 45 triệu thì "liên quan" phải là laptop
     * cùng phân khúc, không phải laptop văn phòng 12 triệu (dù cùng category).
     */
    @Transactional(readOnly = true)
    public List<ProductListItemDto> findRelated(Long productId, int limit) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", productId));
        if (product.getCategory() == null) return List.of();

        Long categoryId = product.getCategory().getId();
        java.math.BigDecimal basePrice = product.getPrice();
        if (basePrice == null || basePrice.signum() <= 0) {
            // Không có giá tham chiếu → fallback ngay về SQL cũ (cùng category, sort views)
            var pageable = PageRequest.of(0, limit);
            List<Product> list = productRepository.findRelatedByCategory(categoryId, productId, pageable);
            return enrichWithRatings(list);
        }

        // Bracket tăng dần: ±30% → ±60% → ±100% → bỏ bracket
        double[] brackets = { 0.30, 0.60, 1.00 };
        List<Product> result = List.of();
        for (double b : brackets) {
            java.math.BigDecimal minPrice = basePrice.multiply(java.math.BigDecimal.valueOf(1 - b));
            java.math.BigDecimal maxPrice = basePrice.multiply(java.math.BigDecimal.valueOf(1 + b));
            var pageable = PageRequest.of(0, limit);
            result = productRepository.findRelatedInPriceBracket(
                    categoryId, productId, basePrice, minPrice, maxPrice, pageable);
            // Chấp nhận khi có ít nhất half limit — tránh trả 1-2 SP đơn côi
            if (result.size() >= Math.max(4, limit / 2)) break;
        }

        // Fallback cuối: nếu cả 3 bracket đều thiếu, dùng cùng-category sort views như cũ
        if (result.size() < Math.max(4, limit / 2)) {
            var pageable = PageRequest.of(0, limit);
            result = productRepository.findRelatedByCategory(categoryId, productId, pageable);
        }

        return enrichWithRatings(result);
    }

    // ==================== ADMIN CRUD ====================
    @Transactional(readOnly = true)
    public PagedResponse<ProductListItemDto> adminSearch(String keyword,
                                                         Long categoryId,
                                                         Long brandId,
                                                         Boolean isActive,
                                                         ProductSpecifications.StockStatus stockStatus,
                                                         Pageable pageable) {
        var spec = ProductSpecifications.withAdminFilter(keyword, categoryId, brandId,
                                                         isActive, stockStatus);
        Page<Product> page = productRepository.findAll(spec, pageable);
        List<ProductListItemDto> items = enrichWithRatings(page.getContent());
        return new PagedResponse<>(items, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(),
                page.hasNext(), page.hasPrevious());
    }

    @Transactional(readOnly = true)
    public ProductDetailDto findByIdForAdmin(Long id) {
        Product product = productRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        return productMapper.toDetail(product)
                .withRating(reviewService.getRatingSummary(id));
    }

    /** Toggle nhanh trạng thái kinh doanh cho list SP admin — không đụng field khác. */
    @Transactional
    public ProductDetailDto setActive(Long id, boolean isActive) {
        Product entity = productRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        entity.setActive(isActive);
        productRepository.save(entity);
        return productMapper.toDetail(entity)
                .withRating(reviewService.getRatingSummary(id));
    }

    @Transactional
    public ProductDetailDto create(ProductRequest req) {
        String slug = normalizeSlug(req.slug(), req.name());
        if (productRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug đã tồn tại: " + slug);
        }
        if (req.sku() != null && !req.sku().isBlank()
                && productRepository.existsBySku(req.sku())) {
            throw new BusinessException("SKU_TAKEN", "SKU đã tồn tại: " + req.sku());
        }
        validateSalePrice(req);

        Product entity = new Product();
        applyRequest(entity, req, slug);
        productRepository.save(entity);

        // Auto re-embed nền — bot biết SP mới sau vài giây (chỉ khi active).
        if (entity.isActive()) {
            productEmbeddingService.embedOneAsync(entity.getId());
        }
        return productMapper.toDetail(entity);
    }

    @Transactional
    public ProductDetailDto update(Long id, ProductRequest req) {
        Product entity = productRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        String slug = normalizeSlug(req.slug(), req.name());
        if (!slug.equals(entity.getSlug()) && productRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug đã tồn tại: " + slug);
        }
        if (req.sku() != null && !req.sku().equals(entity.getSku())
                && productRepository.existsBySku(req.sku())) {
            throw new BusinessException("SKU_TAKEN", "SKU đã tồn tại: " + req.sku());
        }
        validateSalePrice(req);

        // Snapshot các field ảnh hưởng chatbot (embed text) trước khi apply — dùng để so sánh
        // sau save. Nếu không đổi thì bỏ qua re-embed, tiết kiệm quota Gemini.
        String prevEmbedText = productEmbedSignature(entity);
        boolean prevActive = entity.isActive();

        applyRequest(entity, req, slug);
        productRepository.save(entity);

        String nextEmbedText = productEmbedSignature(entity);
        boolean nextActive = entity.isActive();
        boolean contentChanged = !prevEmbedText.equals(nextEmbedText);
        boolean justActivated = !prevActive && nextActive;

        if (nextActive && (contentChanged || justActivated)) {
            productEmbeddingService.embedOneAsync(entity.getId());
        }
        return productMapper.toDetail(entity);
    }

    /**
     * Signature gộp các field mà ProductEmbeddingService.buildEmbedText đang dùng.
     * Đổi bất kỳ field nào ở đây → cần re-embed để chatbot biết thông tin mới.
     */
    private String productEmbedSignature(Product p) {
        StringBuilder sb = new StringBuilder();
        sb.append(nz(p.getName())).append('|');
        sb.append(nz(p.getShortDescription())).append('|');
        sb.append(nz(p.getDescription())).append('|');
        sb.append(p.getBrand() != null ? p.getBrand().getId() : "").append('|');
        sb.append(p.getCategory() != null ? p.getCategory().getId() : "").append('|');
        sb.append(p.getPrice() != null ? p.getPrice().stripTrailingZeros().toPlainString() : "").append('|');
        sb.append(p.getSalePrice() != null ? p.getSalePrice().stripTrailingZeros().toPlainString() : "").append('|');
        sb.append(p.getSpecs() != null ? p.getSpecs().toString() : "");
        return sb.toString();
    }

    private static String nz(String s) { return s == null ? "" : s; }

    @Transactional
    public void delete(Long id) {
        Product entity = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));

        // Guardrails — chặn xóa nếu SP còn liên quan tới nghiệp vụ đang chạy
        if (orderDetailRepository.existsByProductId(id)) {
            throw new BusinessException("PRODUCT_IN_ORDER",
                    "Không thể xóa: sản phẩm đã có trong đơn hàng. Hãy đặt Ngừng kinh doanh thay vì xóa.");
        }
        if (goodsReceiptDetailRepository.existsByProductId(id)) {
            throw new BusinessException("PRODUCT_IN_RECEIPT",
                    "Không thể xóa: sản phẩm đã xuất hiện trong phiếu nhập kho.");
        }
        if (goodsIssueDetailRepository.existsByProductId(id)) {
            throw new BusinessException("PRODUCT_IN_ISSUE",
                    "Không thể xóa: sản phẩm đã xuất hiện trong phiếu xuất kho.");
        }
        if (entity.getStock() > 0) {
            throw new BusinessException("PRODUCT_HAS_STOCK",
                    "Không thể xóa: sản phẩm còn " + entity.getStock()
                            + " đơn vị trong kho. Hãy xuất hết hoặc đặt Ngừng kinh doanh.");
        }

        productRepository.delete(entity);   // soft delete qua @SQLDelete
    }

    /** Khôi phục SP đã soft-delete (bypass @SQLRestriction bằng native query). */
    @Transactional
    public void restore(Long id) {
        int updated = productRepository.restoreSoftDeleted(id);
        if (updated == 0) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm đã xóa với id: " + id);
        }
    }

    /** List các SP đã soft-delete. */
    @Transactional(readOnly = true)
    public List<ProductListItemDto> findDeleted() {
        List<Product> deleted = productRepository.findAllDeleted();
        return enrichWithRatings(deleted);
    }

    // ==================== helpers ====================

    /**
     * Bulk enrich rating cho danh sách SP — 1 query aggregate cho toàn bộ id,
     * merge kết quả vào từng DTO. Tránh N+1.
     */
    private List<ProductListItemDto> enrichWithRatings(List<Product> products) {
        if (products.isEmpty()) return List.of();
        List<Long> ids = products.stream().map(Product::getId).toList();
        Map<Long, RatingSummaryDto> ratings = reviewService.getRatingSummariesBulk(ids);
        return products.stream()
                .map(p -> productMapper.toListItem(p).withRating(ratings.get(p.getId())))
                .toList();
    }

    private String normalizeSlug(String slug, String name) {
        if (slug != null && !slug.isBlank()) return SlugGenerator.slugify(slug);
        return SlugGenerator.slugify(name);
    }

    private void validateSalePrice(ProductRequest req) {
        if (req.salePrice() != null && req.price() != null
                && req.salePrice().compareTo(req.price()) > 0) {
            throw new BusinessException("INVALID_SALE_PRICE",
                    "Giá khuyến mãi phải nhỏ hơn hoặc bằng giá gốc");
        }
        if (req.costPrice() != null && req.price() != null
                && req.costPrice().compareTo(req.price()) > 0) {
            throw new BusinessException("INVALID_COST_PRICE",
                    "Giá vốn phải nhỏ hơn hoặc bằng giá bán");
        }
    }

    private void applyRequest(Product entity, ProductRequest req, String slug) {
        entity.setName(req.name());
        entity.setSlug(slug);
        entity.setSku(req.sku());
        entity.setShortDescription(req.shortDescription());
        entity.setDescription(req.description());
        entity.setPrice(req.price());
        entity.setSalePrice(req.salePrice());
        entity.setCostPrice(req.costPrice());
        entity.setSpecs(req.specs());
        // Stock KHÔNG cho phép chỉnh trực tiếp qua API — luôn phải đi qua Phiếu nhập/xuất kho.
        // SP mới tạo mặc định stock=0, sau đó nhập phiếu để có hàng.
        // Bỏ qua req.stock() hoàn toàn.
        if (req.isFeatured() != null) entity.setFeatured(req.isFeatured());
        if (req.isActive() != null)   entity.setActive(req.isActive());

        // Brand
        if (req.brandId() != null) {
            Brand brand = brandRepository.findById(req.brandId())
                    .orElseThrow(() -> new ResourceNotFoundException("Brand", req.brandId()));
            entity.setBrand(brand);
        } else {
            entity.setBrand(null);
        }

        // Category
        if (req.categoryId() != null) {
            Category category = categoryRepository.findById(req.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", req.categoryId()));
            entity.setCategory(category);
        } else {
            entity.setCategory(null);
        }

        // Images: replace all (đơn giản — update = xóa cũ + thêm mới)
        // Flush sau clear() để DELETE chạy trước INSERT — nếu không, Hibernate có thể
        // INSERT ảnh primary mới TRƯỚC khi DELETE ảnh primary cũ → vi phạm partial
        // unique index `ux_product_images_one_primary`.
        if (req.images() != null) {
            if (!entity.getImages().isEmpty()) {
                entity.getImages().clear();
                em.flush();
            }
            for (ProductRequest.ImageInput img : req.images()) {
                ProductImage pi = new ProductImage();
                pi.setPath(img.path());
                pi.setAlt(img.alt());
                pi.setSortOrder(img.sortOrder() != null ? img.sortOrder() : 0);
                pi.setPrimary(Boolean.TRUE.equals(img.isPrimary()));
                entity.addImage(pi);
            }
        }
    }
}
