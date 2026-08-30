package com.example.LaptopWorld_project.blog.service;

import com.example.LaptopWorld_project.blog.dto.PostCategoryDto;
import com.example.LaptopWorld_project.blog.dto.PostCategoryRequest;
import com.example.LaptopWorld_project.blog.entity.PostCategory;
import com.example.LaptopWorld_project.blog.mapper.PostCategoryMapper;
import com.example.LaptopWorld_project.blog.repository.PostCategoryRepository;
import com.example.LaptopWorld_project.blog.repository.PostRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.common.util.SlugGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PostCategoryService {

    private final PostCategoryRepository postCategoryRepository;
    private final PostRepository postRepository;
    private final PostCategoryMapper postCategoryMapper;

    @Transactional(readOnly = true)
    public List<PostCategoryDto> listAll() {
        Map<Long, Long> countByCat = new HashMap<>();
        for (Object[] row : postRepository.countGroupByPostCategory()) {
            countByCat.put((Long) row[0], (Long) row[1]);
        }
        return postCategoryRepository.findAllByOrderByNameAsc().stream()
                .map(pc -> postCategoryMapper.withCount(
                        postCategoryMapper.toDto(pc),
                        countByCat.getOrDefault(pc.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public PostCategoryDto findById(Long id) {
        PostCategory pc = getByIdOrThrow(id);
        return postCategoryMapper.withCount(
                postCategoryMapper.toDto(pc),
                postRepository.countByPostCategory_Id(id));
    }

    @Transactional
    public PostCategoryDto create(PostCategoryRequest req) {
        String slug = normalizeSlug(req.slug(), req.name());
        if (postCategoryRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug danh mục đã tồn tại: " + slug);
        }
        PostCategory pc = new PostCategory();
        pc.setName(req.name());
        pc.setSlug(slug);
        pc.setDescription(req.description());
        return postCategoryMapper.toDto(postCategoryRepository.save(pc));
    }

    @Transactional
    public PostCategoryDto update(Long id, PostCategoryRequest req) {
        PostCategory pc = getByIdOrThrow(id);
        String slug = normalizeSlug(req.slug(), req.name());
        if (!slug.equals(pc.getSlug()) && postCategoryRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug danh mục đã tồn tại: " + slug);
        }
        pc.setName(req.name());
        pc.setSlug(slug);
        pc.setDescription(req.description());
        return postCategoryMapper.toDto(postCategoryRepository.save(pc));
    }

    @Transactional
    public void delete(Long id) {
        PostCategory pc = getByIdOrThrow(id);
        long count = postRepository.countByPostCategory_Id(id);
        if (count > 0) {
            throw new BusinessException("CATEGORY_IN_USE",
                    "Không thể xoá danh mục \"" + pc.getName() + "\" — còn " + count
                    + " bài viết. Hãy chuyển các bài viết sang danh mục khác trước.");
        }
        try {
            postCategoryRepository.delete(pc);
            postCategoryRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException("CATEGORY_IN_USE",
                    "Không thể xoá danh mục còn bài viết. Hãy chuyển bài viết sang danh mục khác trước.");
        }
    }

    private PostCategory getByIdOrThrow(Long id) {
        return postCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PostCategory", id));
    }

    private String normalizeSlug(String slug, String name) {
        if (slug != null && !slug.isBlank()) return SlugGenerator.slugify(slug);
        return SlugGenerator.slugify(name);
    }
}
