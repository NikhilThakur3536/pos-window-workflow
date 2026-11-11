import { EligibleTill, User } from '@/api-queries/auth';
import { Company } from '@/api-queries/company-details';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore extends User {
    token: string;
    terminalId?: string;
    sessionId?: string;
    clientType?: string;
    installationId?: string;
    eligibleTills?: EligibleTill[];
    rosterAssignmentId?: string;
}

type CurrencyDetails = UserStore['currency'];

interface AuthUser {
    user: UserStore | null;
    currency: { code: string; symbol: string } | null;
    isLoggedIn: boolean;
    company: Company | null;
    sessionExpiresAt: string | null;
    login: (user: UserStore, currency: CurrencyDetails, sessionExpiresAt?: string) => void;
    updateSession: (session: Partial<UserStore>) => void;
    setCompany: (company: Company) => void;
    logout: () => void;
}

export const useAuthUser = create<AuthUser>()(
    persist(
        (set) => ({
            user: null,
            currency: null,
            company: null,
            isLoggedIn: false,
            sessionExpiresAt: null,
            login: (user: UserStore, currency: CurrencyDetails, sessionExpiresAt) =>
                set({ user, isLoggedIn: true, currency, sessionExpiresAt: sessionExpiresAt || null }),
            updateSession: (session) =>
                set((state) => ({ user: state.user ? { ...state.user, ...session } : null })),
            setCompany: (company: Company) => set({ company }),
            logout: () => set({ user: null, isLoggedIn: false, currency: null, company: null, sessionExpiresAt: null }),
        }),
        {
            name: 'pos-auth-store',
        },
    ),
);
