import { useEffect, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { useNetworkStore } from '@/stores/network.store';
import { useAuthUser } from '@/stores/auth-user.store';
import useInitialListFetching from './initial-lists-fetching';
import { PageLoader } from '@/components/custom-components/PageLoader';
import useSyncOfflineData from './sync-offline-data';
import { useInvoiceCountState } from '@/stores/invoice-count.store';
import { generateUniqueInvoiceId, generateUniqueUUID } from '@/utils/helpers';
import { useTerminalConfigsState } from '@/stores/terminal.store';
import { getApiBaseUrl } from '@/lib/constant';

const AppOfflineWrapper = ({ children }: { children: React.ReactNode }) => {
    const { online, setOnline } = useNetworkStore();
    const { setTerminalId } = useInvoiceCountState();
    const { setUniqueDeviceId } = useTerminalConfigsState();

    const { isLoggedIn } = useAuthUser();
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

    const isElectronApp = process.env.NEXT_PUBLIC_IS_ELECTRON_APP === 'true';

    const [isSyncing] = useSyncOfflineData({ isOnline: online });
    const [isLoading] = useInitialListFetching({ isOnline: online, isSyncing });

    const checkRealInternet = async () => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/test`, {
                method: 'HEAD',
                mode: 'cors',
                cache: 'no-store',
            });

            if (response.ok) return true;
        } catch {}

        try {
            const response = await fetch('https://api.github.com', {
                method: 'HEAD',
                mode: 'cors',
                cache: 'no-store',
            });
            return response.ok;
        } catch {
            return false;
        }
    };

    const handleInternetState = async (state: 'online' | 'offline') => {
        if (state === 'online') {
            if (pollingInterval.current) return;
            const checkUntilOnline = async () => {
                const realInternet = await checkRealInternet();
                if (realInternet) {
                    if (pollingInterval.current) clearTimeout(pollingInterval.current);
                    pollingInterval.current = null;
                    setOnline(true);
                    isElectron && (window as any).electronAPI?.notifyOnline?.();
                } else {
                    pollingInterval.current = setTimeout(checkUntilOnline, 5000);
                }
            };
            checkUntilOnline();
        } else {
            if (pollingInterval.current) {
                clearTimeout(pollingInterval.current);
                pollingInterval.current = null;
            }
            setOnline(false);
            isElectron && (window as any).electronAPI?.notifyOffline?.();
        }
    };

    useEffect(() => {
        const handleOffline = () => handleInternetState('offline');
        const handleOnline = () => handleInternetState('online');

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        handleInternetState(navigator.onLine ? 'online' : 'offline');

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const terminalStateString = localStorage.getItem('pos-invoice-count-store');
            let terminalId = terminalStateString ? JSON.parse(terminalStateString)?.state?.terminalId : '';

            if (!terminalId) {
                if (isElectronApp) {
                    (async () => {
                        const deviceID = await (window as any).electronAPI?.getDeviceId();

                        if (deviceID && typeof deviceID === 'string') {
                            setUniqueDeviceId(deviceID?.toUpperCase());
                            const hexPart = deviceID.replace(/-/g, '').slice(0, 12);
                            const timestamp = BigInt(Date.now());
                            const terminalId = (BigInt('0x' + hexPart) + timestamp).toString(36).toUpperCase();
                            setTerminalId(terminalId);
                        }
                    })();
                } else {
                    const deviceId = generateUniqueUUID();
                    setUniqueDeviceId(deviceId?.toUpperCase());
                    terminalId = generateUniqueInvoiceId();
                    setTerminalId(terminalId);
                }
            }
        }
    }, []);

    if (!online && !isLoggedIn) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 p-4">
                <div className="w-full max-w-md rounded-2xl border bg-white shadow-lg">
                    <div className="p-8">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                            <WifiOff className="text-red-500" size={36} />
                        </div>
                        <h2 className="mb-2 text-center text-2xl font-bold">No Internet Connection</h2>
                        <p className="text-center text-gray-600">You need internet connection to continue.</p>
                    </div>
                </div>
            </div>
        );
    }

    return <PageLoader isLoading={online && isLoggedIn && (isSyncing || isLoading)}>{children}</PageLoader>;
};

export default AppOfflineWrapper;
