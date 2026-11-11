import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import GrvBarcodeReviewModule from '@/modules/processing/goods-receiving/barcode-review';

const GrvBarcodeReviewPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.GRV_BARCODE_REVIEW.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <GrvBarcodeReviewModule moduleCode={SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.GRV_BARCODE_REVIEW.code} />
    </PermissionGuard>
);

GrvBarcodeReviewPage.layoutType = 'dashboard';

export default GrvBarcodeReviewPage;