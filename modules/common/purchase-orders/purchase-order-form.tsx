'use client';

import { useEffect, useMemo, useRef } from 'react';
import moment from 'moment-timezone';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import SelectPopover from '@/components/select-popover';
import { cleanDataPayload } from '@/utils/helpers';
import {
    DELIVERY_CYCLES,
    PurchaseOrderCreateSchema,
    purchaseOrderCreateSchema,
    useCreatePurchaseOrder,
    useGetPurchaseOrderProductHistory,
    type PurchaseOrderProductHistoryRow,
} from '@/api-queries/purchase-orders';
import {
    useGetSupplierQuotationList,
    useGetSupplierQuotationById,
    type SupplierQuotationDetails,
} from '@/api-queries/supplier-quotations';
import {
    useGetPurchaseRequestList,
    useGetPurchaseRequestById,
    type PurchaseRequestDetails,
} from '@/api-queries/purchase-requests';
import { useCreditorList } from '@/api-queries/creditor';
import { useGetWarehouses, type WarehouseDetails } from '@/api-queries/warehouse';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import POItemsEditor from './components/po-items-editor';

interface PurchaseOrderFormProps {
    open: boolean;
    onClose: () => void;
}

const PurchaseOrderForm = ({ open, onClose }: PurchaseOrderFormProps) => {
    const suppliers = useCreditorList({})?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 1000, offset: 0 });
    const warehouses: WarehouseDetails[] = Array.isArray(warehousesRes?.data?.data)
        ? (warehousesRes.data.data as WarehouseDetails[])
        : (((warehousesRes?.data?.data as unknown as { rows?: WarehouseDetails[] } | undefined)?.rows || []) as WarehouseDetails[]);

    const createItemData = useCreatePurchaseOrder();

    const stockListQuery = useCompanyStockDetailsList({ limit: 1000, offset: 0, pricing: false });
    const stockRows = stockListQuery?.data?.data?.rows || [];
    const stockMap = useMemo(() => {
        const m: Record<string, { companyTaxRateId?: string; taxRatePercent?: number; unitCode?: string }> = {};
        for (const s of stockRows) {
            m[s.id] = {
                companyTaxRateId: s.companyTaxRateId || '',
                taxRatePercent: s.subCategory?.taxRate?.taxRatePercent,
                unitCode: s.unitCode,
            };
        }
        return m;
    }, [stockRows]);

    const form = useForm<PurchaseOrderCreateSchema>({
        resolver: zodResolver(purchaseOrderCreateSchema),
        defaultValues: {
            companyCreditorId: '',
            purchaseRequestId: '',
            supplierQuotationId: '',
            warehouseId: '',
            expectedDeliveryDate: '',
            deliveryCycle: '',
            paymentTerms: '',
            notes: '',
            qualityNotes: '',
            items: [],
            timezone: moment.tz.guess(),
        },
    });

    const { handleSubmit, control, setValue } = form;
    const watchedItems = useWatch({ control, name: 'items' }) || [];

    // Supplier-first: load OPEN PRs (filtered to the supplier's candidate list) and
    // RECEIVED quotations belonging to the selected supplier.
    const selectedSupplierId = useWatch({ control, name: 'companyCreditorId' }) || '';
    const selectedPrId = useWatch({ control, name: 'purchaseRequestId' }) || '';
    const selectedSqId = useWatch({ control, name: 'supplierQuotationId' }) || '';

    const prListQuery = useGetPurchaseRequestList({
        limit: 200,
        offset: 0,
        status: 'OPEN',
        companyCreditorId: selectedSupplierId || undefined,
    });
    const supplierPrs: PurchaseRequestDetails[] = prListQuery?.data?.data || [];

    const sqListQuery = useGetSupplierQuotationList({
        limit: 200,
        offset: 0,
        status: 'RECEIVED',
        companyCreditorId: selectedSupplierId || undefined,
    });
    const supplierQuotes: SupplierQuotationDetails[] = selectedSupplierId ? (sqListQuery?.data?.data || []) : [];

    const prByIdQuery = useGetPurchaseRequestById(selectedPrId);
    const sqByIdQuery = useGetSupplierQuotationById(selectedSqId);
    const loadedSourceRef = useRef('');

    // Auto-fill PO items from the selected source document (PR or Quotation).
    useEffect(() => {
        const hasStock = Object.keys(stockMap).length > 0;
        const sourceKey = `${selectedPrId || ''}::${selectedSqId || ''}::${hasStock}`;
        if (!sourceKey || sourceKey === '::false' || loadedSourceRef.current === sourceKey) return;

        if (selectedPrId && prByIdQuery.data?.data) {
            const pr = prByIdQuery.data.data;
            const prItems = pr.items || pr.PurchaseRequestItems || [];
            loadedSourceRef.current = sourceKey;
            if (prItems.length > 0) {
                const mapped = prItems
                    .filter((pi) => pi.companyStockDetailId)
                    .map((pi) => {
                        const tax = stockMap[pi.companyStockDetailId];
                        return {
                            companyStockDetailId: pi.companyStockDetailId,
                            purchaseRequestItemId: pi.id || pi.purchaseRequestItemId || '',
                            skuCode: pi.skuCode,
                            description: pi.description,
                            uom: pi.uom || tax?.unitCode || '',
                            orderedQuantity: Number(pi.requestedQuantity) || 1,
                            agreedUnitCost: Number(pi.estimatedUnitCost) || 0,
                            discountPercentage: 0,
                            taxPercentage: Number(tax?.taxRatePercent) || 0,
                            companyTaxRateId: tax?.companyTaxRateId || '',
                        };
                    });
                setValue('items', mapped, { shouldValidate: true });
            }
        } else if (selectedSqId && sqByIdQuery.data?.data) {
            const sq = sqByIdQuery.data.data;
            const sqItems = sq.items || sq.SupplierQuotationItems || [];
            loadedSourceRef.current = sourceKey;
            if (sqItems.length > 0) {
                const mapped = sqItems
                    .filter((i) => i.companyStockDetailId)
                    .map((i) => {
                        const tax = stockMap[i.companyStockDetailId as string];
                        const stock = i.CompanyStockDetail;
                        const pri = i.PurchaseRequestItem;
                        const sqTax = i.CompanyTaxRate;
                        return {
                            companyStockDetailId: i.companyStockDetailId as string,
                            supplierQuotationItemId: i.id || i.supplierQuotationItemId || '',
                            skuCode: stock?.itemCode || stock?.companyItemCode || i.skuCode || '',
                            description: stock?.description || i.description || pri?.description || '',
                            uom: stock?.unitCode || pri?.uom || tax?.unitCode || '',
                            orderedQuantity: Number(i.quotedQuantity) || Number(pri?.requestedQuantity) || 1,
                            agreedUnitCost: Number(i.quotedUnitPrice) || Number(pri?.estimatedUnitCost) || 0,
                            discountPercentage: Number(i.discountPct) || 0,
                            taxPercentage:
                                Number(i.taxPct) ||
                                Number(sqTax?.taxRatePercent) ||
                                Number(tax?.taxRatePercent) ||
                                0,
                            companyTaxRateId:
                                i.companyTaxRateId || sqTax?.id || tax?.companyTaxRateId || '',
                        };
                    });
                setValue('items', mapped, { shouldValidate: true });
            }
        }
    }, [selectedPrId, selectedSqId, prByIdQuery.data, sqByIdQuery.data, setValue, stockMap]);

    const historyProductIds = watchedItems.map((i) => i.companyStockDetailId).filter(Boolean);
    const historyQuery = useGetPurchaseOrderProductHistory({ productIds: historyProductIds });
    const historyRows: PurchaseOrderProductHistoryRow[] =
        (historyQuery?.data as { data?: PurchaseOrderProductHistoryRow[] } | undefined)?.data || [];

    function onSubmit(values: PurchaseOrderCreateSchema) {
        const payload = cleanDataPayload(values);

        createItemData.mutate(payload as PurchaseOrderCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Purchase Order created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Purchase Order creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    function onOpenChange() {
        form.reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[860px] overflow-hidden"
                style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 0.5rem)' }}
            >
                <DialogHeader>
                    <DialogTitle className="font-semibold">Add New Purchase Order</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                    >
                        <div className="min-h-0 flex-1 overflow-auto">
                            <div className="grid grid-cols-2 items-start gap-3">
                                <FormField
                                    control={control}
                                    name="companyCreditorId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Supplier <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={(suppliers || []).map((data) => ({
                                                        label: `${data.name} (${data.accountNumber})`,
                                                        value: data.id,
                                                    }))}
                                                    title="Supplier"
                                                    selectedValue={field.value}
                                                    onSelect={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="purchaseRequestId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">From Purchase Request (optional)</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={supplierPrs.map((pr) => ({
                                                        label: `${pr.clientDocumentId || pr.documentNumber || pr.id?.slice(0, 8)} - ${pr.status}`,
                                                        value: pr.id,
                                                    }))}
                                                    title="Purchase Request"
                                                    selectedValue={field.value}
                                                    onSelect={(val) => {
                                                        field.onChange(val);
                                                        setValue('supplierQuotationId', '');
                                                        loadedSourceRef.current = '';
                                                    }}
                                                />
                                            </FormControl>
                                            {!selectedSupplierId && (
                                                <div className="text-[10px] text-muted-foreground">Select a supplier to load its open purchase requests.</div>
                                            )}
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="supplierQuotationId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">From Supplier Quotation (optional)</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={supplierQuotes.map((sq) => ({
                                                        label: `${sq.quotationNumber || sq.id?.slice(0, 8)} - ${sq.validUntil ? `valid till ${sq.validUntil}` : 'RECEIVED'}`,
                                                        value: sq.id,
                                                    }))}
                                                    title="Supplier Quotation"
                                                    selectedValue={field.value}
                                                    onSelect={(val) => {
                                                        field.onChange(val);
                                                        setValue('purchaseRequestId', '');
                                                        loadedSourceRef.current = '';
                                                    }}
                                                />
                                            </FormControl>
                                            {!selectedSupplierId && (
                                                <div className="text-[10px] text-muted-foreground">Select a supplier to load its received quotations.</div>
                                            )}
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="warehouseId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Warehouse <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={warehouses.map((w) => ({
                                                        label: w.warehouse || w.name,
                                                        value: w.id,
                                                    }))}
                                                    title="Warehouse"
                                                    selectedValue={field.value}
                                                    onSelect={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="expectedDeliveryDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Expected Delivery Date <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <Input type="date" {...field} className="h-7 text-xs" />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="deliveryCycle"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Delivery Cycle <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={DELIVERY_CYCLES.map((c) => ({ label: c, value: c }))}
                                                    title="Delivery Cycle"
                                                    selectedValue={field.value}
                                                    onSelect={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="paymentTerms"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Payment Terms</Label>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="h-7 text-xs"
                                                    placeholder="e.g. Net 30 days, delivered to store"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Notes</Label>
                                            <FormControl>
                                                <Input {...field} className="h-7 text-xs" placeholder="Enter notes" />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="qualityNotes"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Quality Notes</Label>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="h-7 text-xs"
                                                    placeholder="Enter order-level quality notes"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator className="my-3" />

                            <FormField
                                control={control}
                                name="items"
                                render={() => (
                                    <FormItem className="gap-1">
                                        <POItemsEditor
                                            items={watchedItems}
                                            onChange={(items) => form.setValue('items', items, { shouldValidate: true })}
                                        />
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            {historyRows.length > 0 && (
                                <div className="rounded-md border border-blue-100 bg-blue-50/50 p-2 text-xs">
                                    <div className="mb-1 font-semibold text-blue-700">Last Purchases (from GRVs)</div>
                                    <div className="space-y-2">
                                        {historyRows.map((row) => {
                                            const item = watchedItems.find(
                                                (i) => i.companyStockDetailId === row.companyStockDetailId,
                                            );
                                            const recent = row.recentPurchases || [];
                                            return (
                                                <div key={row.companyStockDetailId} className="rounded border border-blue-200 bg-white p-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="font-medium">
                                                            {item?.description || item?.skuCode || row.companyStockDetailId}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {row.totalPurchaseCount != null ? `${row.totalPurchaseCount} purchases` : ''}
                                                            {row.averagePurchasePrice != null
                                                                ? ` · Avg R ${Number(row.averagePurchasePrice).toFixed(2)}`
                                                                : ''}
                                                        </span>
                                                        {historyQuery.isFetching && (
                                                            <span className="text-[10px] text-muted-foreground">loading...</span>
                                                        )}
                                                    </div>
                                                    {row.lastPurchasePrice != null && (
                                                        <div className="mt-1 text-[10px] text-muted-foreground">
                                                            Last purchase:{' '}
                                                            <span className="font-semibold text-blue-700">
                                                                R {Number(row.lastPurchasePrice).toFixed(2)}
                                                            </span>
                                                            {row.lastPurchaseDate
                                                                ? ` on ${moment(row.lastPurchaseDate).format('DD MMM YYYY')}`
                                                                : ''}
                                                            {row.lastSupplierName ? ` · ${row.lastSupplierName}` : ''}
                                                            {row.lastGrvNumber ? ` · ${row.lastGrvNumber}` : ''}
                                                        </div>
                                                    )}
                                                    {recent.length > 0 && (
                                                        <div className="mt-1 space-y-0.5">
                                                            {recent.map((p, i) => (
                                                                <div
                                                                    key={String(p.grvNumber || `${row.companyStockDetailId}-${i}`)}
                                                                    className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground"
                                                                >
                                                                    <span>GRV: {p.grvNumber || '—'}</span>
                                                                    <span>{p.supplierName || '—'}</span>
                                                                    <span>
                                                                        {p.purchaseDate ? moment(p.purchaseDate).format('DD MMM YY') : '—'}
                                                                    </span>
                                                                    <span className="text-right font-mono">
                                                                        {p.purchasePrice != null
                                                                            ? `R ${Number(p.purchasePrice).toFixed(2)}${p.quantity != null ? ` × ${p.quantity}` : ''}`
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {recent.length >= 2 &&
                                                                row.secondLastPurchasePrice != null && (
                                                                    <div className="text-[10px] text-muted-foreground">
                                                                        Transaction before last:{' '}
                                                                        <span className="font-semibold text-gray-700">
                                                                            R {Number(row.secondLastPurchasePrice).toFixed(2)}
                                                                        </span>
                                                                        {row.secondLastSupplierName ? ` from ${row.secondLastSupplierName}` : ''}
                                                                    </div>
                                                                )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                Create Purchase Order
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default PurchaseOrderForm;
