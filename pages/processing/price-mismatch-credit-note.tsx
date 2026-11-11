import type { NextPageWithLayout } from '@/types/next-page.types';
import PriceMismatchCreditNoteModule from '@/modules/debtors/price-mismatch-credit-note';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const PriceMismatchCreditNotePage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.DEBTORS.PRICE_MISMATCH_CREDIT_NOTE.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <PriceMismatchCreditNoteModule moduleCode={SYSTEM_MODULES.DEBTORS.PRICE_MISMATCH_CREDIT_NOTE.code} />
    </PermissionGuard>
);

PriceMismatchCreditNotePage.layoutType = 'dashboard';

export default PriceMismatchCreditNotePage;
