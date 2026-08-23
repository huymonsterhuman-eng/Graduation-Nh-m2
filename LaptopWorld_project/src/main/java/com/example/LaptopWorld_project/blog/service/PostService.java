package com.example.LaptopWorld_project.blog.service;

import com.example.LaptopWorld_project.blog.dto.PostDetailDto;
import com.example.LaptopWorld_project.blog.dto.PostListItemDto;
import com.example.LaptopWorld_project.blog.dto.PostRequest;
import com.example.LaptopWorld_project.blog.entity.Post;
import com.example.LaptopWorld_project.blog.entity.PostCategory;
import com.example.LaptopWorld_project.blog.mapper.PostMapper;
import com.example.LaptopWorld_project.blog.repository.PostCategoryRepository;
import com.example.LaptopWorld_project.blog.repository.PostRepository;
import com.example.LaptopWorld_project.common.dto.PagedResponse;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.common.util.SlugGenerator;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final PostCategoryRepository postCategoryRepository;
    private final UserRepository userRepository;
    private final PostMapper postMapper;

    // ==================== PUBLIC ====================

    @Transactional(readOnly = true)
    public PagedResponse<PostListItemDto> publicList(String keyword, Long categoryId, Pageable pageable) {
        Page<Post> page = postRepository.findAll(
                PostRepository.publishedFilter(keyword, categoryId, OffsetDateTime.now()),
                pageable);
        return PagedResponse.from(page, postMapper::toListItem);
    }

    /**
     * Public detail — chỉ trả post đã publish. Tăng views mỗi lần gọi.
     */
    @Transactional
    public PostDetailDto publicFindBySlugAndIncrementViews(String slug) {
        Post post = postRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết: " + slug));
        if (!post.isPublished()
                || (post.getPublishedAt() != null && post.getPublishedAt().isAfter(OffsetDateTime.now()))) {
            throw new ResourceNotFoundException("Không tìm thấy bài viết: " + slug);
        }
        postRepository.incrementViews(post.getId());
        post.setViews(post.getViews() + 1);   // cập nhật trong entity đang trả về để DTO có views mới nhất
        return postMapper.toDetail(post);
    }

    // ==================== ADMIN ====================

    @Transactional(readOnly = true)
    public PagedResponse<PostListItemDto> adminList(String keyword, Long categoryId,
                                                    Boolean isPublished, Pageable pageable) {
        Page<Post> page = postRepository.findAll(
                PostRepository.adminFilter(keyword, categoryId, isPublished), pageable);
        return PagedResponse.from(page, postMapper::toListItem);
    }

    @Transactional(readOnly = true)
    public PostDetailDto adminFindById(Long id) {
        return postMapper.toDetail(getByIdOrThrow(id));
    }

    @Transactional
    public PostDetailDto adminCreate(Long authorId, PostRequest req) {
        String slug = normalizeSlug(req.slug(), req.title());
        if (postRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug bài viết đã tồn tại: " + slug);
        }
        Post p = new Post();
        p.setSlug(slug);
        applyRequest(p, req);
        setAuthor(p, authorId);
        return postMapper.toDetail(postRepository.save(p));
    }

    @Transactional
    public PostDetailDto adminUpdate(Long id, PostRequest req) {
        Post p = getByIdOrThrow(id);
        String slug = normalizeSlug(req.slug(), req.title());
        if (!slug.equals(p.getSlug()) && postRepository.existsBySlug(slug)) {
            throw new BusinessException("SLUG_TAKEN", "Slug bài viết đã tồn tại: " + slug);
        }
        p.setSlug(slug);
        applyRequest(p, req);
        return postMapper.toDetail(postRepository.save(p));
    }

    @Transactional
    public void adminDelete(Long id) {
        Post p = getByIdOrThrow(id);
        postRepository.delete(p);
    }

    // ==================== helpers ====================

    private Post getByIdOrThrow(Long id) {
        return postRepository.findWithRefsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Post", id));
    }

    private void applyRequest(Post p, PostRequest req) {
        p.setTitle(req.title());
        p.setImage(req.image());
        p.setExcerpt(req.excerpt());
        p.setContent(req.content());

        if (req.postCategoryId() != null) {
            PostCategory pc = postCategoryRepository.findById(req.postCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("PostCategory", req.postCategoryId()));
            p.setPostCategory(pc);
        } else {
            p.setPostCategory(null);
        }

        // Publish state
        if (req.isPublished() != null) {
            boolean prev = p.isPublished();
            p.setPublished(req.isPublished());
            // Publish lần đầu — set publishedAt = now nếu request không cung cấp
            if (req.isPublished() && !prev && req.publishedAt() == null && p.getPublishedAt() == null) {
                p.setPublishedAt(OffsetDateTime.now());
            }
        }
        if (req.publishedAt() != null) {
            p.setPublishedAt(req.publishedAt());
        }
    }

    private void setAuthor(Post p, Long authorId) {
        if (authorId == null) return;
        User author = userRepository.findById(authorId).orElse(null);
        if (author != null) p.setAuthor(author);
    }

    private String normalizeSlug(String slug, String title) {
        if (slug != null && !slug.isBlank()) return SlugGenerator.slugify(slug);
        return SlugGenerator.slugify(title);
    }
}
