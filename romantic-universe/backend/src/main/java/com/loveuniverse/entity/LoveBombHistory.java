package com.loveuniverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "love_bomb_history")
public class LoveBombHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false, length = 64)
    private String sessionId;

    @Column(name = "love_bomb_id", nullable = false)
    private Long loveBombId;

    @Column(name = "shown_at", nullable = false)
    private Instant shownAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public Long getLoveBombId() { return loveBombId; }
    public void setLoveBombId(Long loveBombId) { this.loveBombId = loveBombId; }
    public Instant getShownAt() { return shownAt; }
    public void setShownAt(Instant shownAt) { this.shownAt = shownAt; }
}
