package com.loveuniverse.repository;

import com.loveuniverse.entity.LoveBombHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LoveBombHistoryRepository extends JpaRepository<LoveBombHistory, Long> {
    List<LoveBombHistory> findBySessionIdOrderByShownAtDesc(String sessionId);
}
