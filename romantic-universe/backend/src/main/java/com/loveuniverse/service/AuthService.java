package com.loveuniverse.service;

import com.loveuniverse.config.EntryLockProperties;
import com.loveuniverse.dto.AuthVerifyResponse;
import com.loveuniverse.dto.SiteUnlockResponse;
import com.loveuniverse.entity.Site;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
public class AuthService {

    private final EntryLockProperties entryLockProperties;
    private final SiteResolverService siteResolver;
    private final SiteService siteService;

    public AuthService(EntryLockProperties entryLockProperties,
                       SiteResolverService siteResolver,
                       SiteService siteService) {
        this.entryLockProperties = entryLockProperties;
        this.siteResolver = siteResolver;
        this.siteService = siteService;
    }

    /** @deprecated Use {@link #unlockSite(String, String)} */
    public AuthVerifyResponse verify(String answer) {
        return new AuthVerifyResponse(unlockSite(SiteResolverService.DEFAULT_SITE_SLUG, answer).unlocked());
    }

    public SiteUnlockResponse unlockSite(String slug, String answer) {
        Site site = siteResolver.requireActiveSite(slug);
        boolean unlocked = validateAnswer(site, answer);
        return new SiteUnlockResponse(unlocked);
    }

    private boolean validateAnswer(Site site, String answer) {
        if (!isEntryLockEnabled(site.getId())) {
            return true;
        }

        String expected = resolveExpectedAnswer(site, answer);
        if (expected == null || expected.isBlank()) {
            return true;
        }

        if (answer == null) {
            return false;
        }

        return constantTimeEquals(
                expected.trim().toLowerCase(),
                answer.trim().toLowerCase()
        );
    }

    private boolean isEntryLockEnabled(Long siteId) {
        String enabled = siteService.getRawSettings(siteId).get("ENTRY_LOCK_ENABLED");
        if (enabled != null) {
            return "true".equalsIgnoreCase(enabled.trim()) || "1".equals(enabled.trim());
        }
        return entryLockProperties.isEnabled();
    }

    private String resolveExpectedAnswer(Site site, String answer) {
        String dbAnswer = siteService.getSecretSetting(site.getId(), "ENTRY_LOCK_ANSWER");
        if (dbAnswer != null && !dbAnswer.isBlank()) {
            return dbAnswer;
        }

        if (SiteResolverService.DEFAULT_SITE_SLUG.equalsIgnoreCase(site.getSlug())
                && entryLockProperties.getAnswer() != null
                && !entryLockProperties.getAnswer().isBlank()) {
            return entryLockProperties.getAnswer();
        }

        return null;
    }

    private boolean constantTimeEquals(String a, String b) {
        byte[] left = a.getBytes(StandardCharsets.UTF_8);
        byte[] right = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(left, right);
    }
}
