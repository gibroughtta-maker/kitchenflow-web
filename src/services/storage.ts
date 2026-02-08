import type { ShoppingItem, InventoryItem } from '../types';

const SHOPPING_KEY = 'kitchenflow-shopping';
const INVENTORY_KEY = 'kitchenflow-inventory';
const CRAVINGS_KEY = 'kitchenflow-cravings';

export function getCravings(): import('../types').Craving[] {
  try {
    const raw = localStorage.getItem(CRAVINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCravings(items: import('../types').Craving[]): void {
  localStorage.setItem(CRAVINGS_KEY, JSON.stringify(items));
}

export function getShoppingList(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(SHOPPING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setShoppingList(items: ShoppingItem[]): void {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(items));
}

export function getInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setInventory(items: InventoryItem[]): void {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
}
