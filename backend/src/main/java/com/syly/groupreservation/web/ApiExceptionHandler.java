package com.syly.groupreservation.web;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Maps validation failures to {@code { "errors": string[] }} like the Next.js API route. */
@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, List<String>>> handleValidation(
      MethodArgumentNotValidException ex) {
    List<String> errors =
        ex.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getDefaultMessage() != null ? err.getDefaultMessage() : err.getField())
            .collect(Collectors.toList());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("errors", errors));
  }
}
