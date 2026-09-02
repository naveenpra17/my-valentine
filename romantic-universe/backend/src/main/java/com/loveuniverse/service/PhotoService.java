package com.loveuniverse.service;

import com.loveuniverse.dto.PhotoDto;
import com.loveuniverse.entity.Site;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.PhotoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class PhotoService {

    private final PhotoRepository photoRepository;
    private final SiteResolverService siteResolver;
    private final EntityMapper mapper;

    public PhotoService(PhotoRepository photoRepository,
                        SiteResolverService siteResolver,
                        EntityMapper mapper) {
        this.photoRepository = photoRepository;
        this.siteResolver = siteResolver;
        this.mapper = mapper;
    }

    public List<PhotoDto> findAllActiveForSite(String slug) {
        Site site = siteResolver.requireActiveSite(slug);
        return photoRepository.findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(site.getId())
                .stream()
                .map(mapper::toDto)
                .toList();
    }

    public List<PhotoDto> findAllActiveForDefaultSite() {
        return findAllActiveForSite(SiteResolverService.DEFAULT_SITE_SLUG);
    }
}
