import { useEffect } from 'react';
import { useAuthUser } from '@/stores/auth-user.store';
import { useCompanyStockDetailsOffline } from '@/api-queries/company/stock-details';
import { useGetDebtorsOffline } from '@/api-queries/debtor';
import { useGetSalesRepresentativesOffline } from '@/api-queries/sales-representatives';
import { useGetWarehousesOffline } from '@/api-queries/warehouse';
import { useGetStoreDepartmentsOffline } from '@/api-queries/store-departments';
import { useGetTendersOffline } from '@/api-queries/point-of-sale/tenders';
import { useGetAccountSalesOffline } from '@/api-queries/point-of-sale/account-sales/account-sales';
import { useGetCashSalesOffline } from '@/api-queries/point-of-sale/cash-sales';

const useInitialListFetching = ({ isOnline, isSyncing }: { isOnline: boolean; isSyncing: boolean }) => {
    const isAuthenticated = useAuthUser((state) => state.isLoggedIn);
    const networkReady = isOnline && isAuthenticated;

    // Initial Online API Queries

    // 1) Stock Details
    const { refetch: refetchStockDetails, isLoading: isProductsLoading } = useCompanyStockDetailsOffline(networkReady);

    // 2) Debtors
    const { refetch: refetchDebtors, isLoading: isDebtorsLoading } = useGetDebtorsOffline(networkReady);

    // 3) Sales Representatives
    const { refetch: refetchRepresentatives, isLoading: isRepresentativesLoading } =
        useGetSalesRepresentativesOffline(networkReady);

    // 4) Warehouses
    const { refetch: refetchWarehouses, isLoading: isWarehouseLoading } = useGetWarehousesOffline(networkReady);

    // 5) Store Departments
    const { refetch: refetchStoreDepartments, isLoading: isStoreDepartmentsLoading } =
        useGetStoreDepartmentsOffline(networkReady);

    // 6) Tenders
    const { refetch: refetchTenders, isLoading: isTendersLoading } = useGetTendersOffline(networkReady);

    // 7) Account Sales List
    const { refetch: refetchAccountSales, isLoading: isAccountSalesLoading } = useGetAccountSalesOffline(networkReady);

    // 8) Cash Sales List
    const { refetch: refetchCashSales, isLoading: isCashSalesLoading } = useGetCashSalesOffline(networkReady);

    // API Call on switching network ( from offline to online or vice-versa )
    useEffect(() => {
        if (!networkReady) return;
        refetchStockDetails();
        refetchDebtors();
        refetchRepresentatives();
        refetchWarehouses();
        refetchStoreDepartments();
        refetchTenders();
    }, [networkReady]);

    useEffect(() => {
        if (!networkReady || isSyncing) return;

        refetchAccountSales();
        refetchCashSales();
    }, [networkReady, isSyncing]);

    // Loading States
    const isLoading =
        networkReady &&
        (isWarehouseLoading ||
            isRepresentativesLoading ||
            isStoreDepartmentsLoading ||
            isDebtorsLoading ||
            isProductsLoading ||
            isTendersLoading ||
            isAccountSalesLoading ||
            isCashSalesLoading);

    return [isLoading];
};

export default useInitialListFetching;
