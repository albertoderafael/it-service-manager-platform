package com.albertoderafael.itmanager.demand.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import com.albertoderafael.itmanager.demand.dto.DemandCreateRequest;
import com.albertoderafael.itmanager.demand.dto.DemandResponse;
import com.albertoderafael.itmanager.demand.dto.DemandUpdateRequest;
import com.albertoderafael.itmanager.demand.service.DemandService;

@WebMvcTest(DemandController.class)
class DemandControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DemandService demandService;

    @Test
    void shouldCreateDemand() throws Exception {

        DemandResponse response = new DemandResponse(
                1L,
                "Adaptacion a la nueva normativa",
                "Incorporar nuevos tipos de expediente",
                "HIGH",
                "OPEN",
                1L,
                "Portal de ejemplo",
                Instant.parse("2026-10-05T10:00:00Z"),
                Instant.parse("2026-10-05T10:00:00Z")
        );

        when(demandService.createDemand(
                any(DemandCreateRequest.class)))
                .thenReturn(response);

        String requestBody = """
                {
                  "title": "Adaptacion a la nueva normativa",
                  "description": "Incorporar nuevos tipos de expediente",
                  "priority": "HIGH",
                  "applicationId": 1
                }
                """;

        mockMvc.perform(post("/api/demands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(header().string(
                        "Location",
                        "/api/demands/1"))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title")
                        .value("Adaptacion a la nueva normativa"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.applicationId").value(1))
                .andExpect(jsonPath("$.applicationName").value("Portal de ejemplo"));
    }

    @Test
    void shouldReturnBadRequestWhenCreatingInvalidDemand()
            throws Exception {

        String requestBody = """
                {
                  "title": "",
                  "description": "Demanda invalida",
                  "priority": "URGENT",
                  "applicationId": null
                }
                """;

        mockMvc.perform(post("/api/demands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error")
                        .value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.title").exists())
                .andExpect(jsonPath("$.fieldErrors.priority").exists())
                .andExpect(jsonPath("$.fieldErrors.applicationId").exists());

        verify(demandService, never())
                .createDemand(any(DemandCreateRequest.class));
    }

    @Test
    void shouldReturnDemandById() throws Exception {

        DemandResponse response = new DemandResponse(
                1L,
                "Adaptacion a la nueva normativa",
                "Incorporar nuevos tipos de expediente",
                "HIGH",
                "OPEN",
                1L,
                "Portal de ejemplo",
                Instant.parse("2026-10-05T10:00:00Z"),
                Instant.parse("2026-10-05T10:00:00Z")
        );

        when(demandService.getDemandById(1L))
                .thenReturn(response);

        mockMvc.perform(get("/api/demands/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title")
                        .value("Adaptacion a la nueva normativa"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.applicationName").value("Portal de ejemplo"));
    }

    @Test
    void shouldReturnNotFoundWhenDemandDoesNotExist()
            throws Exception {

        when(demandService.getDemandById(999L))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Demand not found: 999"
                ));

        mockMvc.perform(get("/api/demands/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error")
                        .value("RESOURCE_ERROR"))
                .andExpect(jsonPath("$.message")
                        .value("Demand not found: 999"));
    }

    @Test
    void shouldUpdateDemand() throws Exception {

        DemandResponse response = new DemandResponse(
                1L,
                "Adaptacion a la nueva normativa",
                "Analisis e incorporacion de nuevos tipos de expediente",
                "CRITICAL",
                "IN_PROGRESS",
                1L,
                "Portal de ejemplo",
                Instant.parse("2026-10-05T10:00:00Z"),
                Instant.parse("2026-10-05T11:00:00Z")
        );

        when(demandService.updateDemand(
                eq(1L),
                any(DemandUpdateRequest.class)))
                .thenReturn(response);

        String requestBody = """
                {
                  "title": "Adaptacion a la nueva normativa",
                  "description": "Analisis e incorporacion de nuevos tipos de expediente",
                  "priority": "CRITICAL",
                  "status": "IN_PROGRESS",
                  "applicationId": 1
                }
                """;

        mockMvc.perform(put("/api/demands/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.priority").value("CRITICAL"))
                .andExpect(jsonPath("$.status")
                        .value("IN_PROGRESS"));
    }

    @Test
    void shouldReturnConflictForInvalidStatusTransition()
            throws Exception {

        when(demandService.updateDemand(
                eq(1L),
                any(DemandUpdateRequest.class)))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Invalid demand status transition: IN_PROGRESS -> OPEN"
                ));

        String requestBody = """
                {
                  "title": "Adaptacion a la nueva normativa",
                  "description": "Intento invalido",
                  "priority": "CRITICAL",
                  "status": "OPEN",
                  "applicationId": 1
                }
                """;

        mockMvc.perform(put("/api/demands/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error")
                        .value("RESOURCE_ERROR"))
                .andExpect(jsonPath("$.message")
                        .value(
                            "Invalid demand status transition: IN_PROGRESS -> OPEN"
                        ));
    }
    

    
    @Test
    void shouldReturn400WhenStatusFilterIsInvalid() throws Exception {

        when(demandService.getDemands(
                isNull(),
                eq("INVALID"),
                isNull(),
                any(Pageable.class)
        )).thenThrow(
                new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid demand status: INVALID"
                )
        );

        mockMvc.perform(get("/api/demands")
                        .param("status", "INVALID"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("RESOURCE_ERROR"))
                .andExpect(jsonPath("$.message")
                        .value("Invalid demand status: INVALID"));
    }
    
    @Test
    void shouldReturn400WhenPriorityFilterIsInvalid() throws Exception {

        when(demandService.getDemands(
                isNull(),
                isNull(),
                eq("INVALID"),
                any(Pageable.class)
        )).thenThrow(
                new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid demand priority: INVALID"
                )
        );

        mockMvc.perform(get("/api/demands")
                        .param("priority", "INVALID"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("RESOURCE_ERROR"))
                .andExpect(jsonPath("$.message")
                        .value("Invalid demand priority: INVALID"));
    }
}