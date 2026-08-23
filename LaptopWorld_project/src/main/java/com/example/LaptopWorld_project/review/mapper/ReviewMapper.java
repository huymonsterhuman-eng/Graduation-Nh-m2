package com.example.LaptopWorld_project.review.mapper;

import com.example.LaptopWorld_project.review.dto.ReviewDto;
import com.example.LaptopWorld_project.review.entity.Review;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper
public interface ReviewMapper {

    default ReviewDto toDto(Review r) {
        if (r == null) return null;
        List<String> images = r.getImages();
        String image = (images != null && !images.isEmpty()) ? images.get(0) : null;
        return new ReviewDto(
                r.getId(),
                r.getUser() != null ? r.getUser().getId() : null,
                r.getUser() != null ? r.getUser().getUsername() : null,
                r.getUser() != null ? r.getUser().getFullName() : null,
                r.getProduct() != null ? r.getProduct().getId() : null,
                r.getProduct() != null ? r.getProduct().getName() : null,
                r.getRating(),
                r.getComment(),
                image,
                r.isHidden(),
                r.getAdminReply(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
