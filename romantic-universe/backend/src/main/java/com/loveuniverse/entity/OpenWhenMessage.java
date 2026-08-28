package com.loveuniverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "open_when_messages")
public class OpenWhenMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "envelope_label", nullable = false, length = 200)
    private String envelopeLabel;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEnvelopeLabel() { return envelopeLabel; }
    public void setEnvelopeLabel(String envelopeLabel) { this.envelopeLabel = envelopeLabel; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
