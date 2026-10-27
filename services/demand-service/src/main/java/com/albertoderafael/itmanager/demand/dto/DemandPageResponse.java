package com.albertoderafael.itmanager.demand.dto;

import java.util.List;

public record DemandPageResponse(
        List<DemandResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}