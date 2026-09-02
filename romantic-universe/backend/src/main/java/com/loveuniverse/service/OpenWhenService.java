package com.loveuniverse.service;

import com.loveuniverse.dto.OpenWhenDto;
import com.loveuniverse.entity.Site;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.OpenWhenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class OpenWhenService {

    private final OpenWhenRepository openWhenRepository;
    private final SiteResolverService siteResolver;
    private final EntityMapper mapper;

    public OpenWhenService(OpenWhenRepository openWhenRepository,
                           SiteResolverService siteResolver,
                           EntityMapper mapper) {
        this.openWhenRepository = openWhenRepository;
        this.siteResolver = siteResolver;
        this.mapper = mapper;
    }

    public List<OpenWhenDto> findAllActiveForSite(String slug) {
        Site site = siteResolver.requireActiveSite(slug);
        return openWhenRepository.findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(site.getId())
                .stream()
                .map(mapper::toDto)
                .toList();
    }

    public List<OpenWhenDto> findAllActiveForDefaultSite() {
        return findAllActiveForSite(SiteResolverService.DEFAULT_SITE_SLUG);
    }
}
