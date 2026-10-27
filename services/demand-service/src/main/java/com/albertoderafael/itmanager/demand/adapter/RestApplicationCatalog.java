package com.albertoderafael.itmanager.demand.adapter;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import com.albertoderafael.itmanager.demand.port.ApplicationCatalog;
import com.albertoderafael.itmanager.demand.port.ApplicationSummary;

/**
 * Adaptador HTTP del puerto {@link ApplicationCatalog} contra application-catalog-service.
 *
 * <p>Traducción de fallos remotos:
 * <ul>
 *   <li>404 en {@code findById}: la aplicación no existe → {@code Optional.empty()}.</li>
 *   <li>5xx, conexión rechazada o tiempo agotado: el catálogo no está disponible → 503.</li>
 *   <li>Cualquier otro 4xx o una respuesta ilegible: fallo de integración entre
 *       servicios, no del usuario → 502.</li>
 * </ul>
 */
@Service
public class RestApplicationCatalog implements ApplicationCatalog {

    static final String UNAVAILABLE = "Application Catalog is unavailable";
    static final String BAD_GATEWAY = "Unexpected response from Application Catalog";

    private final RestClient restClient;

    public RestApplicationCatalog(
            RestClient.Builder builder,
            @Value("${application-catalog.base-url}") String baseUrl) {

        this.restClient = builder
                .baseUrl(baseUrl)
                .requestFactory(createRequestFactory())
                .build();
    }

    private static JdkClientHttpRequestFactory createRequestFactory() {

        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();

        JdkClientHttpRequestFactory factory =
                new JdkClientHttpRequestFactory(httpClient);

        factory.setReadTimeout(Duration.ofSeconds(3));

        return factory;
    }

    @Override
    public Optional<ApplicationSummary> findById(Long id) {

        return executeRequest(() -> {
            try {
                ApplicationSummaryResponse response = restClient.get()
                        .uri("/api/applications/{id}", id)
                        .retrieve()
                        .body(ApplicationSummaryResponse.class);

                return Optional.ofNullable(response)
                        .map(ApplicationSummaryResponse::toSummary);

            } catch (HttpClientErrorException.NotFound ex) {
                // Respuesta de negocio: el catálogo confirma que no existe.
                return Optional.empty();
            }
        });
    }

    @Override
    public Map<Long, ApplicationSummary> findByIds(Set<Long> ids) {

        if (ids.isEmpty()) {
            return Map.of();
        }

        String joinedIds = ids.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(","));

        return executeRequest(() -> {

            ApplicationSummaryResponse[] response = restClient.get()
                    .uri("/api/applications/summaries?ids={ids}", joinedIds)
                    .retrieve()
                    .body(ApplicationSummaryResponse[].class);

            if (response == null) {
                return Map.of();
            }

            return Arrays.stream(response)
                    .collect(Collectors.toUnmodifiableMap(
                            ApplicationSummaryResponse::id,
                            ApplicationSummaryResponse::toSummary
                    ));
        });
    }

    private <T> T executeRequest(Supplier<T> request) {

        try {
            return request.get();

        } catch (RestClientResponseException ex) {

            if (ex.getStatusCode().is5xxServerError()) {
                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE, ex);
            }

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, BAD_GATEWAY, ex);

        } catch (ResourceAccessException ex) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE, ex);

        } catch (RestClientException ex) {

            // Por ejemplo, un cuerpo que no se puede convertir a JSON.
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, BAD_GATEWAY, ex);
        }
    }

    /** Solo los campos que este servicio necesita (lector tolerante). */
    private record ApplicationSummaryResponse(
            Long id,
            String name
    ) {
        ApplicationSummary toSummary() {
            return new ApplicationSummary(id, name);
        }
    }
}
