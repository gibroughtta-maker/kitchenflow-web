/**
 * Store Preference Service (Web Version)
 * 
 * Tracks user shopping habits to enable personalized store recommendations.
 * Ported from kitchenflow-app/src/services/userPreferencesService.ts
 */

import { supabase, getDeviceId, isSupabaseConfigured } from './supabaseClient';

/**
 * Record user's store choice for an item
 * This builds the learning dataset for personalized classification
 */
export async function recordStorePreference(
    itemName: string,
    preferredStore: string
): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
        console.warn('[StorePreference] Supabase not configured, skipping preference recording');
        return;
    }

    try {
        const deviceId = getDeviceId();
        const { error } = await supabase.rpc('record_store_preference', {
            p_device_id: deviceId,
            p_item_name: itemName.toLowerCase().trim(),
            p_preferred_store: preferredStore
        });

        if (error) {
            console.error('[StorePreference] Failed to record:', error);
        } else {
            console.log(`[StorePreference] Recorded: "${itemName}" → ${preferredStore}`);
        }
    } catch (error) {
        console.error('[StorePreference] Error recording preference:', error);
    }
}

/**
 * Get user's preferred store for a specific item
 * Returns null if user has no preference history
 */
export async function getPreferredStore(
    itemName: string
): Promise<string | null> {
    if (!isSupabaseConfigured() || !supabase) {
        return null;
    }

    try {
        const deviceId = getDeviceId();
        const { data, error } = await supabase.rpc('get_preferred_store', {
            p_device_id: deviceId,
            p_item_name: itemName.toLowerCase().trim()
        });

        if (error) {
            console.warn('[StorePreference] Get failed:', error.message || error);
            return null;
        }

        // The RPC returns the store name directly as a string
        if (data) {
            console.log(`[StorePreference] Found preference: "${itemName}" → ${data}`);
            return data;
        }

        return null;
    } catch (error) {
        console.error('[StorePreference] Error getting preference:', error);
        return null;
    }
}

/**
 * Get all user preferences (for debugging/analytics)
 */
export async function getAllUserPreferences(): Promise<Array<{
    item_name: string;
    preferred_store: string;
    updated_at: string;
}>> {
    if (!isSupabaseConfigured() || !supabase) {
        return [];
    }

    try {
        const deviceId = getDeviceId();
        const { data, error } = await supabase
            .from('user_store_preferences')
            .select('*')
            .eq('device_id', deviceId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('[StorePreference] Failed to get all preferences:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[StorePreference] Error:', error);
        return [];
    }
}
