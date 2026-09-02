package com.loveuniverse.repository;

import com.loveuniverse.entity.Site;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SiteRepository extends JpaRepository<Site, Long> {
    Optional<Site> findBySlugIgnoreCase(String slug);
    Optional<Site> findBySlugIgnoreCaseAndActiveTrue(String slug);
    List<Site> findByActiveTrueOrderByNameAsc();
    boolean existsBySlugIgnoreCase(String slug);
}
