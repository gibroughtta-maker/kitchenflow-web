/**
 * Phase 5：后端 REST API 调用层
 * 契约与 backend_integration_spec §7 一致；错误时返回 null 或抛，便于上层统一处理
 */
import { request, ApiError, isBackendConfigured } from './apiClient';
import type { FridgeSnapshotResult, RecipeDetails, ShoppingItem, InventoryItem } from '../types';

// --- 仅在后端已配置时可用 ---
function requireBackend(): void {
  if (!isBackendConfigured()) throw new Error('后端未配置，请设置 VITE_USE_BACKEND 与 VITE_API_BASE_URL');
}

// --- AI 代理接口（§7.1）---

export async function identifyCravingFromText(text: string): Promise<{ foodName: string } | null> {
  requireBackend();
  try {
    const data = await request<{ foodName: string; confidence?: number }>(
      'POST',
      '/api/craving/identify-from-text',
      { text }
    );
    if (data?.foodName && typeof data.foodName === 'string') return { foodName: data.foodName.trim() };
    return null;
  } catch (e) {
    if (e instanceof ApiError) console.error('identifyCravingFromText:', e.status, e.message);
    return null;
  }
}

export async function identifyCravingFromLink(url: string): Promise<{ foodName: string } | null> {
  requireBackend();
  try {
    const data = await request<{ foodName: string; confidence?: number }>(
      'POST',
      '/api/craving/identify-from-link',
      { url }
    );
    if (data?.foodName && typeof data.foodName === 'string') return { foodName: data.foodName.trim() };
    return null;
  } catch (e) {
    if (e instanceof ApiError) console.error('identifyCravingFromLink:', e.status, e.message);
    return null;
  }
}

export async function getRecipeDetails(foodName: string): Promise<RecipeDetails | null> {
  requireBackend();
  try {
    const data = await request<RecipeDetails>('POST', '/api/recipe/details', { foodName });
    if (data?.dishName && Array.isArray(data?.ingredients) && Array.isArray(data?.steps)) return data;
    return null;
  } catch (e) {
    if (e instanceof ApiError) console.error('getRecipeDetails:', e.status, e.message);
    return null;
  }
}

export async function scanFridge(images: { base64: string; mimeType: string }[]): Promise<FridgeSnapshotResult | null> {
  requireBackend();
  try {
    const data = await request<FridgeSnapshotResult>('POST', '/api/scan/fridge', { images });
    if (data?.items && Array.isArray(data.items)) return data;
    return null;
  } catch (e) {
    if (e instanceof ApiError) console.error('scanFridge:', e.status, e.message);
    return null;
  }
}

// --- 购物清单 CRUD（§7.2）---

export async function getShoppingList(): Promise<ShoppingItem[]> {
  requireBackend();
  try {
    const data = await request<{ items: ShoppingItem[] }>('GET', '/api/shopping/items');
    return Array.isArray(data?.items) ? data.items : [];
  } catch (e) {
    if (e instanceof ApiError) console.error('getShoppingList:', e.status, e.message);
    return [];
  }
}

export async function setShoppingList(items: ShoppingItem[]): Promise<void> {
  requireBackend();
  try {
    await request('PUT', '/api/shopping/items', { items });
  } catch (e) {
    if (e instanceof ApiError) console.error('setShoppingList:', e.status, e.message);
    throw e;
  }
}

// --- 库存 CRUD（§7.3）---

export async function getInventory(): Promise<InventoryItem[]> {
  requireBackend();
  try {
    const data = await request<{ items: InventoryItem[] }>('GET', '/api/inventory/items');
    return Array.isArray(data?.items) ? data.items : [];
  } catch (e) {
    if (e instanceof ApiError) console.error('getInventory:', e.status, e.message);
    return [];
  }
}

export async function setInventory(items: InventoryItem[]): Promise<void> {
  requireBackend();
  try {
    await request('PUT', '/api/inventory/items', { items });
  } catch (e) {
    if (e instanceof ApiError) console.error('setInventory:', e.status, e.message);
    throw e;
  }
}
