package com.albertoderafael.applicationcatalog.application.controller;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.albertoderafael.applicationcatalog.application.dto.ApplicationResponse;
import com.albertoderafael.applicationcatalog.application.service.ApplicationService;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

import org.springframework.http.MediaType;

import com.albertoderafael.applicationcatalog.application.dto.ApplicationCreateRequest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import com.albertoderafael.applicationcatalog.application.dto.ApplicationUpdateRequest;

import com.albertoderafael.applicationcatalog.application.dto.ApplicationSummaryResponse;

@WebMvcTest(ApplicationController.class)
class ApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ApplicationService applicationService;

    @Test
    void shouldReturnApplicationById() throws Exception {

        ApplicationResponse response =
                new ApplicationResponse(
                        1L,
                        "Portal de ejemplo",
                        "Portal ficticio de servicios internos",
                        "HIGH",
                        "ACTIVE"
                );

        when(applicationService.getApplicationById(1L))
                .thenReturn(response);

        mockMvc.perform(get("/api/applications/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Portal de ejemplo"))
                .andExpect(jsonPath("$.criticality").value("HIGH"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }
    
    @Test
    void shouldReturnNotFoundWhenApplicationDoesNotExist() throws Exception {

        when(applicationService.getApplicationById(999L))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Application not found: 999"
                ));

        mockMvc.perform(get("/api/applications/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("RESOURCE_ERROR"))
                .andExpect(jsonPath("$.message")
                        .value("Application not found: 999"))
                .andExpect(jsonPath("$.fieldErrors").isEmpty());
    }
    
    @Test
    void shouldCreateApplication() throws Exception {

        ApplicationResponse response =
                new ApplicationResponse(
                        5L,
                        "TEST_APP",
                        "Aplicación creada desde test MVC",
                        "HIGH",
                        "ACTIVE"
                );

        when(applicationService.createApplication(
                any(ApplicationCreateRequest.class)))
                .thenReturn(response);

        String requestBody = """
                {
                  "name": "TEST_APP",
                  "description": "Aplicación creada desde test MVC",
                  "criticality": "HIGH"
                }
                """;

        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(header().string(
                        "Location",
                        "/api/applications/5"))
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.name").value("TEST_APP"))
                .andExpect(jsonPath("$.description")
                        .value("Aplicación creada desde test MVC"))
                .andExpect(jsonPath("$.criticality").value("HIGH"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }
    
    @Test
    void shouldReturnBadRequestWhenCreatingInvalidApplication() throws Exception {

        String requestBody = """
                {
                  "name": " ",
                  "description": "Aplicación inválida",
                  "criticality": "URGENT"
                }
                """;

        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message")
                        .value("La petición contiene campos inválidos"))
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.criticality").exists());

        verify(applicationService, never())
                .createApplication(any(ApplicationCreateRequest.class));
    }
    
    @Test
    void shouldUpdateApplication() throws Exception {

        ApplicationResponse response =
                new ApplicationResponse(
                        5L,
                        "TEST_APP_UPDATED",
                        "Aplicación modificada desde test MVC",
                        "CRITICAL",
                        "INACTIVE"
                );

        when(applicationService.updateApplication(
                org.mockito.ArgumentMatchers.eq(5L),
                any(ApplicationUpdateRequest.class)))
                .thenReturn(response);

        String requestBody = """
                {
                  "name": "TEST_APP_UPDATED",
                  "description": "Aplicación modificada desde test MVC",
                  "criticality": "CRITICAL",
                  "status": "INACTIVE"
                }
                """;

        mockMvc.perform(put("/api/applications/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.name").value("TEST_APP_UPDATED"))
                .andExpect(jsonPath("$.description")
                        .value("Aplicación modificada desde test MVC"))
                .andExpect(jsonPath("$.criticality").value("CRITICAL"))
                .andExpect(jsonPath("$.status").value("INACTIVE"));
    }
    
    @Test
    void shouldReturnBadRequestWhenUpdatingInvalidApplication() throws Exception {

        String requestBody = """
                {
                  "name": "",
                  "description": "Actualización inválida",
                  "criticality": "URGENT",
                  "status": "DELETED"
                }
                """;

        mockMvc.perform(put("/api/applications/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.criticality").exists())
                .andExpect(jsonPath("$.fieldErrors.status").exists());

        verify(applicationService, never())
                .updateApplication(
                        org.mockito.ArgumentMatchers.anyLong(),
                        any(ApplicationUpdateRequest.class));
    }
    
	@Test
	void shouldReturnApplicationSummaries() throws Exception {
	
	    when(applicationService.getApplicationSummaries(
	            java.util.Set.of(1L, 2L)))
	            .thenReturn(java.util.List.of(
	                    new ApplicationSummaryResponse(1L, "Portal de ejemplo"),
	                    new ApplicationSummaryResponse(2L, "API de ejemplo")
	            ));
	
	    mockMvc.perform(get("/api/applications/summaries")
	                    .param("ids", "1,2"))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$[0].id").value(1))
	            .andExpect(jsonPath("$[0].name").value("Portal de ejemplo"))
	            .andExpect(jsonPath("$[1].id").value(2))
	            .andExpect(jsonPath("$[1].name").value("API de ejemplo"));
	}

}