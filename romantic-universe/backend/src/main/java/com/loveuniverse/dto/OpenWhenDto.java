package com.loveuniverse.dto;

public record OpenWhenDto(
        Long id,
        String envelopeLabel,
        String message,
        int displayOrder
) {}
