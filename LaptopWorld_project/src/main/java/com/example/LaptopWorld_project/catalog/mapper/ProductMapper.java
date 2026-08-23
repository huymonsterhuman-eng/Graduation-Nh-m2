package com.example.LaptopWorld_project.catalog.mapper;

import com.example.LaptopWorld_project.catalog.dto.ProductDetailDto;
import com.example.LaptopWorld_project.catalog.dto.ProductListItemDto;
import com.example.LaptopWorld_project.catalog.entity.Brand;
import com.example.LaptopWorld_project.catalog.entity.Category;
import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.entity.ProductImage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

@Mapper
public interface ProductMapper {

    // ---------- List item ----------
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "brandName",    source = "brand.name")
    @Mapping(target = "primaryImage", source = "images", qualifiedByName = "primaryImagePath")
    @Mapping(target = "isFeatured",   source = "featured")
    @Mapping(target = "avgRating",    ignore = true) // gán sau qua ProductService.enrichRatings
    @Mapping(target = "reviewCount",  ignore = true)
    ProductListItemDto toListItem(Product entity);

    List<ProductListItemDto> toListItems(List<Product> entities);

    // ---------- Detail ----------
    @Mapping(target = "isFeatured",   source = "featured")
    @Mapping(target = "isActive",     source = "active")
    @Mapping(target = "avgRating",    ignore = true) // gán sau qua ProductService.enrichRating
    @Mapping(target = "reviewCount",  ignore = true)
    ProductDetailDto toDetail(Product entity);

    ProductDetailDto.BrandRef    toBrandRef(Brand brand);
    ProductDetailDto.CategoryRef toCategoryRef(Category category);

    @Mapping(target = "isPrimary", source = "primary")
    ProductDetailDto.ImageRef    toImageRef(ProductImage image);

    // ---------- Helper ----------
    @Named("primaryImagePath")
    default String primaryImagePath(List<ProductImage> images) {
        if (images == null || images.isEmpty()) return null;
        return images.stream()
                .filter(ProductImage::isPrimary)
                .map(ProductImage::getPath)
                .findFirst()
                .orElse(images.get(0).getPath());
    }
}
