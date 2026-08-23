package com.example.LaptopWorld_project.blog.mapper;

import com.example.LaptopWorld_project.blog.dto.PostDetailDto;
import com.example.LaptopWorld_project.blog.dto.PostListItemDto;
import com.example.LaptopWorld_project.blog.entity.Post;
import org.mapstruct.Mapper;

@Mapper
public interface PostMapper {

    default PostListItemDto toListItem(Post p) {
        if (p == null) return null;
        return new PostListItemDto(
                p.getId(),
                p.getTitle(),
                p.getSlug(),
                p.getImage(),
                p.getExcerpt(),
                p.getPostCategory() != null ? p.getPostCategory().getId() : null,
                p.getPostCategory() != null ? p.getPostCategory().getName() : null,
                p.getAuthor() != null ? p.getAuthor().getFullName() : null,
                p.isPublished(),
                p.getPublishedAt(),
                p.getViews(),
                p.getCreatedAt()
        );
    }

    default PostDetailDto toDetail(Post p) {
        if (p == null) return null;
        return new PostDetailDto(
                p.getId(),
                p.getTitle(),
                p.getSlug(),
                p.getImage(),
                p.getExcerpt(),
                p.getContent(),
                p.getPostCategory() != null ? p.getPostCategory().getId() : null,
                p.getPostCategory() != null ? p.getPostCategory().getName() : null,
                p.getPostCategory() != null ? p.getPostCategory().getSlug() : null,
                p.getAuthor() != null ? p.getAuthor().getId() : null,
                p.getAuthor() != null ? p.getAuthor().getFullName() : null,
                p.isPublished(),
                p.getPublishedAt(),
                p.getViews(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
