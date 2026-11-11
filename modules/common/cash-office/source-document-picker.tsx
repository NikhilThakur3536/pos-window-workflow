import { useMemo, useState } from 'react';
import SelectPopover from '@/components/select-popover';
import { useGetSupplierInvoiceList } from '@/api-queries/supplier-invoices';
import { useGetPurchaseOrderList } from '@/api-queries/purchase-orders';
import { useGetDebtorInvoicingOrders } from '@/api-queries/debtor-invoicing-orders';
import { useGetGoodsReceivingList } from '@/api-queries/goods-receiving';

type Option = { value: string; label: string };

/** Source types the backend accepts (cashOffice.service.ts sourceModels). */
export const CASH_OFFICE_SOURCE_TYPES: Option[] = [
    { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
    { value: 'GOODS_RECEIVING', label: 'Goods Receiving (GRV)' },
    { value: 'SUPPLIER_INVOICE', label: 'Supplier Invoice' },
    { value: 'DEBTOR_INVOICE', label: 'Debtor Invoice' },
];

export const sourceTypeLabel = (type?: string | null) =>
    CASH_OFFICE_SOURCE_TYPES.find((t) => t.value === type)?.label || String(type || '—').replace(/_/g, ' ');

const PAGE = 50;
const shortId = (id: string) => (/^[0-9a-f]{8}-/i.test(id) ? `…${id.slice(-8)}` : id);

type Props = {
    sourceDocumentType: string;
    value: string;
    onSelect: (id: string) => void;
    disabled?: boolean;
};

type PickerProps = {
    title: string;
    options: Option[];
    value: string;
    onSelect: (id: string) => void;
    onSearch?: (s: string) => void;
    isSearching?: boolean;
    disabled?: boolean;
};

/** Keeps an already-saved reference visible even if it is not in the loaded page. */
const Picker = ({ title, options, value, onSelect, onSearch, isSearching, disabled }: PickerProps) => {
    const list = value && !options.some((o) => o.value === value) ? [{ value, label: `Saved document ${shortId(value)}` }, ...options] : options;
    return (
        <SelectPopover
            title={title}
            onlyTitle={`Select ${title.toLowerCase()}`}
            selectedValue={value}
            options={list}
            onSearch={onSearch}
            isSearching={isSearching}
            disabled={disabled}
            onSelect={(val) => onSelect(String(val || ''))}
        />
    );
};

const asRows = (data: unknown): Record<string, any>[] => {
    const d = data as any;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.rows)) return d.rows;
    return [];
};

const labelOf = (r: Record<string, any>, ...numbers: string[]) => {
    const no = numbers.map((k) => r[k]).find(Boolean) || r.id;
    const party = r.CompanyCreditor?.name || r.CompanyDebtor?.name || r.name;
    return `${no}${party ? ` — ${party}` : ''}${r.status ? ` (${r.status})` : ''}`;
};

const PurchaseOrderPicker = (p: Omit<Props, 'sourceDocumentType'>) => {
    const [search, setSearch] = useState('');
    const q = useGetPurchaseOrderList({ limit: PAGE, offset: 0, search: search || undefined });
    const options = useMemo(() => asRows((q.data as any)?.data).map((r) => ({ value: r.id, label: labelOf(r, 'poNumber', 'orderNumber') })), [q.data]);
    return <Picker title="Purchase Order" options={options} value={p.value} onSelect={p.onSelect} onSearch={setSearch} isSearching={q.isFetching} disabled={p.disabled} />;
};

const SupplierInvoicePicker = (p: Omit<Props, 'sourceDocumentType'>) => {
    const [search, setSearch] = useState('');
    const q = useGetSupplierInvoiceList({ limit: PAGE, offset: 0, search: search || undefined });
    const options = useMemo(() => asRows((q.data as any)?.data).map((r) => ({ value: r.id, label: labelOf(r, 'invoiceNumber') })), [q.data]);
    return <Picker title="Supplier Invoice" options={options} value={p.value} onSelect={p.onSelect} onSearch={setSearch} isSearching={q.isFetching} disabled={p.disabled} />;
};

const DebtorInvoicePicker = (p: Omit<Props, 'sourceDocumentType'>) => {
    const [search, setSearch] = useState('');
    const q = useGetDebtorInvoicingOrders({ limit: PAGE, offset: 0, search: search || undefined });
    const options = useMemo(() => asRows((q.data as any)?.data).map((r) => ({ value: r.id, label: labelOf(r, 'invoiceNumber', 'orderNumber') })), [q.data]);
    return <Picker title="Debtor Invoice" options={options} value={p.value} onSelect={p.onSelect} onSearch={setSearch} isSearching={q.isFetching} disabled={p.disabled} />;
};

const GoodsReceivingPicker = (p: Omit<Props, 'sourceDocumentType'>) => {
    const [search, setSearch] = useState('');
    const q = useGetGoodsReceivingList({ limit: PAGE, offset: 0, search: search || undefined });
    const options = useMemo(() => asRows((q.data as any)?.data).map((r) => ({ value: r.id, label: labelOf(r, 'grvNumber', 'invoiceNumber', 'orderNumber') })), [q.data]);
    return <Picker title="Goods Receiving" options={options} value={p.value} onSelect={p.onSelect} onSearch={setSearch} isSearching={q.isFetching} disabled={p.disabled} />;
};

/**
 * The reference is always picked from the real documents of the chosen type,
 * never typed. Each picker only mounts (and fetches) for its own type.
 */
const SourceDocumentPicker = ({ sourceDocumentType, value, onSelect, disabled }: Props) => {
    const common = { value, onSelect, disabled };
    if (sourceDocumentType === 'PURCHASE_ORDER') return <PurchaseOrderPicker {...common} />;
    if (sourceDocumentType === 'SUPPLIER_INVOICE') return <SupplierInvoicePicker {...common} />;
    if (sourceDocumentType === 'DEBTOR_INVOICE') return <DebtorInvoicePicker {...common} />;
    if (sourceDocumentType === 'GOODS_RECEIVING') return <GoodsReceivingPicker {...common} />;
    return (
        <Picker
            title="Source Reference"
            options={[]}
            value={value}
            onSelect={onSelect}
            disabled={disabled || !sourceDocumentType}
        />
    );
};

export default SourceDocumentPicker;
