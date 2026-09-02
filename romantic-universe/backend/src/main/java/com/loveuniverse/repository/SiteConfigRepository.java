package com.loveuniverse.repository;

import com.loveuniverse.entity.SiteConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SiteConfigRepository extends JpaRepository<SiteConfig, Long> {
    List<SiteConfig> findBySiteIdOrderByConfigKeyAsc(Long siteId);
    Optional<SiteConfig> findBySiteIdAndConfigKey(Long siteId, String configKey);
}
