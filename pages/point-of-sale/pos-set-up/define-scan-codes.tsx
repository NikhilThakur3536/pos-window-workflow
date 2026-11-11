import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import DefineScanCodes from '@/modules/common/point-of-sale/pos-set-up/define-scan-codes';

const DefineScanCodesPage: NextPageWithLayout = () => {
    return <DefineScanCodes />;
};

DefineScanCodesPage.layoutType = 'dashboard';

export default DefineScanCodesPage;
