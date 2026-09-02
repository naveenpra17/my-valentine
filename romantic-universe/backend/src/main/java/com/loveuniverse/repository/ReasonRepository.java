package com.loveuniverse.repository;

import com.loveuniverse.entity.Reason;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReasonRepository extends JpaRepository<Reason, Long> {
    List<Reason> findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(Long siteId);
}
