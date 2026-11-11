import { NextPageWithLayout } from '@/types';
import ContractPriceInterface from '@/modules/common/stocks/contract-prices';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const ContractPricesPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.STOCK?.CONTRACT_PRICE_MAINTENANCE.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <ContractPriceInterface />
        </PermissionGuard>
    );
};

ContractPricesPage.layoutType = 'dashboard';

export default ContractPricesPage;
