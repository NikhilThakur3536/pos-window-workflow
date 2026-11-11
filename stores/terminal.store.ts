import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TerminalConfigs {
    uniqueDeviceId: string;
    setUniqueDeviceId: (state: string) => void;
    configuredTerminalId: string;
    setConfiguredTerminalId: (state: string) => void;
    installationId: string;
    setInstallationId: (state: string) => void;
}

export const useTerminalConfigsState = create<TerminalConfigs>()(
    persist(
        (set) => ({
            uniqueDeviceId: '',
            setUniqueDeviceId: (state) => set({ uniqueDeviceId: state }),
            configuredTerminalId: '',
            setConfiguredTerminalId: (state) => set({ configuredTerminalId: state }),
            installationId: '',
            setInstallationId: (state) => set({ installationId: state }),
        }),
        {
            name: 'pos-terminal-config',
        },
    ),
);

export function getConfiguredTerminalId(): string {
    return useTerminalConfigsState.getState().configuredTerminalId.trim();
}

export function getOrCreateInstallationId(): string {
    const state = useTerminalConfigsState.getState();
    if (state.installationId) return state.installationId;
    if (typeof window === 'undefined') return '';

    const installationId = window.crypto.randomUUID();
    state.setInstallationId(installationId);
    return installationId;
}
