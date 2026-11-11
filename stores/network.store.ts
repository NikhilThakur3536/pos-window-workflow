import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NetworkState {
    online: boolean;
    setOnline: (state: boolean) => void;
}

export const useNetworkStore = create<NetworkState>()(
    persist(
        (set) => ({
            online: false,
            setOnline: (state) => set({ online: state }),
        }),
        {
            name: 'pos-network-store',
        },
    ),
);
