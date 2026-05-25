// src/store/cartStorage.js
const KEY_PREFIX = "flower_shop_cart_v1";

export function getCartStorageKey(scope = "guest") {
  return `${KEY_PREFIX}_${scope}`;
}

export function loadCart(scope = "guest") {
  try {
    const raw = localStorage.getItem(getCartStorageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(scope = "guest", items = []) {
  try {
    localStorage.setItem(getCartStorageKey(scope), JSON.stringify(items));
  } catch {
    // ignore
  }
}
