package com.loveuniverse.repository;

import com.loveuniverse.entity.OpenWhenMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OpenWhenRepository extends JpaRepository<OpenWhenMessage, Long> {
    List<OpenWhenMessage> findBySiteIdAndActiveTrueOrderByDisplayOrderAsc(Long siteId);
}
