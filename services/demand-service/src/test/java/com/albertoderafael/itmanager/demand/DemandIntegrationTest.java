
package com.albertoderafael.itmanager.demand;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.albertoderafael.itmanager.demand.dto.DemandCreateRequest;
import com.albertoderafael.itmanager.demand.entity.Demand;
import com.albertoderafael.itmanager.demand.port.ApplicationCatalog;
import com.albertoderafael.itmanager.demand.port.ApplicationSummary;
import com.albertoderafael.itmanager.demand.repository.DemandRepository;
import com.albertoderafael.itmanager.demand.service.DemandService;

import jakarta.persistence.EntityManager;

@Testcontainers
@SpringBootTest
@Transactional
class DemandIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres =
            new PostgreSQLContainer("postgres:18")
                    .withDatabaseName("it_service_manager")
                    .withUsername("itmanager")
                    .withPassword("test");

    @Autowired
    private DemandService demandService;

    @Autowired
    private DemandRepository demandRepository;

    @Autowired
    private EntityManager entityManager;

    @MockitoBean
    private ApplicationCatalog catalog;

    @Test
    void shouldComposeListWithCurrentNames() {

        when(catalog.findById(7L))
                .thenReturn(Optional.of(
                        new ApplicationSummary(7L, "Original")));

        var created = demandService.createDemand(
                new DemandCreateRequest(
                        "Catalog test", null, "HIGH", 7L));

        assertEquals("Original", created.applicationName());

        // Simulamos un cambio de nombre en el servicio externo.
        when(catalog.findById(7L))
                .thenReturn(Optional.of(
                        new ApplicationSummary(7L, "Renamed")));

        assertEquals(
                "Renamed",
                demandService.getDemandById(created.id())
                        .applicationName());

        when(catalog.findByIds(Set.of(7L)))
                .thenReturn(Map.of(
                        7L,
                        new ApplicationSummary(7L, "Renamed")));

        var page = demandService.getDemands(
                7L, "OPEN", "HIGH",
                PageRequest.of(0, 10));

        assertEquals(1, page.totalElements());
        assertEquals(
                "Renamed",
                page.content().getFirst().applicationName());

        assertEquals(
                1,
                demandRepository.findByApplicationId(7L).size());
    }

    @Test
    void shouldRejectSortingByApplicationName() {

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> demandService.getDemands(
                        null,
                        null,
                        null,
                        PageRequest.of(
                                0, 10,
                                Sort.by("application.name"))));

        assertEquals(
                HttpStatus.BAD_REQUEST,
                exception.getStatusCode());

        assertEquals(
                "Invalid demand sort field: application.name",
                exception.getReason());
    }

    @Test
    void shouldFetchCatalogOnceForAWholePage() {

        for (int i = 0; i < 12; i++) {
            demandRepository.save(
                    new Demand(
                            "Batch " + i,
                            null,
                            "HIGH",
                            "OPEN",
                            7L));
        }

        entityManager.flush();
        entityManager.clear();

        when(catalog.findByIds(Set.of(7L)))
                .thenReturn(Map.of(
                        7L,
                        new ApplicationSummary(7L, "External app")));

        var page = demandService.getDemands(
                7L,
                null,
                null,
                PageRequest.of(
                        0, 10,
                        Sort.by("id")));

        assertEquals(10, page.content().size());
        assertEquals(12, page.totalElements());

        verify(catalog, times(1))
                .findByIds(Set.of(7L));

        verify(catalog, never()).findById(anyLong());
    }

    @Test
    void shouldPersistApplicationIdWithoutForeignKey() {

        Long externalApplicationId = 999999L;

        Demand demand = new Demand(
                "External application reference",
                "Verify persistence without a database FK",
                "HIGH",
                "OPEN",
                externalApplicationId);

        Demand saved = demandRepository.saveAndFlush(demand);

        entityManager.clear();

        Demand reloaded = demandRepository.findById(saved.getId())
                .orElseThrow();

        assertEquals(
                externalApplicationId,
                reloaded.getApplicationId());
    }

    @Test
    void shouldCreateDemandLinkedToExternalApplication() {

        when(catalog.findById(7L))
                .thenReturn(Optional.of(
                        new ApplicationSummary(7L, "External app")));

        var response = demandService.createDemand(
                new DemandCreateRequest(
                        "Adaptación a la nueva normativa",
                        "Incorporar nuevos tipos de expediente",
                        "HIGH",
                        7L));

        assertNotNull(response.id());
        assertEquals(
                "Adaptación a la nueva normativa",
                response.title());
        assertEquals("HIGH", response.priority());
        assertEquals("OPEN", response.status());
        assertEquals(7L, response.applicationId());
        assertEquals("External app", response.applicationName());
        assertNotNull(response.createdAt());
        assertNotNull(response.updatedAt());

        assertTrue(demandRepository.findById(response.id()).isPresent());
    }

    @Test
    void shouldLoadApplicationIdWithoutAnEntityAssociation() {

        Demand demand = new Demand(
                "Test scalar application reference",
                "Verify application ID survives reloading",
                "HIGH",
                "OPEN",
                7L);

        demandRepository.saveAndFlush(demand);
        entityManager.clear();

        Specification<Demand> spec =
                (root, query, criteriaBuilder) ->
                        criteriaBuilder.conjunction();

        Page<Demand> result = demandRepository.findAll(
                spec,
                PageRequest.of(
                        0,
                        10,
                        Sort.by(Sort.Direction.DESC, "id")));

        Demand loadedDemand = result.getContent().stream()
                .filter(item -> item.getId().equals(demand.getId()))
                .findFirst()
                .orElseThrow();

        assertEquals(7L, loadedDemand.getApplicationId());
    }
}
