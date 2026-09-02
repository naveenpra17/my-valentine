package com.loveuniverse.service;

import com.loveuniverse.dto.LoveBombDto;
import com.loveuniverse.entity.LoveBomb;
import com.loveuniverse.entity.LoveBombHistory;
import com.loveuniverse.entity.Site;
import com.loveuniverse.exception.ResourceNotFoundException;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.LoveBombHistoryRepository;
import com.loveuniverse.repository.LoveBombRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class LoveBombService {

    private static final int RECENT_EXCLUSION_COUNT = 3;

    private final LoveBombRepository loveBombRepository;
    private final LoveBombHistoryRepository historyRepository;
    private final SiteResolverService siteResolver;
    private final EntityMapper mapper;

    public LoveBombService(LoveBombRepository loveBombRepository,
                           LoveBombHistoryRepository historyRepository,
                           SiteResolverService siteResolver,
                           EntityMapper mapper) {
        this.loveBombRepository = loveBombRepository;
        this.historyRepository = historyRepository;
        this.siteResolver = siteResolver;
        this.mapper = mapper;
    }

    @Transactional
    public LoveBombDto getRandomForSite(String slug, String sessionId) {
        Site site = siteResolver.requireActiveSite(slug);
        return getRandomForSite(site, sessionId);
    }

    @Transactional
    public LoveBombDto getRandomForDefaultSite(String sessionId) {
        return getRandomForSite(siteResolver.requireDefaultSite(), sessionId);
    }

    private LoveBombDto getRandomForSite(Site site, String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = "anonymous";
        }

        Long siteId = site.getId();
        List<LoveBomb> allActive = loveBombRepository.findBySiteIdAndActiveTrue(siteId);
        if (allActive.isEmpty()) {
            throw new ResourceNotFoundException("No love bombs available");
        }

        List<Long> recentIds = historyRepository.findBySiteIdAndSessionIdOrderByShownAtDesc(siteId, sessionId).stream()
                .limit(RECENT_EXCLUSION_COUNT)
                .map(LoveBombHistory::getLoveBombId)
                .toList();

        List<LoveBomb> candidates = allActive.stream()
                .filter(lb -> !recentIds.contains(lb.getId()))
                .toList();

        if (candidates.isEmpty()) {
            candidates = allActive;
        }

        LoveBomb selected = candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));

        LoveBombHistory history = new LoveBombHistory();
        history.setSiteId(siteId);
        history.setSessionId(sessionId);
        history.setLoveBombId(selected.getId());
        historyRepository.save(history);

        return mapper.toDto(selected);
    }
}
