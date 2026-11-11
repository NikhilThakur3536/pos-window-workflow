import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import CompanyDetails from '@/modules/common/company-details';

const CompanyDetailsPage: NextPageWithLayout = () => {
    return <CompanyDetails />;
};

CompanyDetailsPage.layoutType = 'dashboard';

export default CompanyDetailsPage;
