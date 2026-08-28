package com.loveuniverse.repository;

import com.loveuniverse.entity.LoveBomb;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LoveBombRepository extends JpaRepository<LoveBomb, Long> {
    List<LoveBomb> findByActiveTrue();
}
