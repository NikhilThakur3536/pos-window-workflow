'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/custom-components/PageLoader';
import MultiSelectPopover from '@/components/multi-select-popover';
import { useCompanyStockDetailsList, type StockDetails } from '@/api-queries/company/stock-details';
import {
    useGetPurchaseOrderProductHistory,
    type PurchaseOrderProductHistoryRow,
} from '@/api-queries/purchase-orders';
import moment from 'moment';

interface ProductHistoryDialogProps {
    open: boolean;
    onClose: () => void;
}

const ProductHistoryDialog = ({ open, onClose }: ProductHistoryDialogProps) => {
    const [productIds, setProductIds] = useState<string[]>([]);

    const stockListQuery = useCompanyStockDetailsList({ limit: 1000, offset: 0, status: 'ACTIVE' });
    const products: StockDetails[] =
        (stockListQuery?.data as { data?: { rows?: StockDetails[] } } | undefined)?.data?.rows || [];

    const historyQuery = useGetPurchaseOrderProductHistory({ productIds });
    const rows: PurchaseOrderProductHistoryRow[] = historyQuery?.data?.data || [];

    function onOpenChange(next: boolean) {
        if (!next) {
            setProductIds([]);
            onClose();
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[860px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Product Purchase History</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <MultiSelectPopover
                            title="Select products"
                            selectedValue={productIds}
                            onSelect={setProductIds}
                            options={products.map((p) => ({
                                label: `${p.itemCode} — ${p.description}`,
                                value: p.id,
                            }))}
                        />
                        {productIds.length > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                                {rows.length} product(s) with purchase history - up to the last 2 GRV purchases shown per product.
                            </span>
                        )}
                    </div>

                    <PageLoader isLoading={historyQuery.isFetching}>
                        {productIds.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                Select one or more products to view their recent GRV purchase history.
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                No purchase history found for the selected product(s).
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {rows.map((row) => {
                                    const recent = row.recentPurchases || [];
                                    const product = products.find((p) => p.id === row.companyStockDetailId);
                                    return (
                                        <div key={row.companyStockDetailId} className="rounded-md border border-gray-300 bg-white p-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="font-medium">
                                                    {product ? `${product.itemCode} — ${product.description}` : row.companyStockDetailId}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {row.totalPurchaseCount != null ? `Total purchases: ${row.totalPurchaseCount} · ` : ''}
                                                    {row.averagePurchasePrice != null ? `Avg unit cost: R ${Number(row.averagePurchasePrice).toFixed(2)}` : ''}
                                                    {row.lowestPurchasePrice != null ? ` · Low: R ${Number(row.lowestPurchasePrice).toFixed(2)}` : ''}
                                                    {row.highestPurchasePrice != null ? ` · High: R ${Number(row.highestPurchasePrice).toFixed(2)}` : ''}
                                                </div>
                                            </div>

                                            <div className="mt-1 overflow-hidden rounded border border-gray-200">
                                                <table className="w-full text-left text-[10px]">
                                                    <thead>
                                                        <tr className="bg-gray-100">
                                                            <th className="px-2 py-1">GRV</th>
                                                            <th className="px-2 py-1">Supplier</th>
                                                            <th className="px-2 py-1">Date</th>
                                                            <th className="px-2 py-1 text-right">Unit Cost</th>
                                                            <th className="px-2 py-1 text-right">Qty</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {recent.length === 0 && (
                                                            <tr>
                                                                <td colSpan={5} className="px-2 py-2 text-muted-foreground">
                                                                    No recorded GRV purchases.
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {recent.map((p, i) => (
                                                            <tr key={String(p.grvNumber || `${row.companyStockDetailId}-${i}`)} className="border-t">
                                                                <td className="px-2 py-1 font-mono">{p.grvNumber || '—'}</td>
                                                                <td className="px-2 py-1">{p.supplierName || '—'}</td>
                                                                <td className="px-2 py-1">
                                                                    {p.purchaseDate ? moment(p.purchaseDate).format('DD MMM YYYY') : '—'}
                                                                </td>
                                                                <td className="px-2 py-1 text-right font-mono">
                                                                    {p.purchasePrice != null ? `R ${Number(p.purchasePrice).toFixed(2)}` : '—'}
                                                                </td>
                                                                <td className="px-2 py-1 text-right">{p.quantity ?? '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {row.secondLastPurchasePrice != null && (
                                                <div className="mt-1 text-[10px] text-muted-foreground">
                                                    Transaction before last:{' '}
                                                    <span className="font-semibold text-gray-700">
                                                        R {Number(row.secondLastPurchasePrice).toFixed(2)}
                                                    </span>
                                                    {row.secondLastSupplierName ? ` from ${row.secondLastSupplierName}` : ''}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </PageLoader>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProductHistoryDialog;