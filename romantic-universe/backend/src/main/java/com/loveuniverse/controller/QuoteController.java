package com.loveuniverse.controller;

import com.loveuniverse.dto.QuoteDto;
import com.loveuniverse.service.QuoteService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quotes")
public class QuoteController {

    private final QuoteService quoteService;

    public QuoteController(QuoteService quoteService) {
        this.quoteService = quoteService;
    }

    @GetMapping
    public List<QuoteDto> getAll() {
        return quoteService.findAllActive();
    }
}
