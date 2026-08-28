package com.loveuniverse.dto;

public record ReasonDto(
        Long id,
        String shortLabel,
        String longMessage,
        int displayOrder
) {}
