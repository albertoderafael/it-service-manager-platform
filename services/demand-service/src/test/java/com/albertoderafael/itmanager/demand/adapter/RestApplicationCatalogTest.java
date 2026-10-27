
package com.albertoderafael.itmanager.demand.adapter;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import com.sun.net.httpserver.HttpServer;

class RestApplicationCatalogTest {

    private HttpServer server;
    private RestApplicationCatalog catalog;
    private final AtomicInteger requests = new AtomicInteger();

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(
                new InetSocketAddress("127.0.0.1", 0), 0);

        server.createContext("/api/applications", exchange -> {
            requests.incrementAndGet();

            String path = exchange.getRequestURI().getPath();
            String query = exchange.getRequestURI().getRawQuery();

            if (path.endsWith("/summaries")) {
                respond(exchange, 200,
                        """
                        [
                          {"id":1,"name":"Portal de ejemplo"},
                          {"id":2,"name":"API de ejemplo"}
                        ]
                        """);
            } else if (path.endsWith("/404")) {
                respond(exchange, 404, "{}");
            } else if (path.endsWith("/500")) {
                respond(exchange, 500, "{}");
            } else if (path.endsWith("/400")) {
                respond(exchange, 400, "{}");
            } else if (path.endsWith("/777")) {
                respond(exchange, 200, "esto no es JSON");
            } else if (path.endsWith("/1")) {
                respond(exchange, 200,
                        "{\"id\":1,\"name\":\"Portal de ejemplo\"}");
            } else {
                respond(exchange, 404, "{}");
            }
        });

        server.start();

        String baseUrl = "http://127.0.0.1:"
                + server.getAddress().getPort();

        catalog = new RestApplicationCatalog(
                RestClient.builder(), baseUrl);
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void findsApplication() {
        var result = catalog.findById(1L);

        assertTrue(result.isPresent());
        assertEquals(1L, result.orElseThrow().id());
        assertEquals("Portal de ejemplo", result.orElseThrow().name());
    }

    @Test
    void returnsEmptyForMissingApplication() {
        assertTrue(catalog.findById(404L).isEmpty());
    }

    @Test
    void fetchesApplicationsInSingleBatch() {
        Map<Long, ?> result = catalog.findByIds(Set.of(1L, 2L));

        assertEquals(2, result.size());
        assertEquals(1, requests.get());
    }

    @Test
    void convertsRemoteServerErrorTo503() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> catalog.findById(500L));

        assertEquals(
                HttpStatus.SERVICE_UNAVAILABLE,
                ex.getStatusCode());
    }

    @Test
    void convertsUnexpectedClientErrorTo502() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> catalog.findById(400L));

        assertEquals(
                HttpStatus.BAD_GATEWAY,
                ex.getStatusCode());
    }

    @Test
    void convertsUnreadableResponseTo502() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> catalog.findById(777L));

        assertEquals(
                HttpStatus.BAD_GATEWAY,
                ex.getStatusCode());
    }

    @Test
    void convertsConnectionFailureTo503() {
        server.stop(0);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> catalog.findById(1L));

        assertEquals(
                HttpStatus.SERVICE_UNAVAILABLE,
                ex.getStatusCode());
    }

    private static void respond(
            com.sun.net.httpserver.HttpExchange exchange,
            int status,
            String json) throws IOException {

        byte[] body = json.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders()
                .set("Content-Type", "application/json");

        exchange.sendResponseHeaders(status, body.length);

        try (var out = exchange.getResponseBody()) {
            out.write(body);
        }
    }
}
