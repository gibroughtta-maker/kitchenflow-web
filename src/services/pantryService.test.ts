import { describe, it, expect, vi, beforeEach } from 'vitest';
// @ts-ignore - Module likely doesn't exist yet (TDD Red Phase)
import { getPantryStaples, addPantryStaple, updatePantryScore, deletePantryStaple } from './pantryService';
import { supabase } from './supabaseClient';

// Mock Supabase client
vi.mock('./supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('pantryService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getPantryStaples', () => {
        it('should fetch staples for a device', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Rice' }], error: null });

            (supabase!.from as any).mockReturnValue({
                select: mockSelect,
                eq: mockEq,
                order: mockOrder,
            });

            const result = await getPantryStaples('device-1');

            expect(supabase!.from).toHaveBeenCalledWith('pantry_staples');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockEq).toHaveBeenCalledWith('device_id', 'device-1');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Rice');
        });

        it('should throw error on fetch failure', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') });

            (supabase!.from as any).mockReturnValue({
                select: mockSelect,
                eq: mockEq,
                order: mockOrder,
            });

            await expect(getPantryStaples('device-1')).rejects.toThrow('DB Error');
        });
    });

    describe('addPantryStaple', () => {
        it('should add a staple', async () => {
            const mockInsert = vi.fn().mockReturnThis();
            const mockSelect = vi.fn().mockReturnThis();
            const mockSingle = vi.fn().mockResolvedValue({ data: { id: '2', name: 'Oil', score: 100 }, error: null });

            (supabase!.from as any).mockReturnValue({
                insert: mockInsert,
                select: mockSelect,
                single: mockSingle,
            });

            const result = await addPantryStaple('device-1', 'Oil');

            expect(mockInsert).toHaveBeenCalledWith({
                device_id: 'device-1',
                name: 'Oil',
                score: 100,
            });
            expect(result.name).toBe('Oil');
        });

        it('should validate score range', async () => {
            await expect(addPantryStaple('device-1', 'Test', 150)).rejects.toThrow('Score must be between 0 and 100');
        });
    });
});
