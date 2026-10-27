package com.albertoderafael.applicationcatalog.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ApplicationUpdateRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 500)
        String description,

        @NotBlank
        @Pattern(regexp = "LOW|MEDIUM|HIGH|CRITICAL")
        String criticality,

        @NotBlank
        @Pattern(regexp = "ACTIVE|INACTIVE")
        String status

) {
}
