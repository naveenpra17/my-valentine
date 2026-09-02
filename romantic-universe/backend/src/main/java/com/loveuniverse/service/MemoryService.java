package com.loveuniverse.service;

import com.loveuniverse.dto.MemoryDto;
import com.loveuniverse.entity.Memory;
import com.loveuniverse.entity.Site;
import com.loveuniverse.exception.ResourceNotFoundException;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.MemoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class MemoryService {

    private final MemoryRepository memoryRepository;
    private final SiteResolverService siteResolver;
    private final EntityMapper mapper;

    public MemoryService(MemoryRepository memoryRepository,
                         SiteResolverService siteResolver,
                         EntityMapper mapper) {
        this.memoryRepository = memoryRepository;
        this.siteResolver = siteResolver;
        this.mapper = mapper;
    }

    public List<MemoryDto> findAllActiveForSite(String slug) {
        Site site = siteResolver.requireActiveSite(slug);
        return findAllActiveForSite(site);
    }

    public List<MemoryDto> findAllActiveForDefaultSite() {
        return findAllActiveForSite(siteResolver.requireDefaultSite());
    }

    public MemoryDto findByIdForSite(String slug, Long id) {
        Site site = siteResolver.requireActiveSite(slug);
        Memory memory = memoryRepository.findBySiteIdAndIdAndActiveTrue(site.getId(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found: " + id));
        return mapper.toDto(memory);
    }

    public MemoryDto findByIdForDefaultSite(Long id) {
        return findByIdForSite(SiteResolverService.DEFAULT_SITE_SLUG, id);
    }

    private List<MemoryDto> findAllActiveForSite(Site site) {
        return memoryRepository.findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(site.getId())
                .stream()
                .map(mapper::toDto)
                .toList();
    }
}
