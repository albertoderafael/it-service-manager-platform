package com.albertoderafael.applicationcatalog.application.controller;

import java.net.URI;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.albertoderafael.applicationcatalog.application.dto.ApplicationCreateRequest;
import com.albertoderafael.applicationcatalog.application.dto.ApplicationPageResponse;
import com.albertoderafael.applicationcatalog.application.dto.ApplicationResponse;
import com.albertoderafael.applicationcatalog.application.dto.ApplicationUpdateRequest;
import com.albertoderafael.applicationcatalog.application.service.ApplicationService;

import jakarta.validation.Valid;

import java.util.List;
import java.util.Set;

import com.albertoderafael.applicationcatalog.application.dto.ApplicationSummaryResponse;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

	@GetMapping
	public ApplicationPageResponse getApplications(
	        @RequestParam(required = false) String status,
	        @RequestParam(required = false) String criticality,
	        @PageableDefault(
	                size = 10,
	                sort = "id",
	                direction = Sort.Direction.ASC
	        ) Pageable pageable) {
	
	    return applicationService.getApplications(
	            status,
	            criticality,
	            pageable);
	}

	@GetMapping("/{id}")
	public ApplicationResponse getApplicationById(@PathVariable Long id) {
	    return applicationService.getApplicationById(id);
	}

	@PostMapping
	public ResponseEntity<ApplicationResponse> createApplication(
	        @Valid @RequestBody ApplicationCreateRequest request) {
	
	    ApplicationResponse created =
	            applicationService.createApplication(request);
	
	    URI location = URI.create(
	            "/api/applications/" + created.id()
	    );
	
	    return ResponseEntity
	            .created(location)
	            .body(created);
	}
	
	@PutMapping("/{id}")
	public ResponseEntity<ApplicationResponse> updateApplication(
	        @PathVariable Long id,
	        @Valid @RequestBody ApplicationUpdateRequest request) {
	
	    ApplicationResponse response =
	            applicationService.updateApplication(id, request);
	
	    return ResponseEntity.ok(response);
	}
	
	@GetMapping("/summaries")
	public List<ApplicationSummaryResponse> getApplicationSummaries(
	        @RequestParam Set<Long> ids) {
	
	    return applicationService.getApplicationSummaries(ids);
	}

}