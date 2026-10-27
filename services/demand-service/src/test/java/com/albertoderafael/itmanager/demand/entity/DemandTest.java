package com.albertoderafael.itmanager.demand.entity;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;



class DemandTest {

    private final Long applicationId = 1L;

    @Test
    void shouldAllowOpenToInProgress() {

        Demand demand = createDemand("OPEN");

        assertDoesNotThrow(() ->
                demand.changeStatus("IN_PROGRESS"));

        assertEquals("IN_PROGRESS", demand.getStatus());
    }

    @Test
    void shouldAllowInProgressToCompleted() {

        Demand demand = createDemand("IN_PROGRESS");

        assertDoesNotThrow(() ->
                demand.changeStatus("COMPLETED"));

        assertEquals("COMPLETED", demand.getStatus());
    }

    @Test
    void shouldRejectInProgressToOpen() {

        Demand demand = createDemand("IN_PROGRESS");

        assertThrows(
                IllegalStateException.class,
                () -> demand.changeStatus("OPEN")
        );

        assertEquals("IN_PROGRESS", demand.getStatus());
    }

    @Test
    void shouldRejectCompletedToOpen() {

        Demand demand = createDemand("COMPLETED");

        assertThrows(
                IllegalStateException.class,
                () -> demand.changeStatus("OPEN")
        );

        assertEquals("COMPLETED", demand.getStatus());
    }

    @Test
    void shouldAllowSameStatus() {

        Demand demand = createDemand("OPEN");

        assertDoesNotThrow(() ->
                demand.changeStatus("OPEN"));

        assertEquals("OPEN", demand.getStatus());
    }

    private Demand createDemand(String status) {

        return new Demand(
                "Demanda test",
                "Descripción de prueba",
                "HIGH",
                status,
                applicationId
        );
    }
}