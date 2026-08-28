package com.loveuniverse.controller;

import com.loveuniverse.dto.ReasonDto;
import com.loveuniverse.service.ReasonService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reasons")
public class ReasonController {

    private final ReasonService reasonService;

    public ReasonController(ReasonService reasonService) {
        this.reasonService = reasonService;
    }

    @GetMapping
    public List<ReasonDto> getAll() {
        return reasonService.findAllActive();
    }
}
