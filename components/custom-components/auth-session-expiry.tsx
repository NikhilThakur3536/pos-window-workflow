import { useEffect } from 'react';
import { AUTH_TOKEN_KEY } from '@/lib/constant';
import { useAuthUser } from '@/stores/auth-user.store';
import { useTillSessionState } from '@/stores/till-session.store';
import { getActiveTillSession, getCurrentUserSession, isTillSessionActive } from '@/api-queries/till-session';
import { queryClient } from '@/components/query-client';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { getCurrentShift } from '@/api-queries/till-management/shifts';
import { clearDB } from '@/offline/db';

const MAX_TIMEOUT = 2_147_000_000;

export default function AuthSessionExpiry() {
    const token = useAuthUser((state) => state.user?.token);
    const sessionExpiresAt = useAuthUser((state) => state.sessionExpiresAt);
    const logout = useAuthUser((state) => state.logout);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;

        const restoreSession = async () => {
            let mustEndSession = false;
            try {
                const response = await getCurrentUserSession();
                if (cancelled) return;
                const current = response.data;
                const storedUser = useAuthUser.getState().user;
                if (!current || ['REVOKED', 'EXPIRED', 'ENDED', 'LOGOUT'].includes(current.status || '')) {
                    mustEndSession = true;
                    throw new Error('Your login session has ended. Please sign in again.');
                }
                if (
                    current?.terminalId &&
                    storedUser?.terminalId &&
                    current.terminalId !== storedUser.terminalId
                ) {
                    mustEndSession = true;
                    throw new Error('TERMINAL_INSTALLATION_MISMATCH: Sign in again using the registered terminal.');
                }
                if (current) {
                    useAuthUser.getState().updateSession({
                        sessionId: current.sessionId || current.id || storedUser?.sessionId,
                        clientType: current.clientType || storedUser?.clientType,
                        terminalId: current.terminalId || storedUser?.terminalId,
                        installationId: current.installationId || storedUser?.installationId,
                        eligibleTills: current.eligibleTills || storedUser?.eligibleTills,
                    });
                }

                if (current?.terminalId || storedUser?.terminalId) {
                    const shiftResponse = await getCurrentShift();
                    if (!cancelled) queryClient.setQueryData(['shift', 'current'], shiftResponse);
                }
            } catch (error) {
                if (cancelled) return;
                console.error('Failed to restore current login session:', error);
                if (
                    mustEndSession ||
                    (isAxiosError(error) && [401, 403].includes(error.response?.status || 0))
                ) {
                    void clearDB().catch((clearError) =>
                        console.error('Failed to clear offline user data after session expiry:', clearError),
                    );
                    window.localStorage.removeItem(AUTH_TOKEN_KEY);
                    window.localStorage.removeItem('companyContext');
                    useTillSessionState.getState().clearTillSession();
                    useAuthUser.getState().logout();
                    queryClient.clear();
                    toast.error(error instanceof Error ? error.message : 'Your login session has ended.');
                    if (window.location.pathname !== '/auth/login') {
                        window.location.replace('/auth/login');
                    }
                    return;
                }
            }

            if (useAuthUser.getState().user?.terminalId) {
                try {
                    const response = await getActiveTillSession();
                    if (cancelled) return;
                    if (isTillSessionActive(response.data)) {
                        useTillSessionState.getState().setTillSession(response.data);
                    } else {
                        useTillSessionState.getState().clearTillSession();
                    }
                } catch (error) {
                    if (!cancelled) console.error('Failed to restore active till session:', error);
                }
            }
        };

        void restoreSession();
        return () => {
            cancelled = true;
        };
    }, [token]);

    useEffect(() => {
        if (!token) return;
        let checking = false;
        const checkSessionOnResume = async () => {
            if (document.visibilityState !== 'visible' || checking) return;
            checking = true;
            try {
                const response = await getCurrentUserSession();
                const current = response.data;
                if (!current || ['REVOKED', 'EXPIRED', 'ENDED', 'LOGOUT'].includes(current.status || '')) {
                    throw new Error('Your login session has ended. Please sign in again.');
                }
                const storedUser = useAuthUser.getState().user;
                useAuthUser.getState().updateSession({
                    sessionId: current.sessionId || current.id || storedUser?.sessionId,
                    clientType: current.clientType || storedUser?.clientType,
                    terminalId: current.terminalId || storedUser?.terminalId,
                    installationId: current.installationId || storedUser?.installationId,
                    eligibleTills: current.eligibleTills || storedUser?.eligibleTills,
                });
                if (current.terminalId || storedUser?.terminalId) {
                    const shiftResponse = await getCurrentShift();
                    queryClient.setQueryData(['shift', 'current'], shiftResponse);
                }
            } catch (error) {
                const sessionEnded = error instanceof Error && error.message.startsWith('Your login session has ended');
                const authorizationFailed =
                    isAxiosError(error) && [401, 403].includes(error.response?.status || 0);
                if (!sessionEnded && !authorizationFailed) {
                    console.error('Failed to verify current login session on resume:', error);
                    return;
                }
                console.error('Current login session is no longer available:', error);
                void clearDB().catch((clearError) =>
                    console.error('Failed to clear offline user data after session expiry:', clearError),
                );
                window.localStorage.removeItem(AUTH_TOKEN_KEY);
                window.localStorage.removeItem('companyContext');
                useTillSessionState.getState().clearTillSession();
                logout();
                queryClient.clear();
                toast.error(error instanceof Error ? error.message : 'Your login session has ended.');
                if (window.location.pathname !== '/auth/login') {
                    window.location.replace('/auth/login');
                }
            } finally {
                checking = false;
            }
        };
        window.addEventListener('focus', checkSessionOnResume);
        document.addEventListener('visibilitychange', checkSessionOnResume);
        return () => {
            window.removeEventListener('focus', checkSessionOnResume);
            document.removeEventListener('visibilitychange', checkSessionOnResume);
        };
    }, [token, logout]);

    useEffect(() => {
        if (!token || !sessionExpiresAt) return;

        const expiresAt = Date.parse(sessionExpiresAt);
        if (!Number.isFinite(expiresAt)) return;

        let timeout: ReturnType<typeof setTimeout> | undefined;
        let sessionEnded = false;
        const checkExpiry = () => {
            if (sessionEnded) return;

            const remaining = expiresAt - Date.now();
            if (remaining > 0) {
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(checkExpiry, Math.min(remaining, MAX_TIMEOUT));
                return;
            }

            sessionEnded = true;
            void clearDB().catch((clearError) =>
                console.error('Failed to clear offline user data after session expiry:', clearError),
            );
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
            window.localStorage.removeItem('companyContext');
            useTillSessionState.getState().clearTillSession();
            logout();
            queryClient.clear();

            if (window.location.pathname !== '/auth/login') {
                window.location.replace('/auth/login');
            }
        };
        const checkWhenActive = () => {
            if (document.visibilityState === 'visible') checkExpiry();
        };

        checkExpiry();
        window.addEventListener('focus', checkWhenActive);
        document.addEventListener('visibilitychange', checkWhenActive);

        return () => {
            if (timeout) clearTimeout(timeout);
            window.removeEventListener('focus', checkWhenActive);
            document.removeEventListener('visibilitychange', checkWhenActive);
        };
    }, [token, sessionExpiresAt, logout]);

    return null;
}
