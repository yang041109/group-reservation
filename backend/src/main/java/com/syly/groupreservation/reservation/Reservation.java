package com.syly.groupreservation.reservation;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * JPA persistence model for a reservation. Aligns with the frontend POST body plus server fields
 * ({@code id}, {@code status}, {@code createdAt}).
 */
@Entity
@Table(name = "reservations")
public class Reservation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 64)
  private String storeId;

  @Column(nullable = false)
  private Integer headcount;

  /** Slot chosen by the user (e.g. "18:00"); column avoids SQL keyword {@code time}. */
  @Column(name = "reserved_time", nullable = false, length = 16)
  private String reservedTime;

  @Column(nullable = false)
  private Integer totalAmount;

  @Column(nullable = false)
  private Integer minOrderAmount;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private ReservationStatus status = ReservationStatus.PENDING;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(
      name = "reservation_menu_items",
      joinColumns = @JoinColumn(name = "reservation_id"))
  @OrderColumn(name = "line_idx")
  private List<MenuItemSelection> menuItems = new ArrayList<>();

  public Long getId() {
    return id;
  }

  public String getStoreId() {
    return storeId;
  }

  public void setStoreId(String storeId) {
    this.storeId = storeId;
  }

  public Integer getHeadcount() {
    return headcount;
  }

  public void setHeadcount(Integer headcount) {
    this.headcount = headcount;
  }

  public String getReservedTime() {
    return reservedTime;
  }

  public void setReservedTime(String reservedTime) {
    this.reservedTime = reservedTime;
  }

  public Integer getTotalAmount() {
    return totalAmount;
  }

  public void setTotalAmount(Integer totalAmount) {
    this.totalAmount = totalAmount;
  }

  public Integer getMinOrderAmount() {
    return minOrderAmount;
  }

  public void setMinOrderAmount(Integer minOrderAmount) {
    this.minOrderAmount = minOrderAmount;
  }

  public ReservationStatus getStatus() {
    return status;
  }

  public void setStatus(ReservationStatus status) {
    this.status = status;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public List<MenuItemSelection> getMenuItems() {
    return menuItems;
  }

  public void setMenuItems(List<MenuItemSelection> menuItems) {
    this.menuItems = menuItems != null ? menuItems : new ArrayList<>();
  }

  /** Embedded line: {@code menuId} + {@code quantity} as sent by the client. */
  @Embeddable
  public static class MenuItemSelection {

    @Column(name = "menu_id", nullable = false, length = 64)
    private String menuId;

    @Column(nullable = false)
    private Integer quantity;

    protected MenuItemSelection() {}

    public MenuItemSelection(String menuId, Integer quantity) {
      this.menuId = menuId;
      this.quantity = quantity;
    }

    public String getMenuId() {
      return menuId;
    }

    public void setMenuId(String menuId) {
      this.menuId = menuId;
    }

    public Integer getQuantity() {
      return quantity;
    }

    public void setQuantity(Integer quantity) {
      this.quantity = quantity;
    }

    @Override
    public boolean equals(Object o) {
      if (this == o) {
        return true;
      }
      if (o == null || getClass() != o.getClass()) {
        return false;
      }
      MenuItemSelection that = (MenuItemSelection) o;
      return Objects.equals(menuId, that.menuId) && Objects.equals(quantity, that.quantity);
    }

    @Override
    public int hashCode() {
      return Objects.hash(menuId, quantity);
    }
  }
}
