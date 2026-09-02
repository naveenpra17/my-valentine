package com.loveuniverse.controller;

import com.loveuniverse.dto.MemoryDto;
import com.loveuniverse.service.MemoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/memories")
public class MemoryController {

    private final MemoryService memoryService;

    public MemoryController(MemoryService memoryService) {
        this.memoryService = memoryService;
    }

    @GetMapping
    public List<MemoryDto> getAll() {
        return memoryService.findAllActiveForDefaultSite();
    }

    @GetMapping("/{id}")
    public MemoryDto getById(@PathVariable Long id) {
        return memoryService.findByIdForDefaultSite(id);
    }
}
