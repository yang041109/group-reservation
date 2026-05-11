package com.syly.groupreservation.reservation;

import com.syly.groupreservation.store.StoreRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes {@code POST /api/reservations} compatible with the Next.js frontend contract.
 *
 * <p>Success: 201 + {@code { "reservationId": string, "status": "pending" }}.
 */
@RestController
public class ReservationController {

  private final ReservationRepository reservationRepository;
  private final StoreRepository storeRepository;

  public ReservationController(
      ReservationRepository reservationRepository, StoreRepository storeRepository) {
    this.reservationRepository = reservationRepository;
    this.storeRepository = storeRepository;
  }

  @PostMapping(value = "/api/reservations", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<?> create(@Valid @RequestBody ReservationRequestDTO dto) {
    if (!storeRepository.existsById(dto.getStoreId())) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND)
          .body(Map.of("error", "가게를 찾을 수 없습니다."));
    }

    Reservation entity = new Reservation();
    entity.setStoreId(dto.getStoreId());
    entity.setHeadcount(dto.getHeadcount());
    entity.setReservedTime(dto.getTime());
    entity.setTotalAmount(dto.getTotalAmount());
    entity.setMinOrderAmount(dto.getMinOrderAmount());
    entity.setStatus(ReservationStatus.PENDING);
    entity.setCreatedAt(Instant.now());
    entity.setMenuItems(
        dto.getMenuItems().stream()
            .map(
                m ->
                    new Reservation.MenuItemSelection(
                        m.getMenuId(), m.getQuantity()))
            .collect(Collectors.toList()));

    Reservation saved = reservationRepository.save(entity);

    Map<String, String> body = new LinkedHashMap<>();
    body.put("reservationId", String.valueOf(saved.getId()));
    body.put("status", "pending");
    return ResponseEntity.status(HttpStatus.CREATED).body(body);
  }
}
