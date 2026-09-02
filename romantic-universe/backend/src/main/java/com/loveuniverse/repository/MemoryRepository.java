package com.loveuniverse.repository;

import com.loveuniverse.entity.Memory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemoryRepository extends JpaRepository<Memory, Long> {
    List<Memory> findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(Long siteId);
    Optional<Memory> findBySiteIdAndIdAndActiveTrue(Long siteId, Long id);
}
