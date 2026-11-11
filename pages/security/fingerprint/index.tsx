import type { NextPageWithLayout } from '@/types/next-page.types';
import FingerprintModule from '@/modules/common/fingerprint';

const FingerprintPage: NextPageWithLayout = () => {
    return <FingerprintModule />;
};

FingerprintPage.layoutType = 'dashboard';

export default FingerprintPage;