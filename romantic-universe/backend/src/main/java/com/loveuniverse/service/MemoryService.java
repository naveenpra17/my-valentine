package com.loveuniverse.service;

import com.loveuniverse.dto.MemoryDto;
import com.loveuniverse.entity.Memory;
import com.loveuniverse.exception.ResourceNotFoundException;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.MemoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class MemoryService {

    private final MemoryRepository memoryRepository;
    private final EntityMapper mapper;

    public MemoryService(MemoryRepository memoryRepository, EntityMapper mapper) {
        this.memoryRepository = memoryRepository;
        this.mapper = mapper;
    }

    public List<MemoryDto> findAllActive() {
        return memoryRepository.findByActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(mapper::toDto)
                .toList();
    }

    public MemoryDto findById(Long id) {
        Memory memory = memoryRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found: " + id));
        return mapper.toDto(memory);
    }
}
