import type { NextPageWithLayout } from '@/types/next-page.types';
import ProductPublication from '@/modules/common/product-publication';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const ProductPublicationPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES.STOCK.PRODUCT_PUBLICATION.code} permission={[SYSTEM_PERMISSIONS.READ]}>
            <ProductPublication />
        </PermissionGuard>
    );
};

ProductPublicationPage.layoutType = 'dashboard';

export default ProductPublicationPage;