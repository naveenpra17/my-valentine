package com.loveuniverse.dto;

import java.util.Map;

public record SiteConfigDto(
        Map<String, String> settings,
        boolean entryLockEnabled,
        String entryLockQuestion
) {}
