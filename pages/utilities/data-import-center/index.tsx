import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import DataImportCenter from '@/modules/common/utilities/data-import-center';

const DataImportCenterPage: NextPageWithLayout = () => {
    return <DataImportCenter />;
};

DataImportCenterPage.layoutType = 'dashboard';

export default DataImportCenterPage;
