package com.albertoderafael.itmanager.demand.controller;

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

import com.albertoderafael.itmanager.demand.dto.DemandCreateRequest;
import com.albertoderafael.itmanager.demand.dto.DemandPageResponse;
import com.albertoderafael.itmanager.demand.dto.DemandResponse;
import com.albertoderafael.itmanager.demand.dto.DemandUpdateRequest;
import com.albertoderafael.itmanager.demand.service.DemandService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/demands")
public class DemandController {

    private final DemandService demandService;

    public DemandController(DemandService demandService) {
        this.demandService = demandService;
    }

    @PostMapping
    public ResponseEntity<DemandResponse> createDemand(
            @Valid @RequestBody DemandCreateRequest request) {

        DemandResponse response =
                demandService.createDemand(request);

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/demands/" + response.id()
                        ))
                .body(response);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<DemandResponse> getDemandById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                demandService.getDemandById(id)
        );
    }
    
    @GetMapping
    public DemandPageResponse getDemands(

            @RequestParam(required = false)
            Long applicationId,

            @RequestParam(required = false)
            String status,

            @RequestParam(required = false)
            String priority,

            @PageableDefault(
                    size = 10,
                    sort = "id",
                    direction = Sort.Direction.ASC
            )
            Pageable pageable) {

        return demandService.getDemands(
                applicationId,
                status,
                priority,
                pageable
        );
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<DemandResponse> updateDemand(
            @PathVariable Long id,
            @Valid @RequestBody DemandUpdateRequest request) {

        return ResponseEntity.ok(
                demandService.updateDemand(id, request)
        );
    }
}