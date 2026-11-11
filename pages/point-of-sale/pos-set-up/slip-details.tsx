import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import SlipDetails from '@/modules/common/point-of-sale/pos-set-up/slip-details';

const SlipDetailsPage: NextPageWithLayout = () => {
    return <SlipDetails />;
};

SlipDetailsPage.layoutType = 'dashboard';

export default SlipDetailsPage;
