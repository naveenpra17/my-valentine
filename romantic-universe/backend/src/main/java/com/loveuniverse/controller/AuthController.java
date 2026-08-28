package com.loveuniverse.controller;

import com.loveuniverse.dto.AuthVerifyRequest;
import com.loveuniverse.dto.AuthVerifyResponse;
import com.loveuniverse.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/verify")
    public AuthVerifyResponse verify(@Valid @RequestBody AuthVerifyRequest request) {
        return authService.verify(request.answer());
    }
}
