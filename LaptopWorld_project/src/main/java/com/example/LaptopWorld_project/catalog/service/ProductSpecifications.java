package com.example.LaptopWorld_project.catalog.service;

import com.example.LaptopWorld_project.catalog.entity.Product;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Build dynamic filter cho Product theo các tiêu chí tùy chọn.
 * Deleted rows tự động loại nhờ @SQLRestriction trên Product entity.
 */
public final class ProductSpecifications {

    private ProductSpecifications() {}

    /** Lọc tồn kho theo mức — dùng cho admin. */
    public enum StockStatus {
        ALL,
        IN_STOCK,       // stock > 0
        LOW_STOCK,      // 5-10
        CRITICAL_STOCK, // 1-4
        OUT_OF_STOCK    // <= 0
    }

    public static Specification<Product> withFilter(String keyword,
                                                    Collection<Long> categoryIds,
                                                    Long brandId,
                                                    BigDecimal minPrice,
                                                    BigDecimal maxPrice,
                                                    Boolean activeOnly) {
        return withFilter(keyword, categoryIds, brandId, minPrice, maxPrice, activeOnly, null);
    }

    /**
     * Overload có thêm `specs` filter — mỗi entry {key -> [values]}:
     * cùng key = OR (SP thuộc bất kỳ value nào của key đó);
     * khác key = AND (phải thỏa tất cả nhóm).
     * Dùng Postgres function `jsonb_extract_path_text(specs, 'key')`.
     */
    public static Specification<Product> withFilter(String keyword,
                                                    Collection<Long> categoryIds,
                                                    Long brandId,
                                                    BigDecimal minPrice,
                                                    BigDecimal maxPrice,
                                                    Boolean activeOnly,
                                                    Map<String, List<String>> specs) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // JPA dùng FIELD access -> property name = tên field trong entity (isActive)
            // KHÔNG dùng bean property (active) như MapStruct.
            if (activeOnly != null && activeOnly) {
                predicates.add(cb.isTrue(root.get("isActive")));
            }
            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("shortDescription"), "")), pattern)
                ));
            }
            if (categoryIds != null && !categoryIds.isEmpty()) {
                predicates.add(root.get("category").get("id").in(categoryIds));
            }
            if (brandId != null) {
                predicates.add(cb.equal(root.get("brand").get("id"), brandId));
            }

            // Effective price = COALESCE(sale_price, price)
            if (minPrice != null || maxPrice != null) {
                Expression<BigDecimal> effectivePrice = cb.coalesce(
                        root.<BigDecimal>get("salePrice"),
                        root.<BigDecimal>get("price"));
                if (minPrice != null) predicates.add(cb.greaterThanOrEqualTo(effectivePrice, minPrice));
                if (maxPrice != null) predicates.add(cb.lessThanOrEqualTo(effectivePrice, maxPrice));
            }

            // Specs filter: key = specs->>'chip' IN (:values). Nhiều key = AND.
            if (specs != null && !specs.isEmpty()) {
                for (Map.Entry<String, List<String>> e : specs.entrySet()) {
                    String key = e.getKey();
                    List<String> values = e.getValue();
                    if (key == null || key.isBlank() || values == null || values.isEmpty()) continue;
                    Expression<String> extracted = cb.function(
                            "jsonb_extract_path_text", String.class,
                            root.get("specs"), cb.literal(key));
                    predicates.add(extracted.in(values));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Filter cho admin — mở rộng: nullable activeFlag (null=all, true=active, false=inactive)
     * + StockStatus 4 mức.
     */
    public static Specification<Product> withAdminFilter(String keyword,
                                                         Long categoryId,
                                                         Long brandId,
                                                         Boolean activeFlag,
                                                         StockStatus stockStatus) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("sku"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("shortDescription"), "")), pattern)
                ));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (brandId != null) {
                predicates.add(cb.equal(root.get("brand").get("id"), brandId));
            }
            if (activeFlag != null) {
                predicates.add(cb.equal(root.get("isActive"), activeFlag));
            }
            if (stockStatus != null && stockStatus != StockStatus.ALL) {
                Expression<Integer> stock = root.get("stock");
                switch (stockStatus) {
                    case IN_STOCK       -> predicates.add(cb.greaterThan(stock, 0));
                    case LOW_STOCK      -> predicates.add(cb.between(stock, 5, 10));
                    case CRITICAL_STOCK -> predicates.add(cb.between(stock, 1, 4));
                    case OUT_OF_STOCK   -> predicates.add(cb.lessThanOrEqualTo(stock, 0));
                    default -> {}
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
