package com.loveuniverse.controller;

import com.loveuniverse.dto.LoveBombDto;
import com.loveuniverse.service.LoveBombService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/love-bombs")
public class LoveBombController {

    private final LoveBombService loveBombService;

    public LoveBombController(LoveBombService loveBombService) {
        this.loveBombService = loveBombService;
    }

    @GetMapping("/random")
    public LoveBombDto getRandom(@RequestParam(required = false) String sessionId) {
        return loveBombService.getRandomForDefaultSite(sessionId);
    }
}
