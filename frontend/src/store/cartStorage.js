// src/store/cartStorage.js
const KEY = "flower_shop_cart_v1";

export function loadCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}