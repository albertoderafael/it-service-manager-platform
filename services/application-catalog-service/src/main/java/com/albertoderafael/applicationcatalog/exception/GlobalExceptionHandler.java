
package com.albertoderafael.applicationcatalog.exception;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException ex) {

        Map<String, String> fieldErrors = new LinkedHashMap<>();

        ex.getBindingResult().getFieldErrors().forEach(error ->
                fieldErrors.putIfAbsent(
                        error.getField(),
                        error.getDefaultMessage()
                )
        );

        ApiErrorResponse body = new ApiErrorResponse(
                400,
                "VALIDATION_ERROR",
                "La petición contiene campos inválidos",
                fieldErrors
        );

        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(
            ResponseStatusException ex) {

        ApiErrorResponse body = new ApiErrorResponse(
                ex.getStatusCode().value(),
                "RESOURCE_ERROR",
                ex.getReason(),
                Map.of()
        );

        return ResponseEntity
                .status(ex.getStatusCode())
                .body(body);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex) {

        ApiErrorResponse body = new ApiErrorResponse(
                400,
                "VALIDATION_ERROR",
                "Invalid value for parameter: " + ex.getName(),
                Map.of()
        );

        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableMessage(
            HttpMessageNotReadableException ex) {

        ApiErrorResponse body = new ApiErrorResponse(
                400,
                "VALIDATION_ERROR",
                "Malformed request body",
                Map.of()
        );

        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParameter(
            MissingServletRequestParameterException ex) {

        ApiErrorResponse body = new ApiErrorResponse(
                400,
                "VALIDATION_ERROR",
                "Missing required parameter: " + ex.getParameterName(),
                Map.of()
        );

        return ResponseEntity.badRequest().body(body);
    }

    /**
     * Último recurso. Las excepciones propias de Spring MVC (ruta inexistente,
     * verbo no permitido, tipo de contenido no soportado…) conservan su código
     * HTTP; cualquier otra cosa es un error inesperado: se registra completa en
     * el log y el cliente recibe un 500 genérico, sin detalles internos.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {

        if (ex instanceof ErrorResponse errorResponse) {
            HttpStatusCode status = errorResponse.getStatusCode();
            String detail = errorResponse.getBody().getDetail();

            ApiErrorResponse body = new ApiErrorResponse(
                    status.value(),
                    "RESOURCE_ERROR",
                    detail != null ? detail : "Request could not be processed",
                    Map.of()
            );

            return ResponseEntity.status(status).body(body);
        }

        log.error("Unexpected error", ex);

        ApiErrorResponse body = new ApiErrorResponse(
                500,
                "INTERNAL_ERROR",
                "Unexpected error",
                Map.of()
        );

        return ResponseEntity.internalServerError().body(body);
    }
}
