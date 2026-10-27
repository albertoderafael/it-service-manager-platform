package com.albertoderafael.applicationcatalog.application.dto;

public record ApplicationResponse(
        Long id,
        String name,
        String description,
        String criticality,
        String status) {
}