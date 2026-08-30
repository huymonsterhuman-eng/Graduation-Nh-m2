package com.example.LaptopWorld_project.blog.mapper;

import com.example.LaptopWorld_project.blog.dto.PostCategoryDto;
import com.example.LaptopWorld_project.blog.entity.PostCategory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface PostCategoryMapper {

    /**
     * postCount không map ở đây — service tự set qua {@link #withCount(PostCategoryDto, long)}
     * (bulk count 1 query khi list, tránh N+1).
     */
    @Mapping(target = "postCount", ignore = true)
    PostCategoryDto toDto(PostCategory entity);

    /** Tạo bản DTO mới với postCount đã điền — Java record immutable nên phải copy toàn bộ. */
    default PostCategoryDto withCount(PostCategoryDto base, long postCount) {
        return new PostCategoryDto(
                base.id(),
                base.name(),
                base.slug(),
                base.description(),
                postCount,
                base.createdAt(),
                base.updatedAt()
        );
    }
}
