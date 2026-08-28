package com.loveuniverse.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthVerifyRequest(
        @NotBlank String answer
) {}
