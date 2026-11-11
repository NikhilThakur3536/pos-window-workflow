import { useRouter } from 'next/router';
import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import PurchaseOrders, { type PurchaseOrdersTabOption } from '@/modules/common/purchase-orders';

const VALID_TABS: PurchaseOrdersTabOption[] = ['purchase-requests', 'supplier-quotations', 'quote-comparison', 'supplier-invoices'];

export async function getStaticPaths() {
    return {
        paths: VALID_TABS.map((tab) => ({ params: { tab } })),
        fallback: false,
    };
}

export async function getStaticProps() {
    return { props: {} };
}

const Page: NextPageWithLayout = () => {
    const router = useRouter();
    const tab = (router.query.tab as string) || '';
    const initialTab = (VALID_TABS as string[]).includes(tab) ? (tab as PurchaseOrdersTabOption) : undefined;

    return (
        <PermissionGuard module={SYSTEM_MODULES?.PROCESSING.PURCHASE_ORDERS.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <PurchaseOrders key={initialTab || 'orders'} initialTab={initialTab} />
        </PermissionGuard>
    );
};

Page.layoutType = 'dashboard';
export default Page;