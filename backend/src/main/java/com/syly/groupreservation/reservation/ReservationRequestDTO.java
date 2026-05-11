package com.syly.groupreservation.reservation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

/**
 * Mirrors the frontend {@code CreateReservationRequest} (POST /api/reservations JSON body).
 *
 * <p>Fields: storeId, headcount, time, menuItems, totalAmount, minOrderAmount.
 */
public class ReservationRequestDTO {

  @NotBlank(message = "가게 정보가 필요합니다.")
  private String storeId;

  @NotNull(message = "인원수를 선택해주세요.")
  @Min(value = 1, message = "인원수를 선택해주세요.")
  private Integer headcount;

  @NotBlank(message = "시간을 선택해주세요.")
  private String time;

  @NotNull @Valid private List<MenuItemRequest> menuItems = new ArrayList<>();

  @NotNull(message = "총 금액이 필요합니다.")
  @Min(value = 0, message = "총 금액이 올바르지 않습니다.")
  private Integer totalAmount;

  @NotNull(message = "최소 주문 금액 정보가 필요합니다.")
  @Min(value = 0, message = "최소 주문 금액이 올바르지 않습니다.")
  private Integer minOrderAmount;

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

  public String getTime() {
    return time;
  }

  public void setTime(String time) {
    this.time = time;
  }

  public List<MenuItemRequest> getMenuItems() {
    return menuItems;
  }

  public void setMenuItems(List<MenuItemRequest> menuItems) {
    this.menuItems = menuItems != null ? menuItems : new ArrayList<>();
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

  /** One line in {@code menuItems}: {@code { "menuId": string, "quantity": number }}. */
  public static class MenuItemRequest {

    @NotBlank(message = "메뉴 ID가 필요합니다.")
    private String menuId;

    @NotNull(message = "수량이 필요합니다.")
    @Min(value = 1, message = "수량은 1 이상이어야 합니다.")
    private Integer quantity;

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
  }
}
