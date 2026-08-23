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
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.common.util.SlugGenerator;
import com.example.LaptopWorld_project.inventory.repository.GoodsIssueDetailRepository;
import com.example.LaptopWorld_project.inventory.repository.GoodsReceiptDetailRepository;
import com.example.LaptopWorld_project.order.repository.OrderDetailRepository;
import com.example.LaptopWorld_project.review.dto.RatingSummaryDto;
import com.example.LaptopWorld_project.review.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    // ==================== PUBLIC READ ====================
    @Transactional(readOnly = true)
    public PagedResponse<ProductListItemDto> search(String keyword,
                                                    Long categoryId,
                                                    Long brandId,
                                                    BigDecimal minPrice,
                                                    BigDecimal maxPrice,
                                                    Pageable pageable) {
        var spec = ProductSpecifications.withFilter(keyword, categoryId, brandId,
                                                    minPrice, maxPrice, true);
        Page<Product> page = productRepository.findAll(spec, pageable);
        List<ProductListItemDto> items = enrichWithRatings(page.getContent());
        return new PagedResponse<>(items, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(),
                page.hasNext(), page.hasPrevious());
    }

    @Transactional
    public ProductDetailDto findBySlugAndIncrementViews(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm: " + slug));
        productRepository.incrementViews(product.getId());
        return productMapper.toDetail(product)
                .withRating(reviewService.getRatingSummary(product.getId()));
    }

    @Transactional(readOnly = true)
    public List<ProductListItemDto> findRelated(Long productId, int limit) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", productId));
        if (product.getCategory() == null) return List.of();

        var pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "views"));
        var spec = ProductSpecifications.withFilter(null,
                                                    product.getCategory().getId(),
                                                    null, null, null, true);
        Page<Product> page = productRepository.findAll(spec, pageable);
        List<Product> filtered = page.getContent().stream()
                .filter(p -> !p.getId().equals(productId))
                .toList();
        return enrichWithRatings(filtered);
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

        applyRequest(entity, req, slug);
        productRepository.save(entity);
        return productMapper.toDetail(entity);
    }

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
        if (req.images() != null) {
            entity.getImages().clear();
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
