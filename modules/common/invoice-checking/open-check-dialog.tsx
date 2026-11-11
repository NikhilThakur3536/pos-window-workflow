'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SelectPopover from '@/components/select-popover';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, SearchCheck } from 'lucide-react';
import {
    useOpenInvoiceCheck,
    useValidateInvoiceSource,
    type InvoiceCheckDirection,
    type OpenInvoiceCheckInput,
    INVOICE_SOURCE_DOCUMENT_TYPES,
} from '@/api-queries/invoice-checking';
import { useDebtorList } from '@/api-queries/debtor';
import { useCreditorList } from '@/api-queries/creditor';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { useGetCheckingTemplate } from '@/api-queries/company-debtor-orders';
import { ProductSelection } from '@/modules/common/hoc/product-selection';
import BarcodeScanner from '@/modules/common/hoc/bar-code-scanner';
import type { StockDetails } from '@/api-queries/company/stock-details';
import { useNetworkStore } from '@/stores/network.store';
import SourceDocumentSelect, { SOURCE_DOCUMENT_LIST_TYPES, toApiSourceDocumentType } from './source-document-select';

interface OpenItem {
    companyStockDetailId: string;
    itemCode?: string;
    description?: string;
    expectedQuantity: number;
    expectedUnitPrice?: number;
    batchNumber?: string;
    expiryDate?: string;
}

interface OpenInvoiceCheckDialogProps {
    open: boolean;
    onClose: () => void;
}

