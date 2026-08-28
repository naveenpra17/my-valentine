package com.loveuniverse.service;

import com.loveuniverse.dto.ReasonDto;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.ReasonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ReasonService {

    private final ReasonRepository reasonRepository;
    private final EntityMapper mapper;

    public ReasonService(ReasonRepository reasonRepository, EntityMapper mapper) {
        this.reasonRepository = reasonRepository;
        this.mapper = mapper;
    }

    public List<ReasonDto> findAllActive() {
        return reasonRepository.findByActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(mapper::toDto)
                .toList();
    }
}
