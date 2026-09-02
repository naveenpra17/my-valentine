package com.loveuniverse.service;

import com.loveuniverse.entity.Site;
import com.loveuniverse.exception.SiteNotFoundException;
import com.loveuniverse.repository.SiteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class SiteResolverService {

    public static final String DEFAULT_SITE_SLUG = "kavi";

    private final SiteRepository siteRepository;

    public SiteResolverService(SiteRepository siteRepository) {
        this.siteRepository = siteRepository;
    }

    public Site requireActiveSite(String slug) {
        return siteRepository.findBySlugIgnoreCaseAndActiveTrue(normalizeSlug(slug))
                .orElseThrow(() -> new SiteNotFoundException(slug));
    }

    public Site requireActiveSiteById(Long siteId) {
        return siteRepository.findById(siteId)
                .filter(Site::isActive)
                .orElseThrow(() -> new SiteNotFoundException(String.valueOf(siteId)));
    }

    public Site requireDefaultSite() {
        return requireActiveSite(DEFAULT_SITE_SLUG);
    }

    public String normalizeSlug(String slug) {
        if (slug == null) {
            throw new SiteNotFoundException("null");
        }
        return slug.trim().toLowerCase();
    }
}
