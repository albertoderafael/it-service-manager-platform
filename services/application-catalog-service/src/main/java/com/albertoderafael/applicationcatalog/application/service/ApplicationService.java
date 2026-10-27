package com.albertoderafael.applicationcatalog.application.service;

import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.albertoderafael.applicationcatalog.application.dto.ApplicationCreateRequest;
import com.albertoderafael.applicationcatalog.application.dto.ApplicationPageResponse;
import com.albertoderafael.applicationcatalog.application.dto.ApplicationResponse;
import com.albertoderafael.applicationcatalog.application.dto.ApplicationUpdateRequest;
import com.albertoderafael.applicationcatalog.application.entity.Application;
import com.albertoderafael.applicationcatalog.application.repository.ApplicationRepository;

import java.util.List;
import java.util.Set;

import com.albertoderafael.applicationcatalog.application.dto.ApplicationSummaryResponse;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    
    private static final Set<String> VALID_STATUSES = Set.of(
            "ACTIVE",
            "INACTIVE"
    );

    private static final Set<String> VALID_CRITICALITIES = Set.of(
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL"
    );

    private static final Set<String> VALID_SORT_FIELDS = Set.of(
            "id",
            "name",
            "criticality",
            "status"
    );

    public ApplicationService(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

	@Transactional(readOnly = true)
	public ApplicationPageResponse getApplications(
	        String status,
	        String criticality,
	        Pageable pageable) {
	
	    Page<Application> applications;
	    
	    validateStatus(status);
	    validateCriticality(criticality);
	    validateSort(pageable.getSort());
	
	    if (status != null && criticality != null) {
	
	        applications = applicationRepository
	                .findByStatusAndCriticality(
	                        status, criticality, pageable);
	
	    } else if (status != null) {
	
	        applications = applicationRepository
	                .findByStatus(status, pageable);
	
	    } else if (criticality != null) {
	
	        applications = applicationRepository
	                .findByCriticality(criticality, pageable);
	
	    } else {
	
	        applications = applicationRepository.findAll(pageable);
	    }
	
	    Page<ApplicationResponse> responsePage =
	            applications.map(this::toResponse);
	
	    return new ApplicationPageResponse(
	            responsePage.getContent(),
	            responsePage.getNumber(),
	            responsePage.getSize(),
	            responsePage.getTotalElements(),
	            responsePage.getTotalPages()
	    );
	}



	@Transactional(readOnly = true)
	public ApplicationResponse getApplicationById(Long id) {
	
	    var application = applicationRepository.findById(id)
	            .orElseThrow(() -> new ResponseStatusException(
	                    HttpStatus.NOT_FOUND,
	                    "Application not found: " + id
	            ));
	
	    return toResponse(application);
	}
	
	@Transactional
	public ApplicationResponse createApplication(
	        ApplicationCreateRequest request) {
	
	    Application application = new Application(
	            request.name(),
	            request.description(),
	            request.criticality(),
	            "ACTIVE"
	    );
	
	    Application saved = applicationRepository.save(application);
	
	    return toResponse(saved);
	}
	
	@Transactional
	public ApplicationResponse updateApplication(
	        Long id,
	        ApplicationUpdateRequest request) {
	
	    Application application = applicationRepository.findById(id)
	            .orElseThrow(() -> new ResponseStatusException(
	                    HttpStatus.NOT_FOUND,
	                    "Application not found: " + id
	            ));
	
	    application.update(
	            request.name(),
	            request.description(),
	            request.criticality(),
	            request.status()
	    );
	
	    return toResponse(application);
	}

	private ApplicationResponse toResponse(Application application) {
	
	    return new ApplicationResponse(
	            application.getId(),
	            application.getName(),
	            application.getDescription(),
	            application.getCriticality(),
	            application.getStatus()
	    );
	}
	
	private void validateStatus(String status) {
	    if (status != null && !VALID_STATUSES.contains(status)) {
	        throw new ResponseStatusException(
	                HttpStatus.BAD_REQUEST,
	                "Invalid application status: " + status
	        );
	    }
	}

	private void validateCriticality(String criticality) {
	    if (criticality != null && !VALID_CRITICALITIES.contains(criticality)) {
	        throw new ResponseStatusException(
	                HttpStatus.BAD_REQUEST,
	                "Invalid application criticality: " + criticality
	        );
	    }
	}

	private void validateSort(Sort sort) {
	    for (Sort.Order order : sort) {
	        if (!VALID_SORT_FIELDS.contains(order.getProperty())) {
	            throw new ResponseStatusException(
	                    HttpStatus.BAD_REQUEST,
	                    "Invalid application sort field: " + order.getProperty()
	            );
	        }
	    }
	}
	
	@Transactional(readOnly = true)
	public List<ApplicationSummaryResponse> getApplicationSummaries(Set<Long> ids) {
	
	    if (ids == null || ids.isEmpty()) {
	        return List.of();
	    }
	
	    return applicationRepository.findAllById(ids)
	            .stream()
	            .map(application -> new ApplicationSummaryResponse(
	                    application.getId(),
	                    application.getName()
	            ))
	            .toList();
	}

}
