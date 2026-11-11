'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Plus, Printer, Scale, Trash2 } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import SelectPopover from '@/components/select-popover';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentType } from '@/api-queries/print';
import { PdfViewerDialog, useDocumentPdf } from './pdf-viewer-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { ProductSelection } from '../hoc/product-selection';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import moment from 'moment';
import momentTimezone from 'moment-timezone';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { useAuthUser } from '@/stores/auth-user.store';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { useCreditorList } from '@/api-queries/creditor';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { cleanDataPayload } from '@/utils/helpers';
import { useNetworkStore } from '@/stores/network.store';
import {
    SUPPLIER_QUOTATION_STATUSES,
    SupplierQuotationDetails,
    SupplierQuotationListFilters,
    useGetSupplierQuotationList,
    useGetSupplierQuotationById,
    useCreateSupplierQuotation,
    useCancelSupplierQuotation,
    useCompareSupplierQuotes,
    useConvertSupplierQuotations,
    supplierQuotationCreateSchema,
    type SupplierQuotationCreateSchema,
    type CompareQuoteItem,
    type CompareQuoteRow,
    type CompareQuotesData,
    type CompareQuotesPurchaseRequest,
    type CompareQuotesSupplierSummary,
} from '@/api-queries/supplier-quotations';
import { useGetPurchaseRequestList, useGetPurchaseRequestById, PurchaseRequestDetails } from '@/api-queries/purchase-requests';
import { docTotal, docLineItems } from './amounts';

interface SupplierQuotationsTabProps {
    purchaseRequestId?: string | null;
}

