package com.example.LaptopWorld_project.blog.repository;

import com.example.LaptopWorld_project.blog.entity.PostCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostCategoryRepository extends JpaRepository<PostCategory, Long> {

    boolean existsBySlug(String slug);

    List<PostCategory> findAllByOrderByNameAsc();
}
