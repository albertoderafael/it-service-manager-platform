package com.albertoderafael.itmanager.demand.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.web.server.ResponseStatusException;

import com.albertoderafael.itmanager.demand.port.ApplicationCatalog;
import com.albertoderafael.itmanager.demand.repository.DemandRepository;

@ExtendWith(MockitoExtension.class)
public class DemandServiceTest {
	
	@Mock
	private DemandRepository demandRepository;

	@Mock
	private ApplicationCatalog applicationCatalog;

	private DemandService demandService;

	@BeforeEach
	void setUp() {
	    demandService = new DemandService(
	            demandRepository,
	            applicationCatalog,
	            TransactionOperations.withoutTransaction());
	}

	@Test
	void shouldRejectInvalidStatusFilter() {
	    ResponseStatusException exception = assertThrows(
	            ResponseStatusException.class,
	            () -> demandService.getDemands(
	                    null,
	                    "INVALID",
	                    null,
	                    PageRequest.of(0, 10)
	            )
	    );

	    assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
	    assertEquals(
	            "Invalid demand status: INVALID",
	            exception.getReason()
	    );
	}
	
	@Test
	void shouldRejectInvalidPriorityFilter() {
	    ResponseStatusException exception = assertThrows(
	            ResponseStatusException.class,
	            () -> demandService.getDemands(
	                    null,
	                    null,
	                    "INVALID",
	                    PageRequest.of(0, 10)
	            )
	    );

	    assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
	    assertEquals(
	            "Invalid demand priority: INVALID",
	            exception.getReason()
	    );
	}
	
	@Test
	void shouldRejectInvalidSortField() {

	    ResponseStatusException exception = assertThrows(
	            ResponseStatusException.class,
	            () -> demandService.getDemands(
	                    null,
	                    null,
	                    null,
	                    PageRequest.of(
	                            0,
	                            10,
	                            Sort.by("pepito")
	                    )
	            )
	    );

	    assertEquals(
	            HttpStatus.BAD_REQUEST,
	            exception.getStatusCode()
	    );

	    assertEquals(
	            "Invalid demand sort field: pepito",
	            exception.getReason()
	    );
	}
}