const SupplierQuotationsTab = ({ purchaseRequestId: initialPrId }: SupplierQuotationsTabProps) => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const initialFilters: SupplierQuotationListFilters = {
        search: '',
        status: '',
        purchaseRequestId: initialPrId || '',
    };

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<SupplierQuotationListFilters>(initialFilters);

    const query = useGetSupplierQuotationList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.status ? { status: appliedFilters.status } : {}),
        ...(appliedFilters?.purchaseRequestId ? { purchaseRequestId: appliedFilters.purchaseRequestId } : {}),
    });

    const { data, isLoading } = query;
    const totalRowCount = query?.data?.total || 0;

    const { generate, pdfState, isLoading: isPdfLoading, close } = useDocumentPdf();

    const columns: ColumnDef<SupplierQuotationDetails>[] = [
        {
            accessorKey: 'ref',
            header: (data) => <TableHeaderToggle {...data}>Quotation</TableHeaderToggle>,
            cell: ({ row }) => (
                <>
                    <div>{row.original.quotationNumber || row.original.clientDocumentId || row.original.id?.slice(0, 8) || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">
                        {row.original.quotationDate
                            ? moment(row.original.quotationDate).format('Do MMM, YY')
                            : row.original.createdAt
                              ? moment(row.original.createdAt).format('Do MMM, YY')
                              : 'N/A'}
                    </div>
                </>
            ),
        },
        {
            accessorKey: 'companyCreditorId',
            header: (data) => <TableHeaderToggle {...data}>Supplier</TableHeaderToggle>,
            cell: ({ row }) => row.original.CompanyCreditor?.name || row.original.companyCreditorId?.slice(0, 8) || 'N/A',
        },
        {
            accessorKey: 'purchaseRequestId',
            header: (data) => <TableHeaderToggle {...data}>Purchase Request</TableHeaderToggle>,
            cell: ({ row }) =>
                row.original.PurchaseRequest?.prNumber ||
                row.original.PurchaseRequest?.id?.slice(0, 8) ||
                row.original.purchaseRequestId?.slice(0, 8) ||
                'N/A',
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = row.original.status;
                const expired = row.original.isExpired;
                const color =
                    status === 'CANCELLED'
                        ? 'text-red-600'
                        : status === 'SELECTED'
                          ? 'text-green-600'
                          : status === 'RECEIVED'
                            ? 'text-blue-600'
                            : 'text-amber-600';
                return (
                    <div className="flex items-center gap-1.5">
                        <span className={`font-medium ${color}`}>{status || 'N/A'}</span>
                        {expired && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                Expired
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'grandTotal',
            header: (data) => <TableHeaderToggle {...data}>Grand Total</TableHeaderToggle>,
            cell: ({ row }) => {
                const quote = row.original;
                const totals = quote.totals || {};
                const total = docTotal({ ...quote, grandTotal: totals.grandTotal ?? quote.grandTotal }, docLineItems(quote));
                return (
                    <div>
                        {currencySymbol} {total > 0 ? total.toFixed(2) : '—'}
                    </div>
                );
            },
        },
        {
            accessorKey: 'totalQuantity',
            header: (data) => <TableHeaderToggle {...data}>Quantity</TableHeaderToggle>,
            cell: ({ row }) => (row.original.totalQuantity != null ? Number(row.original.totalQuantity) : 'N/A'),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        title="View / Compare / Convert"
                        onClick={() => setSelectedQuoteId(row.original.id)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                title="Print / PDF"
                            >
                                <Printer className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {(['ORIGINAL', 'DUPLICATE'] as const).map((item) => (
                                <DropdownMenuItem
                                    key={item}
                                    onClick={() =>
                                        generate(
                                            DocumentType.SUPPLIER_QUOTATION,
                                            row.original.id,
                                            item,
                                            `${row.original.quotationNumber || row.original.clientDocumentId || 'supplier-quotation'}.pdf`,
                                            'Supplier Quotation PDF',
                                        )
                                    }
                                >
                                    {item}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleFilters(filters);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2">
                <DataTable
                    query={query}
                    data={data?.data || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                placeholder="Search by number / supplier..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />
                            <SelectPopover
                                title="Status"
                                onlyTitle="All Statuses"
                                selectedValue={filters.status || ''}
                                onSelect={(val) => setFilters({ ...filters, status: String(val || '') })}
                                options={SUPPLIER_QUOTATION_STATUSES.map((s) => ({ label: s, value: s }))}
                            />
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button
                            onClick={() => {
                                if (
                                    hasPermission(
                                        userGroupPermissions,
                                        SYSTEM_MODULES.PROCESSING.PURCHASE_ORDERS.code,
                                        [SYSTEM_PERMISSIONS.CREATE],
                                    )
                                ) {
                                    setIsFormOpen(true);
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                }
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Quotation
                        </Button>
                    </div>
                </DataTable>

                <SupplierQuotationForm
                    open={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    initialPurchaseRequestId={initialPrId || ''}
                />

                <SupplierQuotationView
                    quoteId={selectedQuoteId}
                    onClose={() => setSelectedQuoteId(null)}
                />

                {isPdfLoading && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="rounded-lg bg-white px-6 py-4 shadow-lg">
                            Generating PDF...
                        </div>
                    </div>
                )}
                <PdfViewerDialog
                    open={pdfState ? true : false}
                    onClose={close}
                    pdfUrl={pdfState?.pdfUrl || null}
                    base64={pdfState?.base64}
                    fileName={pdfState?.fileName}
                    title={pdfState?.title}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{ description: "You don't have access to add the supplier quotations." }}
            />
        </PageLoader>
    );
};

// --------------------------------------- Create form ---------------------------------------

interface SupplierQuotationFormProps {
    open: boolean;
    onClose: () => void;
    initialPurchaseRequestId?: string;
}

type QuotationEditableItem = {
    id?: string;
    purchaseRequestItemId?: string;
    companyStockDetailId?: string;
    companyTaxRateId?: string;
    skuCode?: string;
    description?: string;
    uom?: string;
    quotedQuantity: number;
    quotedUnitPrice: number;
    discountPct?: number;
    taxPct?: number;
    leadTimeDays?: number;
};

const SupplierQuotationForm = ({ open, onClose, initialPurchaseRequestId = '' }: SupplierQuotationFormProps) => {
    const suppliers = useCreditorList({})?.data?.data?.rows;

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

    const createMut = useCreateSupplierQuotation();

    const form = useForm<SupplierQuotationCreateSchema>({
        resolver: zodResolver(supplierQuotationCreateSchema),
        defaultValues: {
            purchaseRequestId: initialPurchaseRequestId,
            companyCreditorId: '',
            quotationDate: momentTimezone().format('YYYY-MM-DD'),
            validUntil: '',
            paymentTerms: '',
            deliveryTerms: '',
            notes: '',
            items: [],
            timezone: momentTimezone.tz.guess(),
        },
    });

    const { handleSubmit, control, reset, setValue } = form;
    const watchedItems = (useWatch({ control, name: 'items' }) || []) as QuotationEditableItem[];
    const selectedPrId = useWatch({ control, name: 'purchaseRequestId' }) || '';
    const selectedSupplierId = useWatch({ control, name: 'companyCreditorId' }) || '';

    // Supplier-first: fetch OPEN Purchase Requests filtered by the selected supplier
    // (the backend filters on companyCreditorId).
    const prQuery = useGetPurchaseRequestList({
        limit: 100,
        offset: 0,
        status: 'OPEN',
        companyCreditorId: selectedSupplierId || undefined,
    });
    const openPurchaseRequests: PurchaseRequestDetails[] = prQuery?.data?.data || [];

    const prByIdQuery = useGetPurchaseRequestById(selectedPrId);
    const loadedPrRef = useRef('');

    // Pre-populate quotation items from the selected Purchase Request.
    useEffect(() => {
        const pr = prByIdQuery.data?.data;
        const prItems = pr?.items || pr?.PurchaseRequestItems || [];
        const hasStock = Object.keys(stockMap).length > 0;
        if (selectedPrId && pr && loadedPrRef.current !== `${selectedPrId}:${hasStock}`) {
            loadedPrRef.current = `${selectedPrId}:${hasStock}`;
            const mapped = prItems
                .filter((pi) => pi.companyStockDetailId)
                .map((pi) => {
                    const tax = stockMap[pi.companyStockDetailId];
                    return {
                        purchaseRequestItemId: pi.id || pi.purchaseRequestItemId || '',
                        companyStockDetailId: pi.companyStockDetailId,
                        companyTaxRateId: tax?.companyTaxRateId || '',
                        skuCode: pi.skuCode,
                        description: pi.description,
                        uom: pi.uom || tax?.unitCode || '',
                        quotedQuantity: Number(pi.requestedQuantity) || 1,
                        quotedUnitPrice: Number(pi.estimatedUnitCost) || 0,
                        discountPct: 0,
                        taxPct: Number(tax?.taxRatePercent) || 0,
                    };
                });
            setValue('items', mapped, { shouldValidate: true });
        }
    }, [selectedPrId, prByIdQuery.data, setValue, stockMap]);

    function submit(values: SupplierQuotationCreateSchema) {
        const payload = cleanDataPayload(values);
        createMut.mutate(payload as SupplierQuotationCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Supplier quotation saved');
                    reset();
                    onClose();
                } else {
                    toast.error('Supplier quotation creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={() => { loadedPrRef.current = ''; reset(); onClose(); }}>
            <DialogContent className="sm:max-w-[860px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Add Supplier Quotation</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(submit)} className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs">
                        <div className="max-h-[70vh] space-y-3 overflow-auto">
                            <div className="grid grid-cols-2 items-start gap-3">
                                <FormField
                                    control={control}
                                    name="companyCreditorId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Supplier</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={(suppliers || []).map((s) => ({
                                                        label: `${s.name} (${s.accountNumber})`,
                                                        value: s.id,
                                                    }))}
                                                    title="Supplier"
                                                    selectedValue={field.value}
                                                    onSelect={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="purchaseRequestId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Purchase Request</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={openPurchaseRequests.map((pr) => ({
                                                        label: `${pr.clientDocumentId || pr.documentNumber || pr.id?.slice(0, 8)} - ${pr.status}`,
                                                        value: pr.id,
                                                    }))}
                                                    title="Purchase Request"
                                                    selectedValue={field.value}
                                                    onSelect={(val) => {
                                                        field.onChange(val);
                                                        loadedPrRef.current = '';
                                                        setValue('items', []);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="quotationDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Quotation Date</Label>
                                            <FormControl>
                                                <Input type="date" className="h-8 text-xs" value={field.value} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="validUntil"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Valid Until (optional)</Label>
                                            <FormControl>
                                                <Input type="date" className="h-8 text-xs" value={field.value} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="paymentTerms"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Payment Terms (optional)</Label>
                                            <FormControl>
                                                <Input className="h-8 text-xs" {...field} />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="deliveryTerms"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Delivery Terms (optional)</Label>
                                            <FormControl>
                                                <Input className="h-8 text-xs" {...field} />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <QuotationItemsEditor
                                items={watchedItems}
                                onChange={(items) => setValue('items', items, { shouldValidate: true })}
                                purchaseRequestId={selectedPrId}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => { loadedPrRef.current = ''; reset(); onClose(); }}>
                                Cancel
                            </Button>
                            <Button type="submit" className="h-8 text-xs" disabled={createMut.isPending}>
                                {createMut.isPending ? 'Saving...' : 'Save Quotation'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// --------------------------------------- Items editor ---------------------------------------

interface QuotationItemsEditorProps {
    items: QuotationEditableItem[];
    onChange: (items: QuotationEditableItem[]) => void;
    purchaseRequestId?: string;
}

const QuotationItemsEditor = ({ items, onChange, purchaseRequestId }: QuotationItemsEditorProps) => {
    const isOnline = useNetworkStore((state) => state?.online);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

    const updateItem = (index: number, updates: Partial<QuotationEditableItem>) => {
        onChange(items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between">
                {purchaseRequestId && items.length === 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        Tip: pick products quoted by this supplier. Lines can map back to the purchase request item.
                    </div>
                )}
                <div className="flex justify-end">
                    <Button variant="outline" type="button" className="h-7 text-xs" onClick={() => setIsItemDialogOpen(true)}>
                        + Select Product
                    </Button>
                </div>
            </div>

            {items.length === 0 && (
                <div className="rounded border border-dashed border-gray-300 py-6 text-center text-xs text-muted-foreground">
                    No quoted items yet.
                </div>
            )}

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={item.purchaseRequestItemId || item.companyStockDetailId || index} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white p-2">
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{item.description || item.skuCode}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{item.skuCode || item.companyStockDetailId || 'N/A'}{item.uom ? ` (${item.uom})` : ''}</div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Qty</Label>
                            <Input
                                type="number"
                                min={1}
                                className="h-7 w-16 text-right text-xs"
                                value={item.quotedQuantity}
                                onChange={(e) => updateItem(index, { quotedQuantity: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Price</Label>
                            <Input
                                type="number"
                                min={0}
                                step={0.01}
                                className="h-7 w-20 text-right text-xs"
                                value={item.quotedUnitPrice}
                                onChange={(e) => updateItem(index, { quotedUnitPrice: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Disc%</Label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                className="h-7 w-16 text-right text-xs"
                                value={item.discountPct}
                                onChange={(e) => updateItem(index, { discountPct: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Tax%</Label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                className="h-7 w-16 text-right text-xs"
                                value={item.taxPct}
                                onChange={(e) => updateItem(index, { taxPct: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => removeItem(index)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <ProductSelection
                isOpen={isItemDialogOpen}
                onClose={() => setIsItemDialogOpen(false)}
                isOnline={isOnline}
                isGRV
                onSelectProduct={(product) => {
                    const existing = items.findIndex((i) => i.companyStockDetailId === product.id);
                    if (existing !== -1) {
                        updateItem(existing, { quotedQuantity: items[existing].quotedQuantity + 1 });
                    } else {
                        onChange([
                            ...items,
                            {
                                companyStockDetailId: product.id,
                                description: product.description,
                                skuCode: product.itemCode,
                                quotedQuantity: 1,
                                quotedUnitPrice: product?.costTypes?.latestCost || 0,
                                discountPct: 0,
                                taxPct: product.subCategory?.taxRate?.taxRatePercent || 0,
                                companyTaxRateId: product.subCategory?.taxRate.id || product?.companyTaxRateId || '',
                            },
                        ]);
                    }
                    setIsItemDialogOpen(false);
                }}
            />
        </div>
    );
};

// --------------------------------------- View / Compare / Convert / Cancel ---------------------------------------

interface SupplierQuotationViewProps {
    quoteId: string | null;
    onClose: () => void;
}

function SupplierQuotationView({ quoteId, onClose }: SupplierQuotationViewProps) {
    const [showCompare, setShowCompare] = useState(false);
    const [showConvert, setShowConvert] = useState(false);
    const [reasonDraft, setReasonDraft] = useState('');
    const [cancelOpen, setCancelOpen] = useState(false);
    const cancelMut = useCancelSupplierQuotation();
    const { data: queryRes } = useGetSupplierQuotationById(quoteId || '');
    const quote: SupplierQuotationDetails | undefined = queryRes?.data;
    const warehouseRes = useGetWarehouses({ limit: 100, offset: 0 });
    // console.log('warehouse',warehouseRes)
    const warehousesList = (
        Array.isArray(warehouseRes?.data?.data)
            ? warehouseRes?.data?.data
            : (warehouseRes?.data?.data as { rows?: { id: string; name?: string }[] } | undefined)?.rows || []
    ) as { id: string; name?: string }[];
    const warehouseName = (warehouseId?: string) =>
        warehouseId
            ? warehousesList.find((w) => w.id === warehouseId)?.name || warehouseId?.slice(0, 8)
            : 'N/A';

    return (
        <Dialog open={!!quoteId} onOpenChange={(o) => { if (!o) { onClose(); setShowCompare(false); setShowConvert(false); setCancelOpen(false); } }}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Supplier Quotation Details</DialogTitle>
                </DialogHeader>
                {!quote && <PageLoader isLoading={!quote} />}
                {quote && (
                    <div className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs">
                        <div className="flex items-start justify-between">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                <div>
                                    <span className="font-bold">Quotation :</span>{' '}
                                    {quote.quotationNumber || quote.clientDocumentId || quote.id?.slice(0, 8) || 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Status :</span>{' '}
                                    <span className={quote.status === 'CANCELLED' ? 'text-red-600' : quote.status === 'SELECTED' ? 'text-green-600' : 'text-blue-600'}>
                                        {quote.status || 'N/A'}
                                    </span>
                                    {quote.isExpired && (
                                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                            Expired
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-bold">Supplier :</span> {quote.CompanyCreditor?.name || 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Purchase Request :</span>{' '}
                                    {quote.PurchaseRequest?.prNumber || quote.purchaseRequestId || 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Warehouse :</span>{' '}
                                    {quote.PurchaseRequest?.warehouseId ? warehouseName(quote.PurchaseRequest.warehouseId) : 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Required By :</span>{' '}
                                    {quote.PurchaseRequest?.requiredByDate
                                        ? moment(quote.PurchaseRequest.requiredByDate).format('DD MMM, YY')
                                        : 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Quotation Date :</span>{' '}
                                    {quote.quotationDate ? moment(quote.quotationDate).format('DD MMM, YY') : 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Valid Until :</span>{' '}
                                    {quote.validUntil ? moment(quote.validUntil).format('DD MMM, YY') : 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Grand Total :</span>{' '}
                                    {Number(quote.totals?.grandTotal ?? quote.grandTotal ?? 0).toFixed(2)}
                                </div>
                                {quote.selectedAt && (
                                    <div>
                                        <span className="font-bold">Selected At :</span>{' '}
                                        {moment(quote.selectedAt).format('DD MMM, YY HH:mm')}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {quote.purchaseRequestId && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCompare(true)}>
                                        <Scale className="h-3.5 w-3.5" /> Compare
                                    </Button>
                                )}
                                {quote.status === 'RECEIVED' && !quote.isExpired && quote.purchaseRequestId && (
                                    <Button size="sm" className="h-7 text-xs" onClick={() => setShowConvert(true)}>
                                        Convert to POs
                                    </Button>
                                )}
                                {(quote.status === 'DRAFT' || quote.status === 'RECEIVED') && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => setCancelOpen(true)}>
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </div>

                        {quote.paymentTerms && (
                            <div>
                                <span className="font-bold">Payment Terms :</span> {quote.paymentTerms}
                            </div>
                        )}
                        {quote.deliveryTerms && (
                            <div>
                                <span className="font-bold">Delivery Terms :</span> {quote.deliveryTerms}
                            </div>
                        )}
                        {quote.notes && (
                            <div>
                                <span className="font-bold">Notes :</span> {quote.notes}
                            </div>
                        )}

                        <div className="overflow-hidden rounded border border-gray-200">
                            <table className="min-w-full text-[11px]">
                                <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="px-2 py-1">SKU</th>
                                        <th className="px-2 py-1">Description</th>
                                        <th className="px-2 py-1 text-right">Requested</th>
                                        <th className="px-2 py-1 text-right">Quoted</th>
                                        <th className="px-2 py-1 text-right">Price</th>
                                        <th className="px-2 py-1 text-right">Disc%</th>
                                        <th className="px-2 py-1 text-right">Tax%</th>
                                        <th className="px-2 py-1 text-right">Net Cost / Line Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(quote.items || quote.SupplierQuotationItems || []).map((item, idx) => (
                                        <tr key={item.id || item.supplierQuotationItemId || idx} className="border-t">
                                            <td className="px-2 py-1 font-mono">
                                                {item.CompanyStockDetail?.itemCode || item.skuCode || 'N/A'}
                                            </td>
                                            <td className="px-2 py-1">
                                                {item.CompanyStockDetail?.description ||
                                                    item.description ||
                                                    item.PurchaseRequestItem?.description ||
                                                    item.companyStockDetailId}
                                            </td>
                                            <td className="px-2 py-1 text-right">
                                                {item.PurchaseRequestItem?.requestedQuantity != null
                                                    ? `(${Number(item.PurchaseRequestItem.requestedQuantity)})`
                                                    : '—'}
                                            </td>
                                            <td className="px-2 py-1 text-right">{Number(item.quotedQuantity || 0)}</td>
                                            <td className="px-2 py-1 text-right">{Number(item.quotedUnitPrice || 0).toFixed(2)}</td>
                                            <td className="px-2 py-1 text-right">{(item.discountPct || 0).toString()}%</td>
                                            <td className="px-2 py-1 text-right">{(item.taxPct || 0).toString()}%</td>
                                            <td className="px-2 py-1 text-right whitespace-nowrap">
                                                {item.effectiveUnitCost != null
                                                    ? `Cost ${Number(item.effectiveUnitCost).toFixed(2)}`
                                                    : ''}
                                                {item.effectiveUnitCost != null && item.lineTotal != null ? ' / ' : ''}
                                                {item.lineTotal != null
                                                    ? `Total ${Number(item.lineTotal).toFixed(2)}`
                                                    : (
                                                          (Number(item.quotedQuantity || 0) *
                                                              Number(item.quotedUnitPrice || 0) *
                                                              (1 - Number(item.discountPct || 0) / 100))
                                                      ).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {(quote.totals?.grandTotal != null || quote.grandTotal != null) && (
                            <div className="flex flex-col gap-1 border-t border-gray-300 pt-2 text-right">
                                <div>
                                    <span className="font-bold">Goods Total :</span>{' '}
                                    {Number(quote.totals?.goodsTotal ?? quote.grandTotal ?? 0).toFixed(2)}
                                </div>
                                <div>
                                    <span className="font-bold">Discount :</span>{' '}
                                    {Number(
                                        (quote.items || quote.SupplierQuotationItems || []).reduce(
                                            (sum, it) => sum + Number(it.discountAmount || 0),
                                            0,
                                        ),
                                    ).toFixed(2)}
                                </div>
                                <div>
                                    <span className="font-bold">Tax :</span>{' '}
                                    {Number(
                                        (quote.items || quote.SupplierQuotationItems || []).reduce(
                                            (sum, it) => sum + Number(it.taxAmount || 0),
                                            0,
                                        ),
                                    ).toFixed(2)}
                                </div>
                                <div className="text-sm">
                                    <span className="font-bold">Grand Total :</span>{' '}
                                    {Number(quote.totals?.grandTotal ?? quote.grandTotal ?? 0).toFixed(2)}
                                </div>
                            </div>
                        )}

                        {(quote.purchaseOrders || []).length > 0 && (
                            <div className="overflow-hidden rounded border border-gray-200">
                                <div className="bg-gray-100 px-2 py-1 font-semibold">Purchase Orders created</div>
                                <table className="min-w-full text-[11px]">
                                    <thead>
                                        <tr className="bg-gray-100 text-left">
                                            <th className="px-2 py-1">PO Number</th>
                                            <th className="px-2 py-1">Status</th>
                                            <th className="px-2 py-1 text-right">Grand Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(quote.purchaseOrders || []).map((po, idx) => (
                                            <tr key={po.id || idx} className="border-t">
                                                <td className="px-2 py-1">{po.poNumber || po.orderNumber || po.id?.slice(0, 8) || 'N/A'}</td>
                                                <td className="px-2 py-1">{po.status || 'N/A'}</td>
                                                <td className="px-2 py-1 text-right">{Number(po.grandTotal || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {cancelOpen && (
                            <div className="flex items-center gap-2 rounded-md border border-dashed border-red-300 bg-red-50/50 p-2">
                                <Label className="text-xs">Cancel reason</Label>
                                <Input className="h-7 flex-1 text-xs" value={reasonDraft} onChange={(e) => setReasonDraft(e.target.value)} placeholder="e.g. Quote rejected" />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-red-600"
                                    disabled={cancelMut.isPending}
                                    onClick={() =>
                                        cancelMut.mutate(
                                            { id: quote.id, cancelReason: reasonDraft || 'Cancelled' },
                                            {
                                                onSuccess: (data) => {
                                                    if (!data?.success) toast.error(data?.message || 'Failed to cancel');
                                                    setCancelOpen(false);
                                                    toast.success('Quotation cancelled');
                                                },
                                                onError: (error) => {
                                                    // @ts-ignore
                                                    toast.error(error?.response?.data?.message || 'Failed to cancel');
                                                },
                                            },
                                        )
                                    }
                                >
                                    Cancel Quotation
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {quote?.purchaseRequestId && (
                    <CompareQuotesDialog
                        open={showCompare}
                        purchaseRequestId={quote.purchaseRequestId}
                        onClose={() => setShowCompare(false)}
                    />
                )}
                {quote?.purchaseRequestId && quote.status !== 'CANCELLED' && (
                    <ConvertQuotesDialog
                        open={showConvert}
                        purchaseRequestId={quote.purchaseRequestId}
                        onClose={() => setShowConvert(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

// --------------------------------------- Compare ---------------------------------------

interface CompareQuotesDialogProps {
    open: boolean;
    purchaseRequestId: string;
    onClose: () => void;
}

export function CompareQuotesDialog({ open, purchaseRequestId, onClose }: CompareQuotesDialogProps) {
    const { data, isLoading, refetch } = useCompareSupplierQuotes(open ? purchaseRequestId : '');
    const [refreshed, setRefreshed] = useState(false);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[860px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Compare Supplier Quotes</DialogTitle>
                </DialogHeader>
                <PageLoader isLoading={isLoading}>
                    <div className="flex justify-end pb-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={refreshed}
                            onClick={() => {
                                refetch();
                                setRefreshed(true);
                            }}
                        >
                            Refresh
                        </Button>
                    </div>
                    <div className="-mr-3 max-h-[65vh] overflow-y-auto overflow-x-hidden pr-3">
                        <CompareResult data={data?.data} />
                    </div>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
}

function CompareResult({ data }: { data?: CompareQuotesData | null }) {
    if (!data || (!data.items?.length && !Array.isArray(data))) {
        return (
            <div className="rounded border border-dashed border-gray-300 py-6 text-center text-xs text-muted-foreground">
                No comparable quotes returned for this purchase request.
            </div>
        );
    }

    const pr = data.purchaseRequest;
    const items: CompareQuoteItem[] = data.items || [];
    const suppliers: CompareQuotesSupplierSummary[] = data.suppliers || [];
    const totalQuotes = data.quotationCount ?? items.reduce((s, it) => s + (it.quoteCount ?? 0), 0);

    const fmtNum = (value?: number | string) => {
        if (value == null || value === '') return '—';
        const n = Number(value);
        return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
    };

    const fmtInt = (value?: number) => (value == null || Number.isNaN(Number(value)) ? '—' : Number(value));

    return (
        <div className="space-y-3 text-[11px]">
            {pr && (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <div>
                        <span className="text-muted-foreground">PR: </span>
                        <span className="font-semibold">{pr.prNumber || pr.id?.slice(0, 8)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Status: </span>
                        <span className="font-medium">{pr.status || '—'}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Warehouse: </span>
                        <span className="font-medium">{pr.warehouse?.warehouse || pr.warehouse?.description || '—'}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Required By: </span>
                        <span className="font-medium">{pr.requiredByDate || '—'}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Quotes: </span>
                        <span className="font-medium">{fmtInt(totalQuotes)}</span>
                    </div>
                </div>
            )}

            {data.basis && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-900">
                    <div className="mb-1 font-semibold uppercase tracking-wide">Basis</div>
                    <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                        {Object.entries(data.basis).map(([key, val]) => (
                            <div key={key}>
                                <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                                {typeof val === 'string' ? val : String(val)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {items.length === 0 && (
                <div className="rounded border border-dashed border-gray-300 py-6 text-center text-xs text-muted-foreground">
                    No items returned for this purchase request.
                </div>
            )}

            {items.map((item, idx) => (
                <div key={item.purchaseRequestItemId || item.companyStockDetailId || idx} className="rounded-md border border-gray-200 bg-white">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-0.5 border-b border-gray-100 px-3 py-2">
                        <span className="font-semibold">
                            {item.description || item.skuCode || item.companyStockDetailId || 'Item'}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">{item.skuCode || ''}</span>
                        <span className="text-muted-foreground">UOM: {item.uom || '—'}</span>
                        <span className="text-muted-foreground">
                            Requested: <span className="font-medium">{fmtInt(item.requestedQuantity)}</span>
                        </span>
                        <span className="text-muted-foreground">
                            Est. Unit Cost: <span className="font-medium">{fmtNum(item.estimatedUnitCost)}</span>
                        </span>
                        {item.lastPurchase && (
                            <span className="text-muted-foreground">
                                Last Paid: <span className="font-medium">{fmtNum(item.lastPurchase.unitPrice)}</span> ({item.lastPurchase.supplierName || '—'}, {item.lastPurchase.grvDate || '—'})
                            </span>
                        )}
                    </div>

                    {(item.quotes?.length ?? 0) === 0 ? (
                        <div className="px-3 py-3 text-[10px] text-muted-foreground">No quotes for this item.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 text-left text-[10px] text-muted-foreground">
                                        <th className="px-2 py-1">Supplier</th>
                                        <th className="px-2 py-1">Quotation</th>
                                        <th className="px-2 py-1 text-right">Quoted</th>
                                        <th className="px-2 py-1 text-right">Disc%</th>
                                        <th className="px-2 py-1 text-right">Tax%</th>
                                        <th className="px-2 py-1 text-right">Net</th>
                                        <th className="px-2 py-1 text-right">Effective</th>
                                        <th className="px-2 py-1 text-right">vs Last Paid</th>
                                        <th className="px-2 py-1">Grade</th>
                                        <th className="px-2 py-1 text-right">Avail</th>
                                        <th className="px-2 py-1 text-right">Line Cost</th>
                                        <th className="px-2 py-1">Valid Until</th>
                                        <th className="px-2 py-1">Terms</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(item.quotes || []).map((q: CompareQuoteRow, qi) => (
                                        <tr
                                            key={q.supplierQuotationItemId || q.supplierQuotationId || qi}
                                            className={`border-b border-gray-100 ${
                                                q.isLowestEffectiveCost ? 'bg-emerald-50' : ''
                                            }`}
                                        >
                                            <td className="whitespace-nowrap px-2 py-1 font-medium">
                                                {q.supplierName || q.companyCreditorId || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-mono">{q.quotationNumber || '—'}</span>
                                                    <span
                                                        className={`rounded px-1 text-[9px] font-semibold uppercase ${
                                                            q.quotationStatus === 'SELECTED'
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : q.quotationStatus === 'DRAFT'
                                                                  ? 'bg-gray-100 text-gray-600'
                                                                  : 'bg-blue-100 text-blue-700'
                                                        }`}
                                                    >
                                                        {q.quotationStatus || '—'}
                                                    </span>
                                                </div>
                                                {q.alreadyOrdered && (
                                                    <div className="text-[9px] text-amber-600">already ordered</div>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
                                                {fmtNum(q.quotedUnitPrice)}
                                                {q.taxInclusive ? <span className="ml-1 text-[9px] text-muted-foreground">incl</span> : null}
                                            </td>
                                            <td className="px-2 py-1 text-right tabular-nums">{fmtNum(q.discountPct)}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{fmtNum(q.taxPct)}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{fmtNum(q.netUnitPrice)}</td>
                                            <td className="whitespace-nowrap px-2 py-1 text-right font-semibold tabular-nums">
                                                {fmtNum(q.effectiveUnitCost)}
                                                {q.isLowestEffectiveCost ? (
                                                    <span className="ml-1 rounded bg-emerald-100 px-1 text-[9px] text-emerald-700">
                                                        lowest
                                                    </span>
                                                ) : null}
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
                                                {q.differenceFromLastPaid != null ? (
                                                    <span
                                                        className={
                                                            Number(q.differenceFromLastPaid) < 0
                                                                ? 'font-semibold text-emerald-700'
                                                                : 'font-semibold text-red-600'
                                                        }
                                                    >
                                                        {Number(q.differenceFromLastPaid) < 0 ? '' : '+'}
                                                        {fmtNum(q.differenceFromLastPaid)}
                                                        {q.differenceFromLastPaidPct != null
                                                            ? ` (${fmtNum(q.differenceFromLastPaidPct)}%)`
                                                            : ''}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-2 py-1 text-center font-medium">{q.supplierGrade || '—'}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">
                                                {fmtInt(q.availableQuantity as number)}
                                                {q.coversRequestedQuantity === false ? (
                                                    <span className="ml-1 text-[9px] text-red-600">short</span>
                                                ) : null}
                                            </td>
                                            <td className="px-2 py-1 text-right tabular-nums">{fmtNum(q.effectiveLineCost)}</td>
                                            <td className="px-2 py-1">
                                                {q.validUntil || '—'}
                                                {q.isExpired ? <span className="ml-1 text-[9px] text-red-600">expired</span> : null}
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-1">
                                                <div>{q.paymentTerms || '—'}</div>
                                                {q.deliveryTerms ? (
                                                    <div className="text-[9px] text-muted-foreground">{q.deliveryTerms}</div>
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ))}

            {suppliers.length > 0 && (
                <div className="rounded-md border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-3 py-1.5 font-semibold">Supplier Summary</div>
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-100 text-left text-[10px] text-muted-foreground">
                                <th className="px-2 py-1">Supplier</th>
                                <th className="px-2 py-1 text-right">Quoted Lines</th>
                                <th className="px-2 py-1 text-right">Lowest Cost Lines</th>
                                <th className="px-2 py-1 text-right">Total Effective Cost</th>
                                <th className="px-2 py-1">Covers All Items</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map((s, si) => (
                                <tr key={s.companyCreditorId || si} className="border-b border-gray-100">
                                    <td className="px-2 py-1 font-medium">{s.supplierName || s.companyCreditorId || '—'}</td>
                                    <td className="px-2 py-1 text-right tabular-nums">{fmtInt(s.quotedLines)}</td>
                                    <td className="px-2 py-1 text-right tabular-nums">{fmtInt(s.lowestCostLines)}</td>
                                    <td className="px-2 py-1 text-right font-semibold tabular-nums">{fmtNum(s.totalEffectiveCost)}</td>
                                    <td className="px-2 py-1">
                                        {s.coversAllItems ? (
                                            <span className="rounded bg-emerald-100 px-1 text-[10px] font-medium text-emerald-700">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="rounded bg-red-100 px-1 text-[10px] font-medium text-red-600">
                                                No
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// --------------------------------------- Convert to POs ---------------------------------------

interface ConvertQuotesDialogProps {
    open: boolean;
    purchaseRequestId: string;
    onClose: () => void;
}

function ConvertQuotesDialog({ open, purchaseRequestId, onClose }: ConvertQuotesDialogProps) {
    const suppliers = useCreditorList({})?.data?.data?.rows || [];
    const quotesQuery = useGetSupplierQuotationList({
        limit: 100,
        offset: 0,
        purchaseRequestId,
        status: 'RECEIVED',
    });
    const quotes: SupplierQuotationDetails[] = quotesQuery?.data?.data || [];

    const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});
    const [supplierNotes, setSupplierNotes] = useState<Record<string, string>>({});
    const [supplierTerms, setSupplierTerms] = useState<Record<string, string>>({});
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const convertMut = useConvertSupplierQuotations();

    const supplierName = (id?: string) => suppliers.find((s) => s.id === id)?.name || id || 'Unknown';

    const buildSelections = () => {
        const selections: { supplierQuotationItemId: string }[] = [];
        quotes.forEach((quote) => {
            (quote.items || quote.SupplierQuotationItems || []).forEach((item) => {
                if (item.id && selectedItemIds[item.id]) {
                    selections.push({ supplierQuotationItemId: item.id });
                }
            });
        });
        return selections;
    };

    const buildSuppliers = () => {
        const supplierIds: string[] = [];
        quotes.forEach((quote) => {
            const hasSelection = (quote.items || quote.SupplierQuotationItems || []).some(
                (item) => item.id && selectedItemIds[item.id],
            );
            if (hasSelection && quote.companyCreditorId && !supplierIds.includes(quote.companyCreditorId)) {
                supplierIds.push(quote.companyCreditorId);
            }
        });
        return supplierIds.map((id) => ({
            companyCreditorId: id,
            ...(supplierTerms[id] ? { paymentTerms: supplierTerms[id] } : {}),
            ...(supplierNotes[id] ? { notes: supplierNotes[id] } : {}),
        }));
    };

    const submit = () => {
        const selections = buildSelections();
        const supplierList = buildSuppliers();
        if (selections.length === 0) {
            toast.error('Select at least one quoted line to convert');
            return;
        }
        if (supplierList.length === 0) {
            toast.error('Select at least one supplier line');
            return;
        }
        convertMut.mutate(
            {
                purchaseRequestId,
                ...(expectedDeliveryDate ? { expectedDeliveryDate } : {}),
                selections,
                suppliers: supplierList,
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Purchase orders created from quotes');
                        onClose();
                    } else {
                        toast.error(data?.message || 'Conversion failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Conversion failed');
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[860px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Convert Quotes to Purchase Orders</DialogTitle>
                </DialogHeader>
                <PageLoader isLoading={quotesQuery.isLoading}>
                    <div className="max-h-[60vh] space-y-4 overflow-auto text-xs">
                        <div className="flex items-center gap-2">
                            <Label className="w-28 shrink-0 text-xs">Expected Delivery</Label>
                            <Input type="date" className="h-7 w-48 text-xs" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
                        </div>

                        {quotes.length === 0 && (
                            <div className="rounded border border-dashed border-gray-300 py-6 text-center text-xs text-muted-foreground">
                                No RECEIVED quotations found for this purchase request.
                            </div>
                        )}

                        {quotes.map((quote) => {
                            const items = quote.items || quote.SupplierQuotationItems || [];
                            const hasSelection = items.some((item) => item.id && selectedItemIds[item.id]);
                            return (
                                <div key={quote.id} className="rounded-md border border-gray-200 bg-white p-2">
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="font-semibold">
                                            {quote.quotationNumber || quote.id?.slice(0, 8)} — {supplierName(quote.companyCreditorId)}
                                        </span>
                                        <span className={`font-medium ${hasSelection ? 'text-green-600' : 'text-muted-foreground'}`}>
                                            {hasSelection ? 'Selected' : 'None selected'}
                                        </span>
                                    </div>
                                    <table className="min-w-full text-[11px]">
                                        <thead>
                                            <tr className="text-left text-muted-foreground">
                                                <th className="px-1 py-1">Sel</th>
                                                <th className="px-1 py-1">SKU</th>
                                                <th className="px-1 py-1">Description</th>
                                                <th className="px-1 py-1 text-right">Qty</th>
                                                <th className="px-1 py-1 text-right">Price</th>
                                                <th className="px-1 py-1 text-right">Line Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item) => {
                                                const itemId = item.id;
                                                return (
                                                <tr key={item.id || item.supplierQuotationItemId || `${item.companyStockDetailId}-${item.quotedQuantity}`} className="border-t">
                                                    <td className="px-1 py-1">
                                                        <Checkbox
                                                            key={String(itemId)}
                                                            checked={!!(itemId && selectedItemIds[itemId])}
                                                            onCheckedChange={(checked) => {
                                                                if (itemId) {
                                                                    setSelectedItemIds((prev) => ({ ...prev, [itemId]: !!checked }));
                                                                }
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-1 py-1 font-mono">
                                                        {item.CompanyStockDetail?.itemCode || item.skuCode || 'N/A'}
                                                    </td>
                                                    <td className="px-1 py-1">
                                                        {item.CompanyStockDetail?.description ||
                                                            item.description ||
                                                            item.PurchaseRequestItem?.description ||
                                                            item.companyStockDetailId}
                                                    </td>
                                                    <td className="px-1 py-1 text-right">{Number(item.quotedQuantity || 0)}</td>
                                                    <td className="px-1 py-1 text-right">{Number(item.quotedUnitPrice || 0).toFixed(2)}</td>
                                                    <td className="px-1 py-1 text-right">
                                                        {item.lineTotal != null
                                                            ? Number(item.lineTotal).toFixed(2)
                                                            : (
                                                                  (Number(item.quotedQuantity || 0) *
                                                                      Number(item.quotedUnitPrice || 0))
                                                              ).toFixed(2)}
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {quote.companyCreditorId && hasSelection && (
                                        <div className="mt-1 flex items-center gap-2">
                                            <Label className="w-24 shrink-0 text-[10px]">Payment Terms</Label>
                                            {(() => {
                                                const creditorId = quote.companyCreditorId;
                                                return (
                                                    <>
                                                        <Input
                                                            className="h-6 flex-1 text-[10px]"
                                                            placeholder="e.g. Net 30"
                                                            value={supplierTerms[creditorId] || ''}
                                                            onChange={(e) =>
                                                                setSupplierTerms((prev) => ({ ...prev, [creditorId]: e.target.value }))
                                                            }
                                                        />
                                                        <Input
                                                            className="h-6 flex-1 text-[10px]"
                                                            placeholder="Notes"
                                                            value={supplierNotes[creditorId] || ''}
                                                            onChange={(e) =>
                                                                setSupplierNotes((prev) => ({ ...prev, [creditorId]: e.target.value }))
                                                            }
                                                        />
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
                            Close
                        </Button>
                        <Button size="sm" className="h-8 text-xs" disabled={convertMut.isPending} onClick={submit}>
                            {convertMut.isPending ? 'Converting...' : 'Create Purchase Orders'}
                        </Button>
                    </div>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
}

export default SupplierQuotationsTab;