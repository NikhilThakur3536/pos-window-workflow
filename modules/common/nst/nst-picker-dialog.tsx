import { useEffect, useState } from 'react';
import moment from 'moment-timezone';
import { Check, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    getNSTOptionsForProduct,
    getStockDispositions,
    isSellableNST,
    type StockDisposition,
} from '@/api-queries/nst';

interface NSTPickerDialogProps {
    open: boolean;
    productId?: string;
    productName?: string;
    itemCode?: string;
    quantity?: number;
    selectedId?: string;
    // When true the picker lists every sellable discounted-stock allocation across all
    // products, which is how the POS adds a new discounted-stock line ("Add Discounted
    // Stock" button) instead of attaching one to an existing cart line.
    all?: boolean;
    inventoryScope: 'COMPANY' | 'STORE';
    companyDebtorId: string | null;
    onClose: () => void;
    onSelect: (disposition: StockDisposition) => void;
}

// Only opened when the cashier asks for the near-expiry option on a line, or picks one
// from the "Add Discounted Stock" action. A normal sale never calls stockDisposition/list,
// so this is the single place the POS does.
const NSTPickerDialog = ({
    open,
    productId,
    productName,
    itemCode,
    quantity = 1,
    selectedId,
    all = false,
    inventoryScope,
    companyDebtorId,
    onClose,
    onSelect,
}: NSTPickerDialogProps) => {
    const [rows, setRows] = useState<StockDisposition[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | undefined>(selectedId);
    const [search, setSearch] = useState('');
    // Debounced copy of the search box; only this drives the list request so typing does not
    // fire a call per keystroke.
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(handle);
    }, [search]);

    useEffect(() => {
        if (!open) {
            setSearch('');
            setDebouncedSearch('');
            return;
        }
        setActiveId(selectedId);
        setError(null);
        setIsLoading(true);
        let cancelled = false;

        if (inventoryScope === 'STORE' && !companyDebtorId) {
            setRows([]);
            setError('Store inventory is unavailable because this login has no authorised store assignment.');
            setIsLoading(false);
            return;
        }
        if (!all && !productId) {
            setRows([]);
            setError('Select a product before loading its discounted-stock allocations.');
            setIsLoading(false);
            return;
        }

        const isInRequestedScope = (disposition: StockDisposition) =>
            inventoryScope === 'COMPANY'
                ? disposition.companyDebtorId == null
                : disposition.companyDebtorId === companyDebtorId;
        const load = all
            ? getStockDispositions({
                  limit: 50,
                  offset: 0,
                  inventoryScope,
                  companyDebtorId,
                  status: 'ACTIVE',
                  approvalStatus: 'APPROVED',
                  ...(debouncedSearch ? { search: debouncedSearch } : {}),
              }).then((res) => (res?.data?.rows || []).filter((d) => isSellableNST(d) && isInRequestedScope(d)))
            : getNSTOptionsForProduct({
                  companyStockDetailId: productId || '',
                  inventoryScope,
                  companyDebtorId,
              }).then((dispositions) => dispositions.filter(isInRequestedScope));

        load.then((list) => {
            if (cancelled) return;
            setRows(list);
            if (!list.length) {
                setError(
                    all
                        ? debouncedSearch
                            ? 'No approved discounted stock matches your search.'
                            : 'No approved discounted stock is available to add right now.'
                        : 'No near-expiry allocation is available for this product.',
                );
            }
        })
            .catch((cause: unknown) => {
                if (!cancelled) {
                    const error = cause as { response?: { data?: { message?: string } }; message?: string };
                    setError(
                        error.response?.data?.message || error.message || 'Could not load discounted-stock allocations.',
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, productId, selectedId, all, debouncedSearch, inventoryScope, companyDebtorId]);

    const normalizedSearch = search.trim().toLowerCase();
    const visibleRows =
        all && normalizedSearch
            ? rows.filter((disposition) => {
                  const product = disposition.stockDetail || disposition.CompanyStockDetail;
                  return [product?.description, product?.itemCode].some((value) =>
                      value?.toLowerCase().includes(normalizedSearch),
                  );
              })
            : rows;
    const active = visibleRows.find((r) => r.id === activeId);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">{all ? 'Add Discounted Stock' : 'Near-expiry price'}</DialogTitle>
                </DialogHeader>

                <div className="text-muted-foreground text-xs">
                    {productName}
                    {itemCode ? ` (${itemCode})` : ''}
                    {quantity ? ` · basket qty ${quantity}` : ''}
                </div>

                {all && (
                    <div className="relative">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search discounted stock by product or item code..."
                            className="!pl-8"
                        />
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center gap-2 py-6 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Loading allocations...
                    </div>
                ) : (
                    <div className="max-h-[300px] space-y-2 overflow-auto">
                        {visibleRows.map((d) => {
                            const price = d.discountedUnitPrice ?? d.unitPrice ?? d.originalUnitPrice;
                            const short = (d.remainingQuantity ?? 0) < quantity;
                            const product = d.stockDetail || d.CompanyStockDetail;
                            return (
                                <div
                                    key={d.id}
                                    onClick={() => !short && setActiveId(d.id)}
                                    className={cn(
                                        'flex cursor-pointer items-center justify-between rounded-md border p-2 text-xs',
                                        activeId === d.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200',
                                        short && 'cursor-not-allowed opacity-50',
                                    )}
                                >
                                    <div className="space-y-0.5">
                                        {product && (
                                            <p className="font-semibold">
                                                {product.description || 'N/A'}
                                                {product.itemCode ? ` (${product.itemCode})` : ''}
                                            </p>
                                        )}
                                        <p className="font-semibold">
                                            {d.dispositionType?.replace(/_/g, ' ')}
                                            {d.batchNumber ? ` · Batch ${d.batchNumber}` : ''}
                                        </p>
                                        <p className="text-muted-foreground">
                                            {d.expiryDate
                                                ? `Expires ${moment(d.expiryDate).format('DD MMM, YY')}`
                                                : '—'}
                                            {' · '}Remaining {d.remainingQuantity ?? '—'}
                                            {d.dispositionNumber ? ` · ${d.dispositionNumber}` : ''}
                                            {d.reason ? ` · ${d.reason}` : ''}
                                        </p>
                                        {short && <p className="text-red-600">Not enough stock for this quantity</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">R{Number(price ?? 0).toFixed(2)}</span>
                                        {activeId === d.id && <Check className="h-4 w-4 text-blue-600" />}
                                    </div>
                                </div>
                            );
                        })}
                        {!visibleRows.length && (
                            <p className="text-muted-foreground py-6 text-center text-xs">
                                {normalizedSearch
                                    ? 'No approved discounted stock matches your search.'
                                    : 'No discounted-stock allocations are available.'}
                            </p>
                        )}
                    </div>
                )}

                {error && <p className="text-xs text-red-600">{error}</p>}

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" disabled={!active} onClick={() => active && onSelect(active)}>
                        Use this allocation
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default NSTPickerDialog;
