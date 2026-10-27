package com.albertoderafael.itmanager.demand.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "demands")
public class Demand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false, length = 20)
    private String priority;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Demand() {
        // Constructor requerido por JPA
    }

    public Demand(
            String title,
            String description,
            String priority,
            String status,
            Long applicationId) {

        this.title = title;
        this.description = description;
        this.priority = priority;
        this.status = status;
        this.applicationId = applicationId;
    }

    @PrePersist
    private void prePersist() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    
    public void update(
            String title,
            String description,
            String priority,
            Long applicationId) {

        this.title = title;
        this.description = description;
        this.priority = priority;
        this.applicationId = applicationId;
        this.updatedAt = Instant.now();
    }

    public void changeStatus(String newStatus) {

        if (this.status.equals(newStatus)) {
            return;
        }

        boolean validTransition =
                ("OPEN".equals(this.status)
                        && ("IN_PROGRESS".equals(newStatus)
                            || "CANCELLED".equals(newStatus)))
                ||
                ("IN_PROGRESS".equals(this.status)
                        && ("COMPLETED".equals(newStatus)
                            || "CANCELLED".equals(newStatus)));

        if (!validTransition) {
            throw new IllegalStateException(
                    "Invalid demand status transition: "
                            + this.status + " -> " + newStatus
            );
        }

        this.status = newStatus;
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getPriority() {
        return priority;
    }

    public String getStatus() {
        return status;
    }

    public Long getApplicationId() {
        return applicationId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}