package com.loveuniverse.service;

import com.loveuniverse.config.EntryLockProperties;
import com.loveuniverse.dto.SiteConfigDto;
import com.loveuniverse.entity.SiteConfig;
import com.loveuniverse.repository.SiteConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class SiteConfigService {

    private final SiteConfigRepository siteConfigRepository;
    private final EntryLockProperties entryLockProperties;

    public SiteConfigService(SiteConfigRepository siteConfigRepository,
                             EntryLockProperties entryLockProperties) {
        this.siteConfigRepository = siteConfigRepository;
        this.entryLockProperties = entryLockProperties;
    }

    public SiteConfigDto getConfig() {
        List<SiteConfig> configs = siteConfigRepository.findAll();
        Map<String, String> settings = new LinkedHashMap<>();
        for (SiteConfig config : configs) {
            settings.put(config.getConfigKey(), config.getConfigValue());
        }

        String question = settings.getOrDefault("ENTRY_LOCK_QUESTION",
                "What's the nickname only I call you? ❤️");

        return new SiteConfigDto(
                settings,
                entryLockProperties.isEnabled(),
                question
        );
    }
}
