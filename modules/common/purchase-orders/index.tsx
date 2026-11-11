'use client';

import { useRouter } from 'next/router';
import PurchaseOrdersTab from './purchase-orders-tab';
import PurchaseRequestsTab from './purchase-requests-tab';
import SupplierQuotationsTab from './supplier-quotations-tab';
import SupplierInvoicesTab from './supplier-invoices-tab';
import QuoteComparisonTab from './quote-comparison-tab';

export type PurchaseOrdersTabOption =
    | 'purchase-orders'
    | 'purchase-requests'
    | 'supplier-quotations'
    | 'quote-comparison'
    | 'supplier-invoices';

const PURCHASE_TAB: PurchaseOrdersTabOption = 'purchase-orders';

const PurchaseOrders = ({ initialTab }: { initialTab?: PurchaseOrdersTabOption }) => {
    const router = useRouter();
    const tab = initialTab || PURCHASE_TAB;
    const quotationPurchaseRequestId =
        tab === 'supplier-quotations' && typeof router.query.purchaseRequestId === 'string'
            ? router.query.purchaseRequestId
            : null;

    const openQuotationsForRequest = (purchaseRequestId: string) => {
        router.replace(
            {
                pathname: '/processing/purchase-orders/supplier-quotations',
                query: { purchaseRequestId },
            },
            undefined,
            { shallow: true },
        );
    };

    return (
        <div className="space-y-2 p-3">
            {tab === PURCHASE_TAB && <PurchaseOrdersTab />}

            {tab === 'purchase-requests' && (
                <PurchaseRequestsTab openSupplierQuotationsTab={openQuotationsForRequest} />
            )}

            {tab === 'supplier-quotations' && (
                <SupplierQuotationsTab
                    key={quotationPurchaseRequestId || 'all'}
                    purchaseRequestId={quotationPurchaseRequestId}
                />
            )}

            {tab === 'quote-comparison' && <QuoteComparisonTab />}

            {tab === 'supplier-invoices' && <SupplierInvoicesTab />}
        </div>
    );
};

export default PurchaseOrders;