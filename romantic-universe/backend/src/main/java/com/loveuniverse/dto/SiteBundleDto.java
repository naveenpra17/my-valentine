package com.loveuniverse.dto;

import java.util.List;
import java.util.Map;

public record SiteBundleDto(
        SiteIdentityDto site,
        Map<String, String> config,
        boolean entryLockEnabled,
        String entryLockQuestion,
        List<MemoryDto> memories,
        List<PhotoDto> photos,
        List<QuoteDto> quotes,
        List<ReasonDto> reasons,
        List<LoveBombDto> loveBombs,
        List<OpenWhenDto> openWhenMessages
) {}
