package com.loveuniverse.dto;

public record PhotoDto(
        Long id,
        String title,
        String caption,
        String imageUrl,
        Long memoryId,
        int displayOrder
) {}
