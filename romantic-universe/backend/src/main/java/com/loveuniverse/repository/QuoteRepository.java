package com.loveuniverse.repository;

import com.loveuniverse.entity.Quote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuoteRepository extends JpaRepository<Quote, Long> {
    List<Quote> findByActiveTrueOrderByDisplayOrderAsc();
}
