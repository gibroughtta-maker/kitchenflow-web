/**
 * Device Manager
 * 
 * Manages device registration and default shopping list creation
 * for multi-list database architecture
 */

import { supabase } from './supabaseClient';

const DEVICE_ID_KEY = 'kitchenflow_device_id';
const DEFAULT_LIST_NAME = 'My Shopping List';

/**
 * Get or create a device UUID
 * Stores in localStorage for persistence
 */
export async function getOrCreateDevice(): Promise<string> {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }

    // Check localStorage first
    let deviceId: string | null = localStorage.getItem(DEVICE_ID_KEY);

    if (deviceId) {
        // Verify device exists in database
        const { data, error } = await supabase
            .from('devices')
            .select('id')
            .eq('id', deviceId)
            .single();

        if (data && !error) {
            console.log('[DeviceManager] Existing device found:', deviceId);
            return deviceId;
        }
    }

    // Create new device
    const { data: newDevice, error: createError } = await supabase
        .from('devices')
        .insert({
            nickname: `Web Device - ${new Date().toLocaleDateString()}`
        })
        .select('id')
        .single();

    if (createError || !newDevice) {
        console.error('[DeviceManager] Failed to create device:', createError);
        throw new Error('Failed to register device');
    }

    const newDeviceId = newDevice.id;
    localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
    console.log('[DeviceManager] New device created:', newDeviceId);

    return newDeviceId;
}

/**
 * Get or create default shopping list for a device
 */
export async function getDefaultListId(deviceId: string): Promise<string> {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }

    // Check if device has an existing default list
    const { data: existingLists, error: fetchError } = await supabase
        .from('shopping_lists')
        .select('id, name')
        .eq('owner_device_id', deviceId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);

    if (fetchError) {
        console.error('[DeviceManager] Failed to fetch lists:', fetchError);
        throw new Error('Failed to fetch shopping lists');
    }

    if (existingLists && existingLists.length > 0) {
        console.log('[DeviceManager] Found existing list:', existingLists[0].id);
        return existingLists[0].id;
    }

    // Create default list
    const { data: newList, error: createError } = await supabase
        .from('shopping_lists')
        .insert({
            owner_device_id: deviceId,
            name: DEFAULT_LIST_NAME,
            is_active: true
        })
        .select('id')
        .single();

    if (createError || !newList) {
        console.error('[DeviceManager] Failed to create list:', createError);
        throw new Error('Failed to create default shopping list');
    }

    console.log('[DeviceManager] New default list created:', newList.id);
    return newList.id;
}

/**
 * Initialize device and get default list ID
 * Call this once at app startup
 */
export async function initializeDevice(): Promise<string> {
    const deviceId = await getOrCreateDevice();
    const listId = await getDefaultListId(deviceId);
    return listId;
}
