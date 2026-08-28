package com.loveuniverse.service;

import com.loveuniverse.dto.OpenWhenDto;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.OpenWhenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class OpenWhenService {

    private final OpenWhenRepository openWhenRepository;
    private final EntityMapper mapper;

    public OpenWhenService(OpenWhenRepository openWhenRepository, EntityMapper mapper) {
        this.openWhenRepository = openWhenRepository;
        this.mapper = mapper;
    }

    public List<OpenWhenDto> findAllActive() {
        return openWhenRepository.findByActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(mapper::toDto)
                .toList();
    }
}
