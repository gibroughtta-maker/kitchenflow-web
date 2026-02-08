/**
 * Phase 5：统一数据入口
 * 按 VITE_USE_BACKEND + VITE_API_BASE_URL 选择直连 Gemini/storage 或后端 REST；对外接口不变，便于切换。
 */
import { isBackendConfigured } from './apiClient';
import * as gemini from './gemini';
import * as storage from './storage';
import * as backendApi from './backendApi';

import { supabase, isSupabaseConfigured, getDeviceId } from './supabaseClient';
// import { initializeDevice } from './deviceManager';

function useBackend(): boolean {
  return isBackendConfigured();
}

// Cache for list_id to avoid repeated initialization
// Cache for list_id to avoid repeated initialization
// let cachedListId: string | null = null;

// async function getListId(): Promise<string> {
//   if (cachedListId) return cachedListId;
//   cachedListId = await initializeDevice();
//   return cachedListId;
// }

// --- 想吃 / 食谱 / 扫描（与 gemini 同签名）---

export async function identifyCravingFromText(text: string): Promise<{ foodName: string } | null> {
  return useBackend() ? backendApi.identifyCravingFromText(text) : gemini.identifyCravingFromText(text);
}

export async function identifyCravingFromLink(url: string): Promise<{ foodName: string } | null> {
  return useBackend() ? backendApi.identifyCravingFromLink(url) : gemini.identifyCravingFromLink(url);
}

export async function getRecipeDetails(foodName: string) {
  return useBackend() ? backendApi.getRecipeDetails(foodName) : gemini.getRecipeDetails(foodName);
}

export async function scanFridge(images: { base64: string; mimeType: string }[]) {
  if (useBackend()) return backendApi.scanFridge(images);
  return gemini.scanFridge(images);
}

// --- 购物清单（优先直连 Supabase，支持实时）---

export async function getShoppingList(): Promise<import('../types').ShoppingItem[]> {
  // 1. 优先直连 Supabase (使用 list_id)
  // 1. 优先直连 Supabase - TEMPORARY DISABLED: Enable only when setShoppingList supports Supabase
  /*
  if (isSupabaseConfigured() && supabase) {
    try {
      const listId = await getListId();
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          checked: item.checked,
          addedAt: new Date(item.created_at).getTime(),
          store: item.store_id || undefined,
        }));
      }
    } catch (e) {
      console.warn('Supabase direct read failed, falling back:', e);
    }
  }
  */

  // 2. 降级到 API 或本地
  return useBackend() ? backendApi.getShoppingList() : Promise.resolve(storage.getShoppingList());
}

export async function setShoppingList(items: import('../types').ShoppingItem[]): Promise<void> {
  if (useBackend()) return backendApi.setShoppingList(items);
  storage.setShoppingList(items);
}

// --- 库存（优先直连 Supabase）---

export async function getInventory(): Promise<import('../types').InventoryItem[]> {
  // 1. 优先直连 Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const deviceId = getDeviceId();
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('device_id', deviceId)
        .order('added_at', { ascending: false });

      if (!error && data) {
        return data.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          freshness: item.freshness as any,
          location: item.location as any,
          addedAt: new Date(item.added_at).getTime(),
        }));
      }
    } catch (e) {
      console.warn('Supabase direct read failed, falling back:', e);
    }
  }

  // 2. 降级
  return useBackend() ? backendApi.getInventory() : Promise.resolve(storage.getInventory());
}

export async function setInventory(items: import('../types').InventoryItem[]): Promise<void> {
  // 1. 优先直连 Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const deviceId = getDeviceId();
      const { error } = await supabase.rpc('save_inventory_items', {
        p_device_id: deviceId,
        p_items: items,
      });

      if (error) throw error;
      // Success - no need to fall back
      return;
    } catch (e) {
      console.warn('Supabase direct write failed, falling back:', e);
    }
  }

  // 2. 降级
  if (useBackend()) return backendApi.setInventory(items);
  storage.setInventory(items);
}
