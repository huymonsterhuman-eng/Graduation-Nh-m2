package com.example.LaptopWorld_project.blog.repository;

import com.example.LaptopWorld_project.blog.entity.Post;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long>,
                                        JpaSpecificationExecutor<Post> {

    boolean existsBySlug(String slug);

    @EntityGraph(attributePaths = {"postCategory", "author"})
    Optional<Post> findBySlug(String slug);

    @EntityGraph(attributePaths = {"postCategory", "author"})
    Optional<Post> findWithRefsById(Long id);

    @Modifying
    @Query("UPDATE Post p SET p.views = p.views + 1 WHERE p.id = :id")
    void incrementViews(Long id);

    /** Spec cho public list: chỉ post đã publish và published_at đã tới. */
    static Specification<Post> publishedFilter(String keyword, Long categoryId, OffsetDateTime now) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            preds.add(cb.isTrue(root.get("isPublished")));
            preds.add(cb.lessThanOrEqualTo(root.get("publishedAt"), now));
            if (categoryId != null) {
                preds.add(cb.equal(root.get("postCategory").get("id"), categoryId));
            }
            if (keyword != null && !keyword.isBlank()) {
                String p = "%" + keyword.toLowerCase() + "%";
                preds.add(cb.or(
                        cb.like(cb.lower(root.get("title")), p),
                        cb.like(cb.lower(root.get("excerpt")), p)
                ));
            }
            return cb.and(preds.toArray(new Predicate[0]));
        };
    }

    /** Spec cho admin list: có thể filter theo published/all + keyword. */
    static Specification<Post> adminFilter(String keyword, Long categoryId, Boolean isPublished) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (isPublished != null) {
                preds.add(cb.equal(root.get("isPublished"), isPublished));
            }
            if (categoryId != null) {
                preds.add(cb.equal(root.get("postCategory").get("id"), categoryId));
            }
            if (keyword != null && !keyword.isBlank()) {
                String p = "%" + keyword.toLowerCase() + "%";
                preds.add(cb.like(cb.lower(root.get("title")), p));
            }
            return cb.and(preds.toArray(new Predicate[0]));
        };
    }

    @EntityGraph(attributePaths = {"postCategory", "author"})
    Page<Post> findAll(Specification<Post> spec, Pageable pageable);
}
