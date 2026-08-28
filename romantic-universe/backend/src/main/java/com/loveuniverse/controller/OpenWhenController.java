package com.loveuniverse.controller;

import com.loveuniverse.dto.OpenWhenDto;
import com.loveuniverse.service.OpenWhenService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/open-when")
public class OpenWhenController {

    private final OpenWhenService openWhenService;

    public OpenWhenController(OpenWhenService openWhenService) {
        this.openWhenService = openWhenService;
    }

    @GetMapping
    public List<OpenWhenDto> getAll() {
        return openWhenService.findAllActive();
    }
}
