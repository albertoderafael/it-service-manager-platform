package com.albertoderafael.itmanager.demand.dto;

import java.time.Instant;

public record DemandResponse(

        Long id,
        String title,
        String description,
        String priority,
        String status,

        Long applicationId,
        String applicationName,

        Instant createdAt,
        Instant updatedAt

) {
}