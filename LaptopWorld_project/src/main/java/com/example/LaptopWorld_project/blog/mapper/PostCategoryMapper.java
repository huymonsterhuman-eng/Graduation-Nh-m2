package com.example.LaptopWorld_project.blog.mapper;

import com.example.LaptopWorld_project.blog.dto.PostCategoryDto;
import com.example.LaptopWorld_project.blog.entity.PostCategory;
import org.mapstruct.Mapper;

@Mapper
public interface PostCategoryMapper {

    PostCategoryDto toDto(PostCategory entity);
}
