import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import SelectPopover from '@/components/select-popover';
import { useGetGoodsReceivingList } from '@/api-queries/goods-receiving';
import { useGetPurchaseOrderList } from '@/api-queries/purchase-orders';
import { useGetCompanyDebtorOrderList } from '@/api-queries/company-debtor-orders';

const PAGE_SIZE = 20;

interface SourceDocumentOption {
    value: string;
    label: string;
}

// Source document types that have a real list endpoint behind them:
//
//   GRV / GOODS_RECEIVED  -> POST /api/company/creditorGoodsReceivingOrder/all
//   PURCHASE_ORDER       -> POST /api/company/purchaseOrder/list
//   SALES_ORDER          -> POST /api/company/companyDebtorOrder/all
//
// DELIVERY_NOTE and OTHER have no list endpoint, so they stay on the free-text id.
export const SOURCE_DOCUMENT_LIST_TYPES: string[] = ['GRV', 'GOODS_RECEIVING', 'PURCHASE_ORDER', 'SALES_ORDER'];

// The dropdown keeps SALES_ORDER, but invoiceChecking/open expects SALE_ORDER.
export const SOURCE_DOCUMENT_TYPE_API_VALUE: Record<string, string> = {
    SALES_ORDER: 'SALE_ORDER',
};

export const toApiSourceDocumentType = (type: string) => SOURCE_DOCUMENT_TYPE_API_VALUE[type] || type;

interface SourceDocumentSelectProps {
    sourceDocumentType: string;
    companyDebtorId?: string;
    companyCreditorId?: string;
    disabled?: boolean;
    value?: string;
    onSelect: (option: { id: string; number?: string } | null) => void;
}

const SourceDocumentSelect = ({
    sourceDocumentType,
    companyDebtorId,
    companyCreditorId,
    disabled,
    value,
    onSelect,
}: SourceDocumentSelectProps) => {
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [search, setSearch] = useState('');

    const isListed = SOURCE_DOCUMENT_LIST_TYPES.includes(sourceDocumentType);
    const isPurchaseOrder = sourceDocumentType === 'PURCHASE_ORDER';
    const isSalesOrder = sourceDocumentType === 'SALES_ORDER';

    // Each source type reads from its own list API. Queries stay disabled for the types
    // with no list so switching the dropdown never calls an unrelated endpoint.
    const grvQuery = useGetGoodsReceivingList({
        limit,
        offset: 0,
        status: 'ACTIVE',
        ...(companyCreditorId ? { companyCreditorId } : {}),
        ...(search ? { search } : {}),
    });
    const poQuery = useGetPurchaseOrderList({
        limit,
        offset: 0,
        ...(search ? { search } : {}),
        ...(companyCreditorId ? { companyCreditorId } : {}),
    });
    const cdoQuery = useGetCompanyDebtorOrderList({
        limit,
        offset: 0,
        ...(companyDebtorId ? { companyDebtorId } : {}),
    });

    const activeQuery = isPurchaseOrder ? poQuery : isSalesOrder ? cdoQuery : grvQuery;

    // A new type or scope starts the paging again.
    useEffect(() => {
        setLimit(PAGE_SIZE);
        setSearch('');
    }, [sourceDocumentType, companyDebtorId, companyCreditorId]);

    // Each source keeps its own response shape: purchaseOrder/list returns a flat array
    // with `total`, while the GRV and company debtor order lists return { count, rows }.
    const { rows, count } = useMemo<{ rows: Record<string, any>[]; count: number }>(() => {
        if (!isListed) return { rows: [], count: 0 };
        if (isPurchaseOrder) {
            const res = poQuery.data;
            const list = Array.isArray(res?.data) ? res.data : [];
            return { rows: list as unknown as Record<string, any>[], count: res?.total ?? list.length };
        }
        const page = (isSalesOrder ? cdoQuery.data : grvQuery.data)?.data;
        return { rows: (page?.rows || []) as Record<string, any>[], count: page?.count ?? 0 };
    }, [isListed, isPurchaseOrder, isSalesOrder, poQuery.data, cdoQuery.data, grvQuery.data]);

    const options = useMemo<SourceDocumentOption[]>(() => {
        if (isPurchaseOrder) {
            return rows.map((r) => ({
                value: r.id,
                label: `${r.orderNumber || r.poNumber || r.id}${r.status ? ` — ${r.status}` : ''}`,
            }));
        }
        if (isSalesOrder) {
            return rows.map((r) => ({
                value: r.id,
                label: `${r.clientDocumentId || r.id}${r.lifecycleStatus ? ` — ${r.lifecycleStatus}` : ''}`,
            }));
        }
        return rows.map((r) => ({
            value: r.id,
            label: `${r.orderNumber || r.supplierInvoiceNumber || r.id}${r.grvDate ? ` — ${r.grvDate}` : ''}`,
        }));
    }, [rows, isPurchaseOrder, isSalesOrder]);

    const numberOf = (id: string) => options.find((o) => o.value === id)?.label?.split(' — ')[0];

    if (!isListed) return null;

    return (
        <div>
            <Label className="text-sm font-medium">Source Document</Label>
            <div className="mt-1">
                <SelectPopover
                    title="source document"
                    onlyTitle="Select document"
                    selectedValue={value || null}
                    // options are already filtered server side; the popover also filters
                    // locally, so keep the label in sync with the last fetched page
                    options={options}
                    onSelect={(v) => {
                        const id = String(v || '');
                        onSelect(id ? { id, number: numberOf(id) } : null);
                    }}
                    selectClass="w-full"
                    disabled={disabled || activeQuery?.isLoading}
                    isSearching={activeQuery?.isFetching}
                    hasMore={options.length < count}
                    onLoadMore={() => setLimit((prev) => prev + PAGE_SIZE)}
                    onSearch={(term) => {
                        setSearch(term);
                        setLimit(PAGE_SIZE);
                    }}
                />
            </div>
        </div>
    );
};

export default SourceDocumentSelect;
