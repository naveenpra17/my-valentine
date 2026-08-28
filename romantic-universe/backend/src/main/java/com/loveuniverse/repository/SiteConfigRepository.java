package com.loveuniverse.repository;

import com.loveuniverse.entity.SiteConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SiteConfigRepository extends JpaRepository<SiteConfig, Long> {
    List<SiteConfig> findAll();
}
