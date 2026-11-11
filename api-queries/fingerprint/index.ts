import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthUser } from '@/stores/auth-user.store';

export interface FingerprintCredential {
    id: string;
    userId: string;
    domainId: string;
    companyId: string;
    deviceId: string;
    deviceName: string;
    biometricType: string;
    status: 'ACTIVE' | 'INACTIVE';
    enrolledBy?: string;
    enrolledAt?: string;
    lastVerifiedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface FingerprintApiResult {
    success: boolean;
    data?: unknown;
    error?: string;
    status?: number;
}

export interface EnrollFingerprintPayload {
    userId: string;
    userName?: string;
    deviceName: string;
    sampleCount?: number;
}

interface ElectronApi {
    getDeviceId?: () => Promise<string | undefined>;
    enrollFingerprint?: (payload: unknown) => Promise<FingerprintApiResult>;
    listFingerprints?: (payload: unknown) => Promise<FingerprintApiResult>;
    removeFingerprint?: (payload: unknown) => Promise<FingerprintApiResult>;
    onFingerprintEnrollProgress?: (callback: (progress: { index: number; total: number; stage: string }) => void) => void;
    removeFingerprintEnrollProgressListeners?: () => void;
}

function getElectronAPI(): ElectronApi | undefined {
    if (typeof window === 'undefined') return undefined;
    return (window as unknown as { electronAPI?: ElectronApi }).electronAPI;
}

function getAuthToken(): string | undefined {
    return useAuthUser.getState().user?.token;
}

const IPC_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs: number = IPC_TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(message));
        }, timeoutMs);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}

export async function enrollFingerprint(data: EnrollFingerprintPayload): Promise<FingerprintApiResult> {
    const api = getElectronAPI();
    if (!api?.enrollFingerprint) {
        throw new Error('Fingerprint enrollment is only available in the desktop app.');
    }
    const deviceId = api.getDeviceId ? await api.getDeviceId() : undefined;

    return withTimeout(
        api.enrollFingerprint({
            userId: data.userId,
            userName: data.userName,
            deviceName: data.deviceName,
            sampleCount: data.sampleCount,
            deviceId,
            authToken: getAuthToken(),
        }),
        'Fingerprint scanner did not respond. Please try again.',
        120000,
    );
}

export const useEnrollFingerprint = () => {
    return useMutation({
        mutationFn: enrollFingerprint,
    });
};

export async function getFingerprintCredentials(userId: string): Promise<FingerprintCredential[]> {
    const api = getElectronAPI();
    if (!api?.listFingerprints) {
        throw new Error('Fingerprint is only available in the desktop app.');
    }
    const result = await withTimeout(
        api.listFingerprints({ userId, authToken: getAuthToken() }),
        'Timed out while loading fingerprints. Please try again.',
    );
    if (!result.success) {
        throw new Error(result.error || 'Failed to load fingerprints');
    }
    const body = result.data as unknown;
    const raw = (body as { data?: unknown })?.data ?? body;
    return (Array.isArray(raw) ? raw : []) as FingerprintCredential[];
}

export const useListFingerprints = (userId?: string) => {
    return useQuery({
        queryKey: ['fingerprint', 'list', userId],
        enabled: !!userId,
        queryFn: async () => await getFingerprintCredentials(userId as string),
        retry: false,
    });
};

export async function removeFingerprint(id: string): Promise<FingerprintApiResult> {
    const api = getElectronAPI();
    if (!api?.removeFingerprint) {
        throw new Error('Fingerprint is only available in the desktop app.');
    }
    return withTimeout(
        api.removeFingerprint({ id, authToken: getAuthToken() }),
        'Timed out while removing fingerprint. Please try again.',
    );
}

export const useRemoveFingerprint = () => {
    return useMutation({
        mutationFn: removeFingerprint,
    });
};