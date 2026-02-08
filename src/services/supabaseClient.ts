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
 * 获取或生成设备 ID（用于数据隔离）
 */
export function getDeviceId(): string {
    const KEY = 'kitchenflow_device_id';
    let deviceId = localStorage.getItem(KEY);

    // Validate if existing ID is a UUID (simple check)
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (!deviceId || !isUUID(deviceId)) {
        // Use crypto.randomUUID() for valid UUID generation
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            deviceId = crypto.randomUUID();
        } else {
            // Fallback for environments without crypto.randomUUID (e.g. older browsers/test)
            // RFC4122 version 4 compliant UUID generator
            deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        localStorage.setItem(KEY, deviceId);
    }
    return deviceId;
}
