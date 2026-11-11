'use client';

import StoreCategories from './store-categories';
import StoreCategoryAssignments from './store-category-assignments';
import SkuTagsManagement from './sku-tags-management';
import type { ComponentType } from 'react';

export type StockMaintenanceTab = 'store-categories' | 'store-category-assignments' | 'sku-tags-management';

const TAB_COMPONENTS: Record<StockMaintenanceTab, ComponentType> = {
    'store-categories': StoreCategories,
    'store-category-assignments': StoreCategoryAssignments,
    'sku-tags-management': SkuTagsManagement,
};

/**
 * Renders a single Stock Maintenance screen. There are no in-page tabs: each screen
 * has its own route and is reached from the sidebar menu.
 */
const StockMaintenance = ({ initialTab = 'store-categories' }: { initialTab?: StockMaintenanceTab }) => {
    const Component = TAB_COMPONENTS[initialTab] ?? StoreCategories;

    return (
        <div className="m-2 space-y-4 px-2">
            <Component />
        </div>
    );
};

export default StockMaintenance;