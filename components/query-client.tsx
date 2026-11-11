import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNetworkStore } from '@/stores/network.store';
import { getApiKey } from '@/utils/helpers';
import { apiUrls } from '@/api-queries';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export const queryKeysToPersist = [getApiKey(apiUrls.userGroupPermissions)];

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,
            retry: false,
            refetchOnReconnect: true,
        },
    },
});

export default function Providers({ children }: { children: React.ReactNode }) {
    const { online } = useNetworkStore();

    useEffect(() => {
        onlineManager.setOnline(online);
    }, [online]);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />} */}
        </QueryClientProvider>
    );
}
