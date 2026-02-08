/**
 * Supabase Client for kitchenflow-web
 * 用于实时订阅和直接读取操作
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

let supabaseClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    });
} else {
    console.warn('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = supabaseClient;

export function isSupabaseConfigured(): boolean {
    return supabaseClient !== null;
}

/**
 * Generate a standard UUID v4
 */
export function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Validate if a string is a valid UUID
 */
export function isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * 获取或生成设备 ID（用于数据隔离）
 */
export function getDeviceId(): string {
    const KEY = 'kitchenflow_device_id';
    let deviceId = localStorage.getItem(KEY);

    if (!deviceId || !isUUID(deviceId)) {
        deviceId = generateUUID();
        localStorage.setItem(KEY, deviceId);
    }
    return deviceId;
}
