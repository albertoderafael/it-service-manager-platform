package com.albertoderafael.applicationcatalog.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.albertoderafael.applicationcatalog.application.dto.ApplicationCreateRequest;
import com.albertoderafael.applicationcatalog.application.dto.ApplicationResponse;
import com.albertoderafael.applicationcatalog.application.dto.ApplicationUpdateRequest;
import com.albertoderafael.applicationcatalog.application.entity.Application;
import com.albertoderafael.applicationcatalog.application.repository.ApplicationRepository;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    private ApplicationService applicationService;

    @BeforeEach
    void setUp() {
        applicationService = new ApplicationService(applicationRepository);
    }

    @Test
    void shouldReturnApplicationWhenItExists() {

        Application application = new Application(
                "Portal de ejemplo",
                "Portal ficticio de servicios internos",
                "HIGH",
                "ACTIVE"
        );

        when(applicationRepository.findById(1L))
                .thenReturn(Optional.of(application));

        var response = applicationService.getApplicationById(1L);

        assertEquals("Portal de ejemplo", response.name());
        assertEquals("HIGH", response.criticality());
        assertEquals("ACTIVE", response.status());
    }
    
    @Test
    void shouldThrowNotFoundWhenApplicationDoesNotExist() {

        when(applicationRepository.findById(999L))
                .thenReturn(Optional.empty());

        ResponseStatusException exception =
                assertThrows(
                        ResponseStatusException.class,
                        () -> applicationService.getApplicationById(999L)
                );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals(
                "Application not found: 999",
                exception.getReason()
        );
    }
    
    @Test
    void shouldCreateApplicationWithActiveStatus() {

        ApplicationCreateRequest request =
                new ApplicationCreateRequest(
                        "TEST_APP",
                        "Aplicación creada desde test",
                        "HIGH"
                );

        when(applicationRepository.save(
                org.mockito.ArgumentMatchers.any(Application.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ApplicationResponse response =
                applicationService.createApplication(request);

        assertEquals("TEST_APP", response.name());
        assertEquals("Aplicación creada desde test", response.description());
        assertEquals("HIGH", response.criticality());
        assertEquals("ACTIVE", response.status());
        
        verify(applicationRepository).save(
                org.mockito.ArgumentMatchers.any(Application.class));
    }
    
    @Test
    void shouldUpdateExistingApplicationWithoutCallingSave() {

        Application application = new Application(
                "TEST_APP",
                "Descripción original",
                "LOW",
                "ACTIVE"
        );

        when(applicationRepository.findById(1L))
                .thenReturn(Optional.of(application));

        ApplicationUpdateRequest request =
                new ApplicationUpdateRequest(
                        "TEST_APP_UPDATED",
                        "Descripción modificada",
                        "CRITICAL",
                        "INACTIVE"
                );

        ApplicationResponse response =
                applicationService.updateApplication(1L, request);

        assertEquals("TEST_APP_UPDATED", response.name());
        assertEquals("Descripción modificada", response.description());
        assertEquals("CRITICAL", response.criticality());
        assertEquals("INACTIVE", response.status());

        verify(applicationRepository, never())
                .save(any(Application.class));
    }
    
    @Test
    void shouldThrowNotFoundWhenUpdatingNonExistingApplication() {

        when(applicationRepository.findById(999L))
                .thenReturn(Optional.empty());

        ApplicationUpdateRequest request =
                new ApplicationUpdateRequest(
                        "TEST_APP",
                        "Descripción",
                        "HIGH",
                        "ACTIVE"
                );

        ResponseStatusException exception =
                assertThrows(
                        ResponseStatusException.class,
                        () -> applicationService.updateApplication(999L, request)
                );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals(
                "Application not found: 999",
                exception.getReason()
        );

        verify(applicationRepository, never())
                .save(any(Application.class));
    }
    
    @Test
    void shouldRejectInvalidStatusFilter() {

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> applicationService.getApplications(
                        "INVALID",
                        null,
                        PageRequest.of(0, 10)
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals(
                "Invalid application status: INVALID",
                exception.getReason()
        );
    }
    
    @Test
    void shouldRejectInvalidCriticalityFilter() {

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> applicationService.getApplications(
                        null,
                        "INVALID",
                        PageRequest.of(0, 10)
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals(
                "Invalid application criticality: INVALID",
                exception.getReason()
        );
    }
    
    @Test
    void shouldRejectInvalidSortField() {

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> applicationService.getApplications(
                        null,
                        null,
                        PageRequest.of(
                                0,
                                10,
                                Sort.by("pepito")
                        )
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals(
                "Invalid application sort field: pepito",
                exception.getReason()
        );
    }
}