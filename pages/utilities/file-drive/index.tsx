import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import DataImportCenterNew from '@/modules/common/s3upload';

const CompanyDetailsPage: NextPageWithLayout = () => {
    return <DataImportCenterNew/>;
};

CompanyDetailsPage.layoutType = 'dashboard';

export default CompanyDetailsPage;
