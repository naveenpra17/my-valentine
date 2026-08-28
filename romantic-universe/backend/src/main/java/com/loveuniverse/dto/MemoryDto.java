package com.loveuniverse.dto;

import java.time.LocalDate;

public record MemoryDto(
        Long id,
        String title,
        String message,
        LocalDate memoryDate,
        String location,
        String imageUrl,
        int displayOrder
) {}
