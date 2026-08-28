package com.loveuniverse.service;

import com.loveuniverse.dto.PhotoDto;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.PhotoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class PhotoService {

    private final PhotoRepository photoRepository;
    private final EntityMapper mapper;

    public PhotoService(PhotoRepository photoRepository, EntityMapper mapper) {
        this.photoRepository = photoRepository;
        this.mapper = mapper;
    }

    public List<PhotoDto> findAllActive() {
        return photoRepository.findByActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(mapper::toDto)
                .toList();
    }
}
