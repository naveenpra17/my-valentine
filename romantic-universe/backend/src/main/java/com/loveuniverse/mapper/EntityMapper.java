package com.loveuniverse.mapper;

import com.loveuniverse.dto.*;
import com.loveuniverse.entity.*;
import org.springframework.stereotype.Component;

@Component
public class EntityMapper {

    public MemoryDto toDto(Memory entity) {
        return new MemoryDto(
                entity.getId(),
                entity.getTitle(),
                entity.getMessage(),
                entity.getMemoryDate(),
                entity.getLocation(),
                entity.getImageUrl(),
                entity.getDisplayOrder()
        );
    }

    public PhotoDto toDto(Photo entity) {
        return new PhotoDto(
                entity.getId(),
                entity.getTitle(),
                entity.getCaption(),
                entity.getImageUrl(),
                entity.getMemoryId(),
                entity.getDisplayOrder()
        );
    }

    public QuoteDto toDto(Quote entity) {
        return new QuoteDto(
                entity.getId(),
                entity.getText(),
                entity.getAuthor(),
                entity.getDisplayOrder()
        );
    }

    public LoveBombDto toDto(LoveBomb entity) {
        return new LoveBombDto(entity.getId(), entity.getMessage());
    }

    public ReasonDto toDto(Reason entity) {
        return new ReasonDto(
                entity.getId(),
                entity.getShortLabel(),
                entity.getLongMessage(),
                entity.getDisplayOrder()
        );
    }

    public OpenWhenDto toDto(OpenWhenMessage entity) {
        return new OpenWhenDto(
                entity.getId(),
                entity.getEnvelopeLabel(),
                entity.getMessage(),
                entity.getDisplayOrder()
        );
    }
}
