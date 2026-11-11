import { useEffect } from 'react';
import { useAuthUser } from '@/stores/auth-user.store';
import { getMutateIDBKey } from '@/utils/helpers';
import { apiUrls } from '@/api-queries';
import { clearDBArray, getDBArray } from './db';
import {
    CreatedAccountSalesSyncSchema,
    useSyncCreatedAccountSales,
} from '@/api-queries/point-of-sale/account-sales/account-sales';
import { toast } from 'sonner';
import { CreatedCashSalesSyncSchema, useSyncCreatedCashSales } from '@/api-queries/point-of-sale/cash-sales';

const useSyncOfflineData = ({ isOnline }: { isOnline: boolean }) => {
    const isAuthenticated = useAuthUser((state) => state.isLoggedIn);

    let isSyncing = true;

    const { mutate: syncCreatedAccountSales, isPending: isSyncingAccountSales } = useSyncCreatedAccountSales();
    const { mutate: syncCreatedCashSales, isPending: isSyncingCashSales } = useSyncCreatedCashSales();

    async function runSyncApis() {
        // 1) Account Sales
        const syncAccountSalesKey = getMutateIDBKey(apiUrls.accountSales);
        const offlineAccountSales = await getDBArray(syncAccountSalesKey);
        if (offlineAccountSales && offlineAccountSales?.length !== 0) {
            syncCreatedAccountSales({ syncData: offlineAccountSales } as CreatedAccountSalesSyncSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Account Sales synced successfully');
                        clearDBArray(syncAccountSalesKey);
                    } else {
                        toast.error('Account Sales syncing failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        // 2) Cash Sales
        const syncCashSalesKey = getMutateIDBKey(apiUrls.cashSales);
        const offlineCashSales = await getDBArray(syncCashSalesKey);
        if (offlineCashSales && offlineCashSales?.length !== 0) {
            syncCreatedCashSales({ syncData: offlineCashSales } as CreatedCashSalesSyncSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Cash Sales synced successfully');
                        clearDBArray(syncCashSalesKey);
                    } else {
                        toast.error('Cash Sales syncing failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        isSyncing = false;
    }

    isSyncing = isSyncingAccountSales || isSyncingCashSales;

    useEffect(() => {
        if (isOnline && isAuthenticated) runSyncApis();
    }, [isOnline, isAuthenticated]);

    return [isSyncing];
};

export default useSyncOfflineData;
