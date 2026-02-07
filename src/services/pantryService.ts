/**
 * Pantry Service (Web Port)
 *
 * Manages pantry staples - items users always keep in stock.
 * Score represents stock level (0 = out of stock, 100 = fully stocked)
 */

import { supabase } from './supabaseClient';
// Types will be inferred or defined locally as needed
// Note: In the web app, types might be different. I'll check `src/types.ts` later or use `any` temporarily if types are missing, 
// then refactor. For now, I'll use a local interface to ensure compilation.

export interface PantryStaple {
    id: string;
    device_id: string;
    name: string;
    score: number;
    created_at?: string;
}

export interface PantryStapleInsert {
    device_id: string;
    name: string;
    score: number;
}

export interface PantryStapleUpdate {
    name?: string;
    score?: number;
}

/**
 * Get all pantry staples for a device
 * Sorted by score (low to high) so items needing restocking appear first
 */
export async function getPantryStaples(deviceId: string): Promise<PantryStaple[]> {
    const { data, error } = await supabase!
        .from('pantry_staples')
        .select('*')
        .eq('device_id', deviceId)
        .order('score', { ascending: true })
        .order('name', { ascending: true });

    if (error) throw error;
    return (data as PantryStaple[]) || [];
}

/**
 * Add a new pantry staple
 */
export async function addPantryStaple(
    deviceId: string,
    name: string,
    score: number = 100
): Promise<PantryStaple> {
    // Validate score
    if (score < 0 || score > 100) {
        throw new Error('Score must be between 0 and 100');
    }

    const stapleData: PantryStapleInsert = {
        device_id: deviceId,
        name: name.trim(),
        score,
    };

    const { data, error } = await supabase!
        .from('pantry_staples')
        .insert(stapleData)
        .select()
        .single();

    if (error) throw error;
    return data as PantryStaple;
}

/**
 * Update pantry staple score (stock level)
 */
export async function updatePantryScore(
    stapleId: string,
    score: number
): Promise<void> {
    // Validate score
    if (score < 0 || score > 100) {
        throw new Error('Score must be between 0 and 100');
    }

    const updateData: PantryStapleUpdate = { score };

    const { error } = await supabase!
        .from('pantry_staples')
        .update(updateData)
        .eq('id', stapleId);

    if (error) throw error;
}

/**
 * Delete a pantry staple
 */
export async function deletePantryStaple(stapleId: string): Promise<void> {
    const { error } = await supabase!
        .from('pantry_staples')
        .delete()
        .eq('id', stapleId);

    if (error) throw error;
}

/**
 * Increment score by a certain amount (e.g., after shopping)
 */
export async function incrementPantryScore(
    stapleId: string,
    increment: number = 20
): Promise<void> {
    // Get current score
    const { data: staple, error: fetchError } = await supabase!
        .from('pantry_staples')
        .select('score')
        .eq('id', stapleId)
        .single();

    if (fetchError) throw fetchError;

    // Calculate new score (cap at 100)
    const currentScore = (staple as any)?.score || 0;
    const newScore = Math.min(100, currentScore + increment);

    await updatePantryScore(stapleId, newScore);
}

/**
 * Decrement score by a certain amount (e.g., after using)
 */
export async function decrementPantryScore(
    stapleId: string,
    decrement: number = 10
): Promise<void> {
    // Get current staple data
    const { data: staple, error: fetchError } = await supabase!
        .from('pantry_staples')
        .select('score') // removed '*' optimization
        .eq('id', stapleId)
        .single();

    if (fetchError) throw fetchError;

    const currentScore = (staple as any)?.score || 0;

    // Calculate new score (floor at 0)
    const newScore = Math.max(0, currentScore - decrement);

    await updatePantryScore(stapleId, newScore);
}
