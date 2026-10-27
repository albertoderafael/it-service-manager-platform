
package com.albertoderafael.applicationcatalog.application;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.transaction.annotation.Transactional;

import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.albertoderafael.applicationcatalog.application.dto.ApplicationCreateRequest;
import com.albertoderafael.applicationcatalog.application.dto.ApplicationResponse;
import com.albertoderafael.applicationcatalog.application.dto.ApplicationUpdateRequest;
import com.albertoderafael.applicationcatalog.application.entity.Application;
import com.albertoderafael.applicationcatalog.application.repository.ApplicationRepository;
import com.albertoderafael.applicationcatalog.application.service.ApplicationService;

@Testcontainers
@SpringBootTest
@Transactional
class ApplicationIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres =
            new PostgreSQLContainer("postgres:18")
                    .withDatabaseName("application_db")
                    .withUsername("application_user")
                    .withPassword("test");

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationService applicationService;

    @Test
    void shouldStartWithEmptyCatalogAfterFlywayMigration() {

        assertEquals(0, applicationRepository.count());
    }

    @Test
    void shouldCreateAndUpdateApplicationInPostgreSQL() {

        long countBefore = applicationRepository.count();

        ApplicationCreateRequest createRequest =
                new ApplicationCreateRequest(
                        "TEST_INTEGRATION",
                        "Aplicación creada en PostgreSQL Testcontainers",
                        "LOW"
                );

        ApplicationResponse created =
                applicationService.createApplication(createRequest);

        assertNotNull(created.id());
        assertEquals("TEST_INTEGRATION", created.name());
        assertEquals("LOW", created.criticality());
        assertEquals("ACTIVE", created.status());

        assertEquals(
                countBefore + 1,
                applicationRepository.count()
        );

        ApplicationUpdateRequest updateRequest =
                new ApplicationUpdateRequest(
                        "TEST_INTEGRATION",
                        "Aplicación modificada en PostgreSQL Testcontainers",
                        "CRITICAL",
                        "INACTIVE"
                );

        applicationService.updateApplication(
                created.id(),
                updateRequest
        );

        applicationRepository.flush();

        Application updated =
                applicationRepository.findById(created.id())
                        .orElseThrow();

        assertEquals(
                "Aplicación modificada en PostgreSQL Testcontainers",
                updated.getDescription()
        );
        assertEquals("CRITICAL", updated.getCriticality());
        assertEquals("INACTIVE", updated.getStatus());
    }
}
