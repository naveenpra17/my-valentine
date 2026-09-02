package com.loveuniverse.service;

import com.loveuniverse.dto.*;
import com.loveuniverse.entity.Site;
import com.loveuniverse.entity.SiteConfig;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class SiteService {

    private static final Set<String> SECRET_CONFIG_KEYS = Set.of(
            "ENTRY_LOCK_ANSWER"
    );

    private static final Set<String> PROMOTED_CONFIG_KEYS = Set.of(
            "ENTRY_LOCK_ANSWER",
            "ENTRY_LOCK_QUESTION",
            "ENTRY_LOCK_ENABLED"
    );

    private final SiteRepository siteRepository;
    private final SiteResolverService siteResolver;
    private final SiteConfigRepository siteConfigRepository;
    private final MemoryRepository memoryRepository;
    private final PhotoRepository photoRepository;
    private final QuoteRepository quoteRepository;
    private final ReasonRepository reasonRepository;
    private final LoveBombRepository loveBombRepository;
    private final OpenWhenRepository openWhenRepository;
    private final EntityMapper mapper;

    public SiteService(SiteRepository siteRepository,
                       SiteResolverService siteResolver,
                       SiteConfigRepository siteConfigRepository,
                       MemoryRepository memoryRepository,
                       PhotoRepository photoRepository,
                       QuoteRepository quoteRepository,
                       ReasonRepository reasonRepository,
                       LoveBombRepository loveBombRepository,
                       OpenWhenRepository openWhenRepository,
                       EntityMapper mapper) {
        this.siteRepository = siteRepository;
        this.siteResolver = siteResolver;
        this.siteConfigRepository = siteConfigRepository;
        this.memoryRepository = memoryRepository;
        this.photoRepository = photoRepository;
        this.quoteRepository = quoteRepository;
        this.reasonRepository = reasonRepository;
        this.loveBombRepository = loveBombRepository;
        this.openWhenRepository = openWhenRepository;
        this.mapper = mapper;
    }

    public List<SiteSummaryDto> listActiveSites() {
        return siteRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(site -> new SiteSummaryDto(site.getSlug(), site.getName()))
                .toList();
    }

    public SiteBundleDto getSiteBundle(String slug) {
        Site site = siteResolver.requireActiveSite(slug);
        return buildBundle(site);
    }

    public SiteBundleDto getDefaultSiteBundle() {
        return buildBundle(siteResolver.requireDefaultSite());
    }

    public SiteConfigDto getPublicConfig(String slug) {
        Site site = siteResolver.requireActiveSite(slug);
        return toPublicConfig(site.getId());
    }

    public SiteConfigDto getDefaultPublicConfig() {
        return toPublicConfig(siteResolver.requireDefaultSite().getId());
    }

    public Map<String, String> getRawSettings(Long siteId) {
        Map<String, String> settings = new LinkedHashMap<>();
        for (SiteConfig config : siteConfigRepository.findBySiteIdOrderByConfigKeyAsc(siteId)) {
            settings.put(config.getConfigKey(), config.getConfigValue());
        }
        return settings;
    }

    public String getSecretSetting(Long siteId, String key) {
        return siteConfigRepository.findBySiteIdAndConfigKey(siteId, key)
                .map(SiteConfig::getConfigValue)
                .orElse(null);
    }

    private SiteBundleDto buildBundle(Site site) {
        Long siteId = site.getId();
        Map<String, String> publicConfig = toPublicSettings(siteId);
        boolean entryLockEnabled = parseBoolean(publicConfig.get("ENTRY_LOCK_ENABLED"), false);
        String entryLockQuestion = publicConfig.getOrDefault(
                "ENTRY_LOCK_QUESTION",
                "What's the nickname only I call you? ❤️"
        );

        return new SiteBundleDto(
                new SiteIdentityDto(site.getSlug(), site.getName()),
                publicConfig,
                entryLockEnabled,
                entryLockQuestion,
                memoryRepository.findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(siteId).stream()
                        .map(mapper::toDto).toList(),
                photoRepository.findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(siteId).stream()
                        .map(mapper::toDto).toList(),
                quoteRepository.findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(siteId).stream()
                        .map(mapper::toDto).toList(),
                reasonRepository.findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(siteId).stream()
                        .map(mapper::toDto).toList(),
                loveBombRepository.findBySiteIdAndActiveTrue(siteId).stream()
                        .map(mapper::toDto).toList(),
                openWhenRepository.findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(siteId).stream()
                        .map(mapper::toDto).toList()
        );
    }

    private SiteConfigDto toPublicConfig(Long siteId) {
        Map<String, String> settings = toPublicSettings(siteId);
        boolean entryLockEnabled = parseBoolean(settings.get("ENTRY_LOCK_ENABLED"), false);
        String entryLockQuestion = settings.getOrDefault(
                "ENTRY_LOCK_QUESTION",
                "What's the nickname only I call you? ❤️"
        );
        return new SiteConfigDto(settings, entryLockEnabled, entryLockQuestion);
    }

    private Map<String, String> toPublicSettings(Long siteId) {
        Map<String, String> settings = new LinkedHashMap<>();
        for (SiteConfig config : siteConfigRepository.findBySiteIdOrderByConfigKeyAsc(siteId)) {
            if (!SECRET_CONFIG_KEYS.contains(config.getConfigKey())
                    && !PROMOTED_CONFIG_KEYS.contains(config.getConfigKey())) {
                settings.put(config.getConfigKey(), config.getConfigValue());
            }
        }
        return settings;
    }

    private boolean parseBoolean(String value, boolean fallback) {
        if (value == null) return fallback;
        return "true".equalsIgnoreCase(value.trim()) || "1".equals(value.trim());
    }
}
