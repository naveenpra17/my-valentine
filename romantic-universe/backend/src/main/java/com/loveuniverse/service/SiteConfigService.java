package com.loveuniverse.service;

import com.loveuniverse.dto.SiteConfigDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class SiteConfigService {

    private final SiteService siteService;

    public SiteConfigService(SiteService siteService) {
        this.siteService = siteService;
    }

    public SiteConfigDto getConfig() {
        return siteService.getDefaultPublicConfig();
    }

    public SiteConfigDto getConfigForSite(String slug) {
        return siteService.getPublicConfig(slug);
    }
}
