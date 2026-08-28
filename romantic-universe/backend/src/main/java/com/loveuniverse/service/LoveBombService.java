package com.loveuniverse.service;

import com.loveuniverse.dto.LoveBombDto;
import com.loveuniverse.entity.LoveBomb;
import com.loveuniverse.entity.LoveBombHistory;
import com.loveuniverse.exception.ResourceNotFoundException;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.LoveBombHistoryRepository;
import com.loveuniverse.repository.LoveBombRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class LoveBombService {

    private static final int RECENT_EXCLUSION_COUNT = 3;

    private final LoveBombRepository loveBombRepository;
    private final LoveBombHistoryRepository historyRepository;
    private final EntityMapper mapper;

    public LoveBombService(LoveBombRepository loveBombRepository,
                           LoveBombHistoryRepository historyRepository,
                           EntityMapper mapper) {
        this.loveBombRepository = loveBombRepository;
        this.historyRepository = historyRepository;
        this.mapper = mapper;
    }

    @Transactional
    public LoveBombDto getRandom(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = "anonymous";
        }

        List<LoveBomb> allActive = loveBombRepository.findByActiveTrue();
        if (allActive.isEmpty()) {
            throw new ResourceNotFoundException("No love bombs available");
        }

        List<Long> recentIds = historyRepository.findBySessionIdOrderByShownAtDesc(sessionId).stream()
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
        history.setSessionId(sessionId);
        history.setLoveBombId(selected.getId());
        historyRepository.save(history);

        return mapper.toDto(selected);
    }
}
