package com.albertoderafael.itmanager.demand.service;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.web.server.ResponseStatusException;

import com.albertoderafael.itmanager.demand.dto.DemandCreateRequest;
import com.albertoderafael.itmanager.demand.dto.DemandPageResponse;
import com.albertoderafael.itmanager.demand.dto.DemandResponse;
import com.albertoderafael.itmanager.demand.dto.DemandUpdateRequest;
import com.albertoderafael.itmanager.demand.entity.Demand;
import com.albertoderafael.itmanager.demand.port.ApplicationCatalog;
import com.albertoderafael.itmanager.demand.port.ApplicationSummary;
import com.albertoderafael.itmanager.demand.repository.DemandRepository;

/**
 * Casos de uso de demandas.
 *
 * <p>Las llamadas al catálogo de aplicaciones son remotas (HTTP), así que se
 * hacen siempre FUERA de una transacción de base de datos: ninguna conexión del
 * pool queda retenida mientras se espera al otro servicio. Las lecturas usan la
 * transacción propia de cada método del repositorio, y la modificación abre una
 * transacción corta con {@link TransactionOperations} solo para la escritura.
 */
@Service
public class DemandService {

    private static final Set<String> VALID_STATUSES = Set.of(
            "OPEN",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELLED"
    );

    private static final Set<String> VALID_PRIORITIES = Set.of(
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL"
    );

    private static final Set<String> VALID_SORT_FIELDS = Set.of(
            "id",
            "title",
            "priority",
            "status",
            "updatedAt"
    );

    private final DemandRepository demandRepository;
    private final ApplicationCatalog applicationCatalog;
    private final TransactionOperations transactions;

    public DemandService(
            DemandRepository demandRepository,
            ApplicationCatalog applicationCatalog,
            TransactionOperations transactions) {

        this.demandRepository = demandRepository;
        this.applicationCatalog = applicationCatalog;
        this.transactions = transactions;
    }

    public DemandResponse createDemand(DemandCreateRequest request) {

        // 1. Llamada remota, sin transacción abierta.
        ApplicationSummary application = requireApplication(request.applicationId());

        Demand demand = new Demand(
                request.title(),
                request.description(),
                request.priority(),
                "OPEN",
                application.id()
        );

        // 2. Escritura: save() abre y cierra su propia transacción.
        Demand saved = demandRepository.save(demand);

        return toResponse(saved, application.name());
    }

    public DemandResponse getDemandById(Long id) {

        Demand demand = findDemand(id);

        return toResponse(demand, currentApplicationName(demand.getApplicationId()));
    }

    public DemandPageResponse getDemands(
            Long applicationId,
            String status,
            String priority,
            Pageable pageable) {

        validateStatus(status);
        validatePriority(priority);
        validateSort(pageable.getSort());

        Specification<Demand> specification =
                (root, query, criteriaBuilder) ->
                        criteriaBuilder.conjunction();

        if (applicationId != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.equal(
                                    root.get("applicationId"),
                                    applicationId
                            )
            );
        }

        if (status != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.equal(
                                    root.get("status"),
                                    status
                            )
            );
        }

        if (priority != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) ->
                            criteriaBuilder.equal(
                                    root.get("priority"),
                                    priority
                            )
            );
        }

        // Datos y recuento en la transacción de solo lectura del repositorio.
        Page<Demand> demands =
                demandRepository.findAll(specification, pageable);

        // Una sola llamada al catálogo por página, ya sin transacción abierta.
        Set<Long> ids = demands.getContent().stream()
                .map(Demand::getApplicationId)
                .collect(Collectors.toSet());

        Map<Long, ApplicationSummary> applications = ids.isEmpty()
                ? Map.of()
                : applicationCatalog.findByIds(ids);

        // Una aplicación ausente del catálogo no tumba la página: la fila se
        // devuelve con applicationName = null y el frontend la marca como no disponible.
        Page<DemandResponse> responsePage = demands.map(demand -> {
            ApplicationSummary application = applications.get(demand.getApplicationId());
            return toResponse(demand, application == null ? null : application.name());
        });

        return new DemandPageResponse(
                responsePage.getContent(),
                responsePage.getNumber(),
                responsePage.getSize(),
                responsePage.getTotalElements(),
                responsePage.getTotalPages()
        );
    }

    public DemandResponse updateDemand(
            Long id,
            DemandUpdateRequest request) {

        // 1. La demanda debe existir (lectura corta del repositorio).
        findDemand(id);

        // 2. Llamada remota, sin transacción abierta.
        ApplicationSummary application = requireApplication(request.applicationId());

        // 3. Transacción corta: recargar, modificar (dirty checking) y confirmar.
        return transactions.execute(transaction -> {

            Demand demand = findDemand(id);

            demand.update(
                    request.title(),
                    request.description(),
                    request.priority(),
                    application.id()
            );

            try {
                demand.changeStatus(request.status());
            } catch (IllegalStateException ex) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        ex.getMessage()
                );
            }

            return toResponse(demand, application.name());
        });
    }

    private Demand findDemand(Long id) {
        return demandRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Demand not found: " + id
                ));
    }

    private ApplicationSummary requireApplication(Long id) {
        return applicationCatalog.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Application not found: " + id
                ));
    }

    /** Nombre actual de la aplicación, o null si ya no existe en el catálogo. */
    private String currentApplicationName(Long applicationId) {
        return applicationCatalog.findById(applicationId)
                .map(ApplicationSummary::name)
                .orElse(null);
    }

    private DemandResponse toResponse(Demand demand, String applicationName) {

        return new DemandResponse(
                demand.getId(),
                demand.getTitle(),
                demand.getDescription(),
                demand.getPriority(),
                demand.getStatus(),

                demand.getApplicationId(),
                applicationName,

                demand.getCreatedAt(),
                demand.getUpdatedAt()
        );
    }

    private void validateStatus(String status) {
        if (status != null && !VALID_STATUSES.contains(status)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid demand status: " + status
            );
        }
    }

    private void validatePriority(String priority) {
        if (priority != null && !VALID_PRIORITIES.contains(priority)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid demand priority: " + priority
            );
        }
    }

    private void validateSort(Sort sort) {
        for (Sort.Order order : sort) {
            if (!VALID_SORT_FIELDS.contains(order.getProperty())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid demand sort field: " + order.getProperty()
                );
            }
        }
    }
}
