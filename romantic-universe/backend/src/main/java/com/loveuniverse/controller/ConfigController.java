package com.loveuniverse.controller;

import com.loveuniverse.dto.SiteConfigDto;
import com.loveuniverse.service.SiteConfigService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    private final SiteConfigService siteConfigService;

    public ConfigController(SiteConfigService siteConfigService) {
        this.siteConfigService = siteConfigService;
    }

    @GetMapping
    public SiteConfigDto getConfig() {
        return siteConfigService.getConfig();
    }
}
