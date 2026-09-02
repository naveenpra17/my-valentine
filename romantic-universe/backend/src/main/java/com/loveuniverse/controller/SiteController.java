package com.loveuniverse.controller;

import com.loveuniverse.dto.*;
import com.loveuniverse.service.AuthService;
import com.loveuniverse.service.LoveBombService;
import com.loveuniverse.service.SiteService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sites")
public class SiteController {

    private final SiteService siteService;
    private final AuthService authService;
    private final LoveBombService loveBombService;

    public SiteController(SiteService siteService, AuthService authService, LoveBombService loveBombService) {
        this.siteService = siteService;
        this.authService = authService;
        this.loveBombService = loveBombService;
    }

    @GetMapping
    public List<SiteSummaryDto> listSites() {
        return siteService.listActiveSites();
    }

    @GetMapping("/{slug}")
    public SiteBundleDto getSite(@PathVariable String slug) {
        return siteService.getSiteBundle(slug);
    }

    @PostMapping("/{slug}/unlock")
    public SiteUnlockResponse unlock(@PathVariable String slug,
                                     @Valid @RequestBody SiteUnlockRequest request) {
        return authService.unlockSite(slug, request.answer());
    }

    @GetMapping("/{slug}/love-bombs/random")
    public LoveBombDto randomLoveBomb(@PathVariable String slug,
                                      @RequestParam(required = false) String sessionId) {
        return loveBombService.getRandomForSite(slug, sessionId);
    }
}