const OpenInvoiceCheckDialog = ({ open, onClose }: OpenInvoiceCheckDialogProps) => {
    const isOnline = useNetworkStore((state) => state?.online);

    const { data: debtorRes } = useDebtorList({ limit: 1000, offset: 0 });
    const { data: creditorRes } = useCreditorList({ limit: 1000, offset: 0 });
    const { data: warehouseRes } = useGetWarehouses({ limit: 100 });

    const debtors = debtorRes?.data?.rows || [];
    const creditors = creditorRes?.data?.rows || [];
    //@ts-ignore
    const warehouses = warehouseRes?.data?.rows || [];

    const openMutation = useOpenInvoiceCheck();
    const validateMutation = useValidateInvoiceSource();
    const checkingTemplateMutation = useGetCheckingTemplate();

    const [sourceDocumentType, setSourceDocumentType] = useState<string>('GRV');
    const [sourceDocumentId, setSourceDocumentId] = useState('');
    const [sourceDocumentNumber, setSourceDocumentNumber] = useState('');
    const [direction, setDirection] = useState<InvoiceCheckDirection>('INCOMING');
    const [companyDebtorId, setCompanyDebtorId] = useState('');
    const [companyCreditorId, setCompanyCreditorId] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<OpenItem[]>([]);
    const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [isPending, setIsPending] = useState(false);

    const totalQuantity = useMemo(() => items.reduce((sum, it) => sum + (it.expectedQuantity || 0), 0), [items]);

    const handleSelectProduct = (product: StockDetails, scannedBaseQuantity = 1) => {
        setIsProductSelectionOpen(false);
        const quantity = Math.max(1, Number(scannedBaseQuantity) || 1);
        const existingIndex = items.findIndex((it) => it.companyStockDetailId === product.id);
        if (existingIndex !== -1) {
            if (!scannedBarcode) {
                toast.error('This item is already on the check.');
                return;
            }
            setItems((current) =>
                current.map((item, index) =>
                    index === existingIndex
                        ? { ...item, expectedQuantity: (item.expectedQuantity || 0) + quantity }
                        : item,
                ),
            );
            setScannedBarcode('');
            return;
        }
        setItems((prev) => [
            ...prev,
            {
                companyStockDetailId: product.id,
                itemCode: product.itemCode,
                description: product.description,
                expectedQuantity: quantity,
                expectedUnitPrice: 0,
            },
        ]);
        setScannedBarcode('');
    };

    const updateItem = (index: number, patch: Partial<OpenItem>) => {
        setItems((prev) => prev.map((it, idx) => (idx === index ? { ...it, ...patch } : it)));
    };

    const removeItem = (index: number) => {
        setItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    const resetState = () => {
        setSourceDocumentType('GRV');
        setSourceDocumentId('');
        setSourceDocumentNumber('');
        setDirection('INCOMING');
        setCompanyDebtorId('');
        setCompanyCreditorId('');
        setWarehouseId('');
        setNotes('');
        setItems([]);
    };

    const applyTemplateItems = (data?: {
        sourceDocumentNumber?: string;
        warehouseId?: string | null;
        companyDebtorId?: string | null;
        items?: Array<{
            companyStockDetailId?: string;
            description?: string;
            expectedQuantity?: number;
            expectedUnitPrice?: number;
            batchNumber?: string;
            expiryDate?: string;
        }> | null;
    }) => {
        if (!data) return;
        if (data.sourceDocumentNumber) setSourceDocumentNumber(data.sourceDocumentNumber);
        if (data.warehouseId) setWarehouseId(data.warehouseId);
        if (data.companyDebtorId) setCompanyDebtorId(data.companyDebtorId);
        if (!Array.isArray(data.items) || !data.items.length) {
            toast.success('Source document validated');
            return;
        }
        setItems(
            data.items.map((it) => ({
                companyStockDetailId: it.companyStockDetailId || '',
                description: it.description || '',
                expectedQuantity: it.expectedQuantity || 1,
                expectedUnitPrice: it.expectedUnitPrice || 0,
                ...(it.batchNumber ? { batchNumber: it.batchNumber } : {}),
                ...(it.expiryDate ? { expiryDate: it.expiryDate } : {}),
            })),
        );
        toast.success('Source document items loaded');
    };

    // Store orders read their expected lines from companyDebtorOrder/checking-template;
    // every other type uses invoiceChecking/validate-source.
    const handleLoadSourceLines = (documentId: string) => {
        if (sourceDocumentType === 'SALES_ORDER') {
            checkingTemplateMutation.mutate(
                {
                    saleOrderId: documentId,
                    ...(companyDebtorId ? { companyDebtorId } : {}),
                    direction: direction === 'INCOMING' ? 'INCOMING' : 'OUTGOING',
                },
                {
                    onSuccess: (res) => {
                        if (res?.success && res.data) {
                            applyTemplateItems(res.data);
                        } else {
                            toast.error(res?.message || 'Could not load the sales order');
                        }
                    },
                    onError: (error: any) => {
                        toast.error(error?.response?.data?.message || 'Could not load the sales order');
                    },
                },
            );
            return;
        }
        validateMutation.mutate(
            { sourceDocumentType, sourceDocumentId: documentId },
            {
                onSuccess: (res) => {
                    if (res?.success) {
                        const data = res.data;
                        if (data?.notes) setNotes(data.notes);
                        applyTemplateItems(data);
                    } else {
                        toast.error(res?.message || 'Validation failed');
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Validation failed');
                },
            },
        );
    };

    const handleSuccess = (data: { success: boolean; message?: string }) => {
        if (data?.success) {
            toast.success(`Invoice check opened (${sourceDocumentType})`);
            resetState();
            onClose();
        } else {
            toast.error(data?.message || 'Failed to open invoice check');
        }
    };

    const handleSubmit = () => {
        if (!sourceDocumentType) return toast.error('Select a source document type');
        if (!items.length) return toast.error('Add at least one product');
        if (items.some((it) => !it.expectedQuantity || it.expectedQuantity < 1))
            return toast.error('Expected quantity must be at least 1');

        const payload: OpenInvoiceCheckInput = {
            clientDocumentId:
                typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `IC-${Date.now()}`,
            sourceDocumentType: toApiSourceDocumentType(sourceDocumentType),
            ...(sourceDocumentId ? { sourceDocumentId } : {}),
            ...(sourceDocumentNumber ? { sourceDocumentNumber } : {}),
            direction,
            ...(companyDebtorId ? { companyDebtorId } : {}),
            ...(companyCreditorId ? { companyCreditorId } : {}),
            ...(warehouseId ? { warehouseId } : {}),
            ...(notes ? { notes } : {}),
            items: items.map((it) => ({
                companyStockDetailId: it.companyStockDetailId,
                expectedQuantity: it.expectedQuantity,
                ...(it.expectedUnitPrice ? { expectedUnitPrice: it.expectedUnitPrice } : {}),
                ...(it.batchNumber ? { batchNumber: it.batchNumber } : {}),
                ...(it.expiryDate ? { expiryDate: it.expiryDate } : {}),
            })),
        };

        setIsPending(true);
        openMutation
            .mutateAsync(payload)
            .then((data) => {
                setIsPending(false);
                handleSuccess(data);
            })
            .catch((error) => {
                setIsPending(false);
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            });
    };

    const handleOpenChange = (next: boolean) => {
        if (!next && !isPending) {
            resetState();
            onClose();
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Open Invoice Check</DialogTitle>
                        <DialogDescription>
                            Start a new invoice-checking session from a source document. The received goods are counted
                            (checked), discrepancies are resolved and the session is approved by a manager before the
                            goods are accepted.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <Label className="text-sm font-medium">Source Document Type</Label>
                                <Select value={sourceDocumentType} onValueChange={setSourceDocumentType}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INVOICE_SOURCE_DOCUMENT_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type === 'GRV'
                                                    ? 'GRV / Goods Received'
                                                    : type
                                                          .split('_')
                                                          .map((w) => w[0] + w.slice(1).toLowerCase())
                                                          .join(' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <SourceDocumentSelect
                                    sourceDocumentType={sourceDocumentType}
                                    companyDebtorId={companyDebtorId || undefined}
                                    companyCreditorId={companyCreditorId || undefined}
                                    disabled={isPending}
                                    value={sourceDocumentId}
                                    onSelect={(option) => {
                                        setSourceDocumentId(option?.id || '');
                                        setSourceDocumentNumber(option?.number || '');
                                        setItems([]);
                                        setNotes('');
                                        // the picked document is known good, so pull its lines right away
                                        if (option?.id) handleLoadSourceLines(option.id);
                                    }}
                                />
                                {!SOURCE_DOCUMENT_LIST_TYPES.includes(sourceDocumentType) && (
                                    <div className="mt-1">
                                        <Input
                                            placeholder="e.g. DN-000123"
                                            value={sourceDocumentId}
                                            onChange={(e) => {
                                                setSourceDocumentId(e.target.value);
                                                setItems([]);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Direction</Label>
                                <Select
                                    value={direction}
                                    onValueChange={(value) => setDirection(value as InvoiceCheckDirection)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select direction" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INCOMING">Incoming</SelectItem>
                                        <SelectItem value="OUTGOING">Outgoing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex flex-wrap items-end gap-3">
                                <div>
                                    <Label className="text-sm font-medium">Store (Debtor)</Label>
                                    <div className="mt-1 w-56">
                                        <SelectPopover
                                            title="Store"
                                            onlyTitle="Select store"
                                            selectedValue={companyDebtorId || ''}
                                            options={debtors.map((d) => ({
                                                label: String(
                                                    `${d.name || d.tradingAs || d.id || ''}${d.accountNumber ? ` (${d.accountNumber})` : ''}`,
                                                ),
                                                value: d.id,
                                            }))}
                                            onSelect={(value) => setCompanyDebtorId(String(value || ''))}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Supplier (Creditor)</Label>
                                    <div className="mt-1 w-56">
                                        <SelectPopover
                                            title="Supplier"
                                            onlyTitle="Select supplier"
                                            selectedValue={companyCreditorId || ''}
                                            options={creditors.map((c) => ({
                                                label: String(c.name || c.tradingAs || c.id || ''),
                                                value: c.id,
                                            }))}
                                            onSelect={(value) => setCompanyCreditorId(String(value || ''))}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Warehouse</Label>
                                    <div className="mt-1 w-52">
                                        <SelectPopover
                                            title="Warehouse"
                                            onlyTitle="Select warehouse"
                                            selectedValue={warehouseId || ''}
                                            options={warehouses.map((w: any) => ({
                                                label: String(
                                                    (
                                                        w.warehouse ||
                                                        w.description ||
                                                        w.name ||
                                                        w.code ||
                                                        w.id ||
                                                        ''
                                                    ).trim(),
                                                ),
                                                value: w.id,
                                            }))}
                                            onSelect={(value) => setWarehouseId(String(value || ''))}
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleLoadSourceLines(sourceDocumentId)}
                                    disabled={validateMutation.isPending || checkingTemplateMutation.isPending}
                                >
                                    {validateMutation.isPending || checkingTemplateMutation.isPending ? (
                                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                    ) : (
                                        <SearchCheck className="mr-1 h-4 w-4" />
                                    )}
                                    Validate Source
                                </Button>
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-medium">Notes</Label>
                            <Input
                                className="mt-1"
                                placeholder="Optional notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Button variant="outline" size="sm" onClick={() => setIsProductSelectionOpen(true)}>
                                <Plus className="mr-1 h-4 w-4" /> Add Product
                            </Button>
                            <span className="text-muted-foreground text-sm">
                                {items.length} line(s) · {totalQuantity} expected unit(s)
                            </span>
                        </div>

                        {items.length ? (
                            <div className="max-h-[38vh] overflow-y-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="text-muted-foreground border-b text-xs">
                                        <tr className="text-left">
                                            <th className="p-2">Code</th>
                                            <th className="p-2">Description</th>
                                            <th className="p-2 text-right">Exp. Qty</th>
                                            <th className="p-2 text-right">Exp. Price</th>
                                            <th className="p-2">Batch No.</th>
                                            <th className="p-2">Expiry</th>
                                            <th className="p-2 text-center">Remove</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((it, index) => (
                                            <tr key={it.companyStockDetailId} className="border-b align-top">
                                                <td className="p-2 font-mono text-xs">{it.itemCode}</td>
                                                <td className="max-w-[200px] truncate p-2">{it.description}</td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        className="h-8 w-20 text-right"
                                                        value={it.expectedQuantity || ''}
                                                        onChange={(e) =>
                                                            updateItem(index, {
                                                                expectedQuantity: Number(e.target.value) || 0,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        className="h-8 w-24 text-right"
                                                        value={it.expectedUnitPrice ?? ''}
                                                        onChange={(e) =>
                                                            updateItem(index, {
                                                                expectedUnitPrice: Number(e.target.value) || 0,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        className="h-8 w-28"
                                                        value={it.batchNumber || ''}
                                                        onChange={(e) =>
                                                            updateItem(index, { batchNumber: e.target.value })
                                                        }
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="date"
                                                        className="h-8 w-36"
                                                        value={it.expiryDate || ''}
                                                        onChange={(e) =>
                                                            updateItem(index, { expiryDate: e.target.value })
                                                        }
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                resetState();
                                onClose();
                            }}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={handleSubmit}
                            disabled={isPending || openMutation.isPending}
                        >
                            {isPending || openMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Opening…
                                </>
                            ) : (
                                'Open Check'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isProductSelectionOpen && (
                <ProductSelection
                    isOpen={isProductSelectionOpen}
                    onClose={() => {
                        setIsProductSelectionOpen(false);
                        setScannedBarcode('');
                    }}
                    onSelectProduct={(product, _price, scannedBaseQuantity) =>
                        handleSelectProduct(product, scannedBaseQuantity)
                    }
                    warehouseId={warehouseId || undefined}
                    isOnline={isOnline}
                    scannedBarcode={scannedBarcode}
                    setScannedBarcode={setScannedBarcode}
                    isGRV
                />
            )}
            <BarcodeScanner
                onScan={(barcode) => {
                    setScannedBarcode(String(barcode).trim());
                    setIsProductSelectionOpen(true);
                }}
                active={open}
            />
        </>
    );
};

export default OpenInvoiceCheckDialog;
