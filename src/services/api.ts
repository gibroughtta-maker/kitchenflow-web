/**
 * Phase 5：统一数据入口
 * 按 VITE_USE_BACKEND + VITE_API_BASE_URL 选择直连 Gemini/storage 或后端 REST；对外接口不变，便于切换。
 */
import { isBackendConfigured } from './apiClient';
import * as gemini from './gemini';
import * as storage from './storage';
import * as backendApi from './backendApi';

import { supabase, isSupabaseConfigured, getDeviceId } from './supabaseClient';
import { initializeDevice } from './deviceManager';

function useBackend(): boolean {
  return isBackendConfigured();
}

// Cache for list_id to avoid repeated initialization
// Cache for list_id to avoid repeated initialization
let cachedListId: string | null = null;

async function getListId(): Promise<string> {
  if (cachedListId) return cachedListId;
  const deviceId = await initializeDevice();
  cachedListId = deviceId || 'unknown_device'; // Fallback if initializeDevice returns void/null
  return cachedListId;
}

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
  // 1. 优先直连 Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const listId = await getListId();
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // [Sync Fix] First Principle: Don't lose user data on transition.
        // If cloud is empty but we have local data, it means we just connected.
        // We should migrate local data to cloud.
        if (data.length === 0) {
          const localData = storage.getShoppingList();
          if (localData.length > 0) {
            console.log('🚀 Migrating local data to Supabase...', localData);
            // Trigger background upload (fire and forget for UI responsiveness, or await if critical)
            // We reuse setShoppingList logic but explicitly.
            // Since we are inside getShoppingList, let's call setShoppingList to sync up.
            // CAUTION: setShoppingList implementation we just wrote calls getListId again. Safe.
            await setShoppingList(localData);
            return localData;
          }
        }

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

  // 2. 降级到 API 或本地
  return useBackend() ? backendApi.getShoppingList() : Promise.resolve(storage.getShoppingList());
}

export async function setShoppingList(items: import('../types').ShoppingItem[]): Promise<void> {
  // 1. 优先直连 Supabase (Sync)
  if (isSupabaseConfigured() && supabase) {
    try {
      const listId = await getListId();

      // Strategy: Sync local items to Supabase
      // 1. Upsert all current items
      const { error: upsertError } = await supabase
        .from('shopping_items')
        .upsert(
          items.map(item => ({
            id: item.id,
            list_id: listId,
            name: item.name,
            quantity: item.quantity || '1',
            checked: item.checked,
            created_at: new Date(item.addedAt).toISOString(),
            store_id: item.store || null
          }))
        );

      if (upsertError) throw upsertError;

      // 2. Delete items not in current list
      const currentIds = items.map(i => i.id);
      if (currentIds.length > 0) {
        await supabase
          .from('shopping_items')
          .delete()
          .eq('list_id', listId)
          .not('id', 'in', `(${currentIds.join(',')})`);
      } else {
        // If list is empty, delete all
        await supabase.from('shopping_items').delete().eq('list_id', listId);
      }

    } catch (e) {
      console.warn('Supabase direct write failed:', e);
    }
  }

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
        // [Sync Fix] Migration for Inventory
        if (data.length === 0) {
          const localData = storage.getInventory();
          if (localData.length > 0) {
            console.log('🚀 Migrating local INVENTORY to Supabase...', localData);
            await setInventory(localData);
            return localData;
          }
        }

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

      // Strategy: Sync local items to Supabase (Upsert + Delete)
      // 1. Upsert
      const { error: upsertError } = await supabase
        .from('inventory_items')
        .upsert(
          items.map(item => ({
            id: item.id,
            device_id: deviceId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            freshness: item.freshness,
            location: item.location,
            added_at: new Date(item.addedAt).toISOString(),
          }))
        );

      if (upsertError) throw upsertError;

      // 2. Delete items not in current list
      const currentIds = items.map(i => i.id);
      if (currentIds.length > 0) {
        await supabase
          .from('inventory_items')
          .delete()
          .eq('device_id', deviceId)
          .not('id', 'in', `(${currentIds.join(',')})`);
      } else {
        await supabase.from('inventory_items').delete().eq('device_id', deviceId);
      }

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
