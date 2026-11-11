import type { NextPageWithLayout } from '@/types/next-page.types';
import CashTendersModule from '@/modules/point-of-sale/cash-up/cash-tenders';
import AnyOfPermissionGuard from '@/components/permission-guards/AnyOfPermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { useHasCashUpViewAll } from '@/api-queries/security';
import { ViewAccessDeniedCard } from '@/components/permission-guards';
import { PageLoader } from '@/components/custom-components/PageLoader';

const CashTendersPage: NextPageWithLayout = () => {
    const { canViewAll, isLoading } = useHasCashUpViewAll();
    const appClient = process.env.NEXT_PUBLIC_CLIENT_TYPE === 'APP';
    return (
        <AnyOfPermissionGuard
            modules={[
                SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.CASHUP_TENDERS.code,
                SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.code,
            ]}
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            {appClient ? null : isLoading ? (
                <PageLoader isLoading />
            ) : canViewAll ? (
                <CashTendersModule moduleCode={SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.CASHUP_TENDERS.code} />
            ) : (
                <ViewAccessDeniedCard
                    options={{
                        title: 'Wider Cash-Up Permission Required',
                        description: 'Cash tender totals require the CASHUP_VIEW_ALL Execute permission.',
                    }}
                />
            )}
        </AnyOfPermissionGuard>
    );
};

CashTendersPage.layoutType = 'dashboard';

export default CashTendersPage;
