package com.loveuniverse.service;

import com.loveuniverse.dto.QuoteDto;
import com.loveuniverse.entity.Site;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.QuoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class QuoteService {

    private final QuoteRepository quoteRepository;
    private final SiteResolverService siteResolver;
    private final EntityMapper mapper;

    public QuoteService(QuoteRepository quoteRepository,
                        SiteResolverService siteResolver,
                        EntityMapper mapper) {
        this.quoteRepository = quoteRepository;
        this.siteResolver = siteResolver;
        this.mapper = mapper;
    }

    public List<QuoteDto> findAllActiveForSite(String slug) {
        Site site = siteResolver.requireActiveSite(slug);
        return quoteRepository.findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(site.getId())
                .stream()
                .map(mapper::toDto)
                .toList();
    }

    public List<QuoteDto> findAllActiveForDefaultSite() {
        return findAllActiveForSite(SiteResolverService.DEFAULT_SITE_SLUG);
    }
}
