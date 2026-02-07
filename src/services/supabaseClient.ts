/**
 * Supabase Client for kitchenflow-web
 * 用于实时订阅和直接读取操作
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    if (!deviceId) {
        deviceId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(KEY, deviceId);
    }
    return deviceId;
}
