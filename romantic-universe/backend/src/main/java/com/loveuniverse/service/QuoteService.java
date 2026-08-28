package com.loveuniverse.service;

import com.loveuniverse.dto.QuoteDto;
import com.loveuniverse.mapper.EntityMapper;
import com.loveuniverse.repository.QuoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class QuoteService {

    private final QuoteRepository quoteRepository;
    private final EntityMapper mapper;

    public QuoteService(QuoteRepository quoteRepository, EntityMapper mapper) {
        this.quoteRepository = quoteRepository;
        this.mapper = mapper;
    }

    public List<QuoteDto> findAllActive() {
        return quoteRepository.findByActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(mapper::toDto)
                .toList();
    }
}
