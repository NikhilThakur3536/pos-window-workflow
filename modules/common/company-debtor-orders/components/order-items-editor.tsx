'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { ProductSelection } from '../../hoc/product-selection';
import BarcodeScanner from '../../hoc/bar-code-scanner';
import { useNetworkStore } from '@/stores/network.store';
import type { CompanyDebtorOrderItem } from '@/api-queries/company-debtor-orders';

interface OrderItemsEditorProps {
    items: CompanyDebtorOrderItem[];
    onChange: (items: CompanyDebtorOrderItem[]) => void;
    companyDebtorId?: string;
    warehouseId?: string;
    skipDebtorProductFilter?: boolean;
    readonly?: boolean;
    showRejected?: boolean;
}

const OrderItemsEditor = ({
    items,
    onChange,
    companyDebtorId,
    warehouseId,
    skipDebtorProductFilter = false,
    readonly = false,
    showRejected = false,
}: OrderItemsEditorProps) => {
    const isOnline = useNetworkStore((state) => state?.online);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState('');

    const updateItem = (index: number, updates: Partial<CompanyDebtorOrderItem>) => {
        const next = items.map((item, i) =>
            i === index
                ? {
                      ...item,
                      ...updates,
                      lineTotal: (updates.quantity ?? item.quantity) * (updates.unitPrice ?? item.unitPrice),
                  }
                : item,
        );
        onChange(next);
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    type="button"
                    disabled={readonly || !companyDebtorId}
                    onClick={() => setIsItemDialogOpen(true)}
                >
                    + Select Product
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        {showRejected && <TableHead className="text-right">Rejected Qty</TableHead>}
                        <TableHead className="text-right">Line Total</TableHead>
                        {!readonly && <TableHead />}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={showRejected ? 5 : 4} className="py-8 text-center text-sm text-muted-foreground">
                                No items added yet.
                            </TableCell>
                        </TableRow>
                    )}
                    {items.map((item, index) => (
                        <TableRow key={item.id || `${item.companyStockDetailId}-${index}`}>
                            <TableCell>
                                <div>{item.description || item.itemCode || '—'}</div>
                                <div className="font-mono text-xs text-muted-foreground">
                                    {item.itemCode || item.barcode || '—'}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                {readonly ? (
                                    item.quantity
                                ) : (
                                    <Input
                                        type="number"
                                        min={0}
                                        className="h-7 w-20 text-right"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                                    />
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                {readonly ? (
                                    Number(item.unitPrice || 0).toFixed(2)
                                ) : (
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        className="h-7 w-24 text-right"
                                        value={item.unitPrice}
                                        onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || 0 })}
                                    />
                                )}
                            </TableCell>
                            {showRejected && (
                                <TableCell className="text-right">
                                    {readonly ? (
                                        item.rejectedQuantity ?? 0
                                    ) : (
                                        <Input
                                            type="number"
                                            min={0}
                                            className="h-7 w-20 text-right"
                                            value={item.rejectedQuantity ?? 0}
                                            onChange={(e) => updateItem(index, { rejectedQuantity: Number(e.target.value) || 0 })}
                                        />
                                    )}
                                </TableCell>
                            )}
                            <TableCell className="text-right font-mono tabular-nums">
                                {Number(item.lineTotal ?? item.quantity * item.unitPrice).toFixed(2)}
                            </TableCell>
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
                    ))}
                </TableBody>
            </Table>

            {/*
              Mounted only while the dialog is open and keyed on the warehouse, so every
              time it opens (or the warehouse changes) it starts fresh and the products
              request is made again with the current warehouseId.
            */}
            {isItemDialogOpen && (
                <ProductSelection
                    key={warehouseId || 'default'}
                    isOpen={isItemDialogOpen}
                    onClose={() => setIsItemDialogOpen(false)}
                    companyDebtorId={skipDebtorProductFilter ? null : companyDebtorId}
                    warehouseId={warehouseId || undefined}
                    isOnline={isOnline}
                    scannedBarcode={scannedBarcode}
                    setScannedBarcode={setScannedBarcode}
                    onSelectProduct={(product, price, scannedBaseQuantity = 1) => {
                        const unitPrice = price ? price.priceInclusive || price.priceExclusive : 0;
                        const quantity = Math.max(1, Number(scannedBaseQuantity) || 1);
                        const existing = items.findIndex((i) => i.companyStockDetailId === product.id);
                        if (existing !== -1) {
                            updateItem(existing, { quantity: items[existing].quantity + quantity });
                        } else {
                            onChange([
                                ...items,
                                {
                                    companyStockDetailId: product.id,
                                    description: product.description,
                                    itemCode: product.itemCode,
                                    quantity,
                                    unitPrice,
                                    lineTotal: unitPrice * quantity,
                                },
                            ]);
                        }
                        setIsItemDialogOpen(false);
                    }}
                />
            )}
            <BarcodeScanner
                onScan={(barcode) => {
                    setScannedBarcode(String(barcode).trim());
                    setIsItemDialogOpen(true);
                }}
                active={!readonly && !!companyDebtorId}
            />
        </div>
    );
};

export default OrderItemsEditor;