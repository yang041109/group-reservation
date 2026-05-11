package com.syly.groupreservation.store;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Minimal store row so POST /api/reservations can return 404 for unknown {@code storeId}. */
@Entity
@Table(name = "stores")
public class Store {

  @Id
  @Column(length = 64)
  private String id;

  protected Store() {}

  public Store(String id) {
    this.id = id;
  }

  public String getId() {
    return id;
  }
}
