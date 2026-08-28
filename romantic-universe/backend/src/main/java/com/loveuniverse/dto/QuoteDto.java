package com.loveuniverse.dto;

public record QuoteDto(
        Long id,
        String text,
        String author,
        int displayOrder
) {}
