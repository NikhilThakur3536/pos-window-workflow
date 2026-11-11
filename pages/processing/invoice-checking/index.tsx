import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import InvoiceChecking from '@/modules/common/invoice-checking';

const InvoiceCheckingPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.PROCESSING?.INVOICE_CHECKING.code}
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            <InvoiceChecking />
        </PermissionGuard>
    );
};

InvoiceCheckingPage.layoutType = 'dashboard';

export default InvoiceCheckingPage;