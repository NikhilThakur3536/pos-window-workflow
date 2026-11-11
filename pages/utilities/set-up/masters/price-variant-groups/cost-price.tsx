import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import PriceVariantGroupsNav from '@/modules/masters/price-variant-groups';
import CostPriceVariantGroups from '@/modules/masters/price-variant-groups/cost-price';

const MastersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.UTILITIES.SETUP.DEFAULT_TABLES.COST_PRICE_VARIANT_GROUPS.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <PriceVariantGroupsNav>
                <CostPriceVariantGroups />
            </PriceVariantGroupsNav>
        </PermissionGuard>
    );
};

MastersPage.layoutType = 'dashboard';

export default MastersPage;
