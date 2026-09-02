package com.loveuniverse.service;

import com.loveuniverse.dto.ReasonDto;
import com.loveuniverse.entity.Site;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.ReasonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ReasonService {

    private final ReasonRepository reasonRepository;
    private final SiteResolverService siteResolver;
    private final EntityMapper mapper;

    public ReasonService(ReasonRepository reasonRepository,
                         SiteResolverService siteResolver,
                         EntityMapper mapper) {
        this.reasonRepository = reasonRepository;
        this.siteResolver = siteResolver;
        this.mapper = mapper;
    }

    public List<ReasonDto> findAllActiveForSite(String slug) {
        Site site = siteResolver.requireActiveSite(slug);
        return reasonRepository.findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(site.getId())
                .stream()
                .map(mapper::toDto)
                .toList();
    }

    public List<ReasonDto> findAllActiveForDefaultSite() {
        return findAllActiveForSite(SiteResolverService.DEFAULT_SITE_SLUG);
    }
}
