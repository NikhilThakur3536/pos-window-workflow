import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TillSession } from '@/api-queries/till-session';

interface TillSessionState {
    tillSession: TillSession | null;
    setTillSession: (session: TillSession | null) => void;
    clearTillSession: () => void;
}

// The open till session is persisted to localStorage so a reload/restart does not
// re-prompt the cashier to open a till that is already open on the server. The
// store is re-synced from GET/POST /api/company/tillAssign/session/active after
// login and by the POS page, so the cached value stays authoritative.
export const useTillSessionState = create<TillSessionState>()(
    persist(
        (set) => ({
            tillSession: null,
            setTillSession: (session) => set({ tillSession: session }),
            clearTillSession: () => set({ tillSession: null }),
        }),
        {
            name: 'pos-till-session',
        },
    ),
);
