import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import DefaultSettings from '@/modules/common/point-of-sale/pos-set-up/default-settings';

const DefaultSettingsPage: NextPageWithLayout = () => {
    return <DefaultSettings />;
};

DefaultSettingsPage.layoutType = 'dashboard';

export default DefaultSettingsPage;
