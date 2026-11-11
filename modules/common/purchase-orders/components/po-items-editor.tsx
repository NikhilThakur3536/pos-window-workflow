'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { ProductSelection } from '../../hoc/product-selection';
import { useNetworkStore } from '@/stores/network.store';
import type { PurchaseOrderItem } from '@/api-queries/purchase-orders';

interface POItemsEditorProps {
    items: PurchaseOrderItem[];
    onChange: (items: PurchaseOrderItem[]) => void;
    readonly?: boolean;
    showQualityNotes?: boolean;
}

const POItemsEditor = ({
    items,
    onChange,
    readonly = false,
    showQualityNotes = false,
}: POItemsEditorProps) => {
    const isOnline = useNetworkStore((state) => state?.online);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

    const updateItem = (index: number, updates: Partial<PurchaseOrderItem>) => {
        onChange(items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            {!readonly && (
                <div className="flex justify-end">
                    <Button variant="outline" type="button" onClick={() => setIsItemDialogOpen(true)}>
                        + Select Product
                    </Button>
                </div>
            )}

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Disc %</TableHead>
                        <TableHead className="text-right">Tax %</TableHead>
                        <TableHead className="text-right">Line Total</TableHead>
                        {showQualityNotes && <TableHead>Quality Notes</TableHead>}
                        {!readonly && <TableHead />}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={showQualityNotes ? 8 : 7} className="py-8 text-center text-sm text-muted-foreground">
                                No items added yet.
                            </TableCell>
                        </TableRow>
                    )}
                    {items.map((item, index) => {
                        const lineTotal =
                            (item.orderedQuantity || 0) *
                            (item.agreedUnitCost || 0) *
                            (1 - (item.discountPercentage || 0) / 100);
                        return (
                            <TableRow key={item.purchaseOrderItemId || `${item.companyStockDetailId}-${index}`}>
                                <TableCell>
                                    <div>{item.description || item.skuCode || item.companyStockDetailId}</div>
                                    <div className="font-mono text-xs text-muted-foreground">
                                        {item.skuCode || item.companyStockDetailId}
                                        {item.uom ? ` (${item.uom})` : ''}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {readonly ? (
                                        item.barcode || '—'
                                    ) : (
                                        <Input
                                            className="h-7 w-36 font-mono text-xs"
                                            value={item.barcode || ''}
                                            placeholder="Optional"
                                            onChange={(e) => updateItem(index, { barcode: e.target.value })}
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {readonly ? (
                                        item.orderedQuantity
                                    ) : (
                                        <Input
                                            type="number"
                                            min={0}
                                            className="h-7 w-20 text-right"
                                            value={item.orderedQuantity}
                                            onChange={(e) =>
                                                updateItem(index, { orderedQuantity: Number(e.target.value) || 0 })
                                            }
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {readonly ? (
                                        Number(item.agreedUnitCost || 0).toFixed(2)
                                    ) : (
                                        <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            className="h-7 w-24 text-right"
                                            value={item.agreedUnitCost}
                                            onChange={(e) =>
                                                updateItem(index, { agreedUnitCost: Number(e.target.value) || 0 })
                                            }
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {readonly ? (
                                        `${item.discountPercentage || 0}%`
                                    ) : (
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.01}
                                            className="h-7 w-20 text-right"
                                            value={item.discountPercentage || 0}
                                            onChange={(e) =>
                                                updateItem(index, { discountPercentage: Number(e.target.value) || 0 })
                                            }
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {readonly ? (
                                        item.taxPercentage || 0
                                    ) : (
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.01}
                                            className="h-7 w-20 text-right"
                                            value={item.taxPercentage || 0}
                                            onChange={(e) =>
                                                updateItem(index, { taxPercentage: Number(e.target.value) || 0 })
                                            }
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums">
                                    {lineTotal.toFixed(2)}
                                </TableCell>
                                {showQualityNotes && (
                                    <TableCell>
                                        {readonly ? (
                                            item.qualityNotes || '-'
                                        ) : (
                                            <Input
                                                className="h-7 text-xs"
                                                value={item.qualityNotes || ''}
                                                onChange={(e) => updateItem(index, { qualityNotes: e.target.value })}
                                            />
                                        )}
                                    </TableCell>
                                )}
                                {!readonly && (
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            type="button"
                                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                            onClick={() => removeItem(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <ProductSelection
                isOpen={isItemDialogOpen}
                onClose={() => setIsItemDialogOpen(false)}
                isOnline={isOnline}
                onSelectProduct={(product) => {
                    const existing = items.findIndex((i) => i.companyStockDetailId === product.id);
                    if (existing !== -1) {
                        updateItem(existing, { orderedQuantity: items[existing].orderedQuantity + 1 });
                    } else {
                        onChange([
                            ...items,
                            {
                                companyStockDetailId: product.id,
                                description: product.description,
                                skuCode: product.itemCode,
                                barcode: product.barcode || '',
                                orderedQuantity: 1,
                                agreedUnitCost: product?.costTypes?.latestCost || 0,
                                discountPercentage: 0,
                                taxPercentage: product.subCategory?.taxRate?.taxRatePercent || 0,
                                companyTaxRateId: product.companyTaxRateId || '',
                            },
                        ]);
                    }
                    setIsItemDialogOpen(false);
                }}
            />
        </div>
    );
};

export default POItemsEditor;
