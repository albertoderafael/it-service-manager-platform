package com.albertoderafael.itmanager.demand.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.web.server.ResponseStatusException;

import com.albertoderafael.itmanager.demand.dto.DemandCreateRequest;
import com.albertoderafael.itmanager.demand.dto.DemandUpdateRequest;
import com.albertoderafael.itmanager.demand.entity.Demand;
import com.albertoderafael.itmanager.demand.port.ApplicationCatalog;
import com.albertoderafael.itmanager.demand.port.ApplicationSummary;
import com.albertoderafael.itmanager.demand.repository.DemandRepository;

@ExtendWith(MockitoExtension.class)
class DemandCatalogTest {
    @Mock DemandRepository repository;
    @Mock ApplicationCatalog catalog;
    DemandService service;

    @BeforeEach
    void setUp() {
        // Sin Spring: las transacciones se ejecutan como simples llamadas.
        service = new DemandService(repository, catalog, TransactionOperations.withoutTransaction());
    }

    @Test
    void createsUsingOnlyCatalogData() {
        when(catalog.findById(7L)).thenReturn(Optional.of(new ApplicationSummary(7L, "Catalog name")));
        when(repository.save(any(Demand.class))).thenAnswer(call -> call.getArgument(0));
        var response = service.createDemand(new DemandCreateRequest("Title", null, "HIGH", 7L));
        assertEquals(7L, response.applicationId());
        assertEquals("Catalog name", response.applicationName());
        assertEquals("OPEN", response.status());
        verify(catalog).findById(7L);
        verifyNoMoreInteractions(catalog);
    }

    @Test
    void missingApplicationPreventsCreation() {
        when(catalog.findById(7L)).thenReturn(Optional.empty());
        var error = assertThrows(ResponseStatusException.class,
                () -> service.createDemand(new DemandCreateRequest("Title", null, "HIGH", 7L)));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        assertEquals("Application not found: 7", error.getReason());
        verifyNoInteractions(repository);
    }

    @Test
    void missingApplicationPreventsUpdate() {
        Demand demand = demand(1L);
        when(repository.findById(9L)).thenReturn(Optional.of(demand));
        when(catalog.findById(7L)).thenReturn(Optional.empty());
        var error = assertThrows(ResponseStatusException.class,
                () -> service.updateDemand(9L, new DemandUpdateRequest("Changed", null, "LOW", "OPEN", 7L)));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        assertEquals(1L, demand.getApplicationId());
        assertEquals("Title", demand.getTitle());
    }

    @Test
    void updatesReferenceAndPreservesStatusRules() {
        Demand demand = demand(1L);
        when(repository.findById(9L)).thenReturn(Optional.of(demand));
        when(catalog.findById(7L)).thenReturn(Optional.of(new ApplicationSummary(7L, "New name")));
        var response = service.updateDemand(9L,
                new DemandUpdateRequest("Changed", null, "LOW", "IN_PROGRESS", 7L));
        assertEquals(7L, demand.getApplicationId());
        assertEquals("New name", response.applicationName());
        assertEquals("IN_PROGRESS", response.status());
        verify(repository, never()).save(any());
        verify(catalog).findById(7L);
        verifyNoMoreInteractions(catalog);
    }

    @Test
    void listUsesOneBatchForDistinctIdsAndPreservesPageMetadata() {
        var pageable = PageRequest.of(1, 3);
        when(repository.findAll(
                org.mockito.ArgumentMatchers
                        .<Specification<Demand>>any(),
                eq(pageable)))
                .thenReturn(new PageImpl<>(
                        List.of(demand(7L), demand(2L), demand(7L)),
                        pageable,
                        12));
        when(catalog.findByIds(Set.of(7L, 2L))).thenReturn(Map.of(
                7L, new ApplicationSummary(7L, "Seven"), 2L, new ApplicationSummary(2L, "Two")));
        var response = service.getDemands(null, null, null, pageable);
        assertEquals(List.of("Seven", "Two", "Seven"),
                response.content().stream().map(item -> item.applicationName()).toList());
        assertEquals(1, response.page());
        assertEquals(3, response.size());
        assertEquals(12, response.totalElements());
        assertEquals(4, response.totalPages());
        verify(catalog).findByIds(Set.of(7L, 2L));
        verifyNoMoreInteractions(catalog);
    }

    @Test
    void emptyPageDoesNotCallCatalog() {
        var pageable = PageRequest.of(0, 10);
        when(repository.findAll(
                org.mockito.ArgumentMatchers
                        .<Specification<Demand>>any(),
                eq(pageable)))
                .thenReturn(Page.empty(pageable));
        assertTrue(service.getDemands(null, null, null, pageable).content().isEmpty());
        verifyNoInteractions(catalog);
    }

    @Test
    void detailResolvesCurrentName() {
        when(repository.findById(9L)).thenReturn(Optional.of(demand(7L)));
        when(catalog.findById(7L)).thenReturn(Optional.of(new ApplicationSummary(7L, "Renamed")));
        assertEquals("Renamed", service.getDemandById(9L).applicationName());
    }

    @Test
    void listKeepsDemandsWhoseApplicationIsMissing() {
        var pageable = PageRequest.of(0, 10);
        when(repository.findAll(
                org.mockito.ArgumentMatchers
                        .<Specification<Demand>>any(),
                eq(pageable)))
                .thenReturn(new PageImpl<>(
                        List.of(demand(7L), demand(99L)),
                        pageable,
                        2));
        when(catalog.findByIds(Set.of(7L, 99L))).thenReturn(Map.of(
                7L, new ApplicationSummary(7L, "Seven")));
        var response = service.getDemands(null, null, null, pageable);
        assertEquals(2, response.content().size());
        assertEquals("Seven", response.content().get(0).applicationName());
        assertEquals(99L, response.content().get(1).applicationId());
        assertNull(response.content().get(1).applicationName());
    }

    @Test
    void detailKeepsDemandWhoseApplicationIsMissing() {
        when(repository.findById(9L)).thenReturn(Optional.of(demand(99L)));
        when(catalog.findById(99L)).thenReturn(Optional.empty());
        var response = service.getDemandById(9L);
        assertEquals(99L, response.applicationId());
        assertNull(response.applicationName());
    }

    @Test
    void missingDemandIsCheckedBeforeCallingCatalogOnUpdate() {
        when(repository.findById(9L)).thenReturn(Optional.empty());
        var error = assertThrows(ResponseStatusException.class,
                () -> service.updateDemand(9L, new DemandUpdateRequest("T", null, "LOW", "OPEN", 7L)));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        assertEquals("Demand not found: 9", error.getReason());
        verifyNoInteractions(catalog);
    }

    private Demand demand(Long applicationId) {
        return new Demand("Title", null, "HIGH", "OPEN", applicationId);
    }
}
