'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Plus, Printer, Trash2 } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { cleanDataPayload } from '@/utils/helpers';
import { useNetworkStore } from '@/stores/network.store';
import {
    SUPPLIER_INVOICE_STATUSES,
    SupplierInvoiceDetails,
    SupplierInvoiceListFilters,
    useGetSupplierInvoiceList,
    useGetSupplierInvoiceById,
    useCreateSupplierInvoice,
    usePostSupplierInvoice,
    useCancelSupplierInvoice,
    supplierInvoiceCreateSchema,
    type SupplierInvoiceCreateSchema,
    type InvoiceEditableItem,
} from '@/api-queries/supplier-invoices';
import {
    useGetPurchaseOrderList,
    useGetPurchaseOrderById,
    type PurchaseOrderDetails,
} from '@/api-queries/purchase-orders';
import { docTotal, docLineItems } from './amounts';

const SupplierInvoicesTab = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const suppliers = useCreditorList({})?.data?.data?.rows || [];

    const initialFilters: SupplierInvoiceListFilters = {
        search: '',
        status: '',
        companyCreditorId: '',
    };

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<SupplierInvoiceListFilters>(initialFilters);

    const query = useGetSupplierInvoiceList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.status ? { status: appliedFilters.status } : {}),
        ...(appliedFilters?.companyCreditorId ? { companyCreditorId: appliedFilters.companyCreditorId } : {}),
    });

    const { data, isLoading } = query;
    const totalRowCount = query?.data?.total || 0;

    const { generate, pdfState, isLoading: isPdfLoading, close } = useDocumentPdf();

    const columns: ColumnDef<SupplierInvoiceDetails>[] = [
        {
            accessorKey: 'invoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>Invoice</TableHeaderToggle>,
            cell: ({ row }) => (
                <>
                    <div>{row.original.invoiceNumber || row.original.clientDocumentId || row.original.id?.slice(0, 8) || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">
                        {row.original.invoiceDate
                            ? moment(row.original.invoiceDate).format('Do MMM, YY')
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
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = row.original.status;
                const color = status === 'POSTED' ? 'text-green-600' : status === 'CANCELLED' ? 'text-red-600' : 'text-amber-600';
                return <span className={`font-medium ${color}`}>{status || 'N/A'}</span>;
            },
        },
        {
            accessorKey: 'dueDate',
            header: (data) => <TableHeaderToggle {...data}>Due Date</TableHeaderToggle>,
            cell: ({ row }) => (row.original.dueDate ? moment(row.original.dueDate).format('DD MMM, YY') : 'N/A'),
        },
        {
            accessorKey: 'goodsTotal',
            header: (data) => <TableHeaderToggle {...data}>Goods Total</TableHeaderToggle>,
            cell: ({ row }) => {
                const value = Number(row.original.goodsTotal);
                return <div className="text-right">{row.original.goodsTotal != null ? `${currencySymbol} ${value.toFixed(2)}` : '—'}</div>;
            },
        },
        {
            accessorKey: 'discountAmount',
            header: (data) => <TableHeaderToggle {...data}>Discount</TableHeaderToggle>,
            cell: ({ row }) => {
                const value = Number(row.original.discountAmount || 0);
                return <div className="text-right">{row.original.discountAmount != null ? `${currencySymbol} ${value.toFixed(2)}` : '—'}</div>;
            },
        },
        {
            accessorKey: 'taxAmount',
            header: (data) => <TableHeaderToggle {...data}>Tax</TableHeaderToggle>,
            cell: ({ row }) => {
                const value = Number(row.original.taxAmount || 0);
                return <div className="text-right">{row.original.taxAmount != null ? `${currencySymbol} ${value.toFixed(2)}` : '—'}</div>;
            },
        },
        {
            accessorKey: 'grandTotal',
            header: (data) => <TableHeaderToggle {...data}>Grand Total</TableHeaderToggle>,
            cell: ({ row }) => {
                const total = docTotal(row.original, docLineItems(row.original));
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
                        title="View / Post / Cancel"
                        onClick={() => setSelectedInvoiceId(row.original.id)}
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
                                            DocumentType.SUPPLIER_INVOICE,
                                            row.original.id,
                                            item,
                                            `${row.original.invoiceNumber || row.original.clientDocumentId || 'supplier-invoice'}.pdf`,
                                            'Supplier Invoice PDF',
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
                                placeholder="Search by invoice / supplier..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleFilters(filters);
                                }}
                                className="!max-w-sm"
                            />
                            <SelectPopover
                                title="Status"
                                onlyTitle="All Statuses"
                                selectedValue={filters.status || ''}
                                onSelect={(val) => setFilters({ ...filters, status: String(val || '') })}
                                options={SUPPLIER_INVOICE_STATUSES.map((s) => ({ label: s, value: s }))}
                            />
                            <SelectPopover
                                title="Supplier"
                                onlyTitle="All Suppliers"
                                selectedValue={filters.companyCreditorId || ''}
                                onSelect={(val) => setFilters({ ...filters, companyCreditorId: String(val || '') })}
                                options={suppliers.map((s) => ({ label: s.name, value: s.id }))}
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
                            Add Supplier Invoice
                        </Button>
                    </div>
                </DataTable>

                <SupplierInvoiceForm open={isFormOpen} onClose={() => setIsFormOpen(false)} />
                <SupplierInvoiceView invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} />

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
                options={{ description: "You don't have access to add the supplier invoices." }}
            />
        </PageLoader>
    );
};

// --------------------------------------- Create form ---------------------------------------

interface SupplierInvoiceFormProps {
    open: boolean;
    onClose: () => void;
}

const SupplierInvoiceForm = ({ open, onClose }: SupplierInvoiceFormProps) => {
    const suppliers = useCreditorList({})?.data?.data?.rows;
    const createMut = useCreateSupplierInvoice();

    const form = useForm<SupplierInvoiceCreateSchema>({
        resolver: zodResolver(supplierInvoiceCreateSchema),
        defaultValues: {
            companyCreditorId: '',
            purchaseOrderId: '',
            invoiceNumber: '',
            invoiceDate: momentTimezone().format('YYYY-MM-DD'),
            dueDate: '',
            notes: '',
            items: [],
            timezone: momentTimezone.tz.guess(),
        },
    });

    const { handleSubmit, control, reset, setValue } = form;
    const watchedItems = (useWatch({ control, name: 'items' }) || []) as InvoiceEditableItem[];

    // Supplier-first: load POs belonging to the selected supplier only.
    const selectedSupplierId = useWatch({ control, name: 'companyCreditorId' }) || '';
    const selectedPoId = useWatch({ control, name: 'purchaseOrderId' }) || '';

    const poListQuery = useGetPurchaseOrderList({
        limit: 200,
        offset: 0,
        companyCreditorId: selectedSupplierId || undefined,
    });
    const supplierPos: PurchaseOrderDetails[] = selectedSupplierId ? (poListQuery?.data?.data || []) : [];

    const poByIdQuery = useGetPurchaseOrderById(selectedPoId);
    const loadedPoRef = useRef('');

    // Auto-fill invoice items from the selected Purchase Order.
    useEffect(() => {
        const po = poByIdQuery.data?.data;
        const poItems = po?.items || po?.PurchaseOrderItems || po?.orderItems || [];
        if (selectedPoId && po && loadedPoRef.current !== selectedPoId) {
            loadedPoRef.current = selectedPoId;
            if (poItems.length > 0) {
                const mapped = poItems
                    .filter((i) => i.companyStockDetailId)
                    .map((i) => ({
                        companyStockDetailId: i.companyStockDetailId,
                        purchaseOrderItemId: i.id || i.purchaseOrderItemId || '',
                        companyTaxRateId: i.companyTaxRateId || '',
                        skuCode: i.skuCode,
                        description: i.description,
                        uom: i.uom || '',
                        quantity: Number(i.orderedQuantity) || 1,
                        unitPrice: Number(i.agreedUnitCost) || 0,
                        discountPct: Number(i.discountPercentage) || 0,
                        taxPct: Number(i.taxPercentage) || 0,
                    }));
                setValue('items', mapped, { shouldValidate: true });
            }
        }
    }, [selectedPoId, poByIdQuery.data, setValue]);

    function submit(values: SupplierInvoiceCreateSchema) {
        const payload = cleanDataPayload(values);
        createMut.mutate(payload as SupplierInvoiceCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Supplier invoice saved (DRAFT)');
                    reset();
                    onClose();
                } else {
                    toast.error('Supplier invoice creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
            <DialogContent className="sm:max-w-[860px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Add Supplier Invoice</DialogTitle>
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
                                                    onSelect={(val) => {
                                                        field.onChange(val);
                                                        loadedPoRef.current = '';
                                                        setValue('purchaseOrderId', '');
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
                                    name="purchaseOrderId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Purchase Order (optional)</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={supplierPos.map((po) => ({
                                                        label: `${po.orderNumber || po.poNumber || po.id?.slice(0, 8)} - ${po.status}`,
                                                        value: po.id,
                                                    }))}
                                                    title="Purchase Order"
                                                    selectedValue={field.value}
                                                    onSelect={(val) => {
                                                        field.onChange(val);
                                                        loadedPoRef.current = '';
                                                        setValue('items', []);
                                                    }}
                                                />
                                            </FormControl>
                                            {!selectedSupplierId && (
                                                <div className="text-[10px] text-muted-foreground">Select a supplier to load its purchase orders.</div>
                                            )}
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="invoiceNumber"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Invoice Number</Label>
                                            <FormControl>
                                                <Input className="h-8 text-xs" {...field} />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="invoiceDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Invoice Date</Label>
                                            <FormControl>
                                                <Input type="date" className="h-8 text-xs" value={field.value} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="dueDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Due Date (optional)</Label>
                                            <FormControl>
                                                <Input type="date" className="h-8 text-xs" value={field.value} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Notes (optional)</Label>
                                        <FormControl>
                                            <Textarea className="h-12 resize-none text-xs" {...field} />
                                        </FormControl>
                                        <FormMessage className="!-mt-0 !text-xs" />
                                    </FormItem>
                                )}
                            />

                            <InvoiceItemsEditor
                                items={watchedItems}
                                onChange={(items) => form.setValue('items', items, { shouldValidate: true })}
                            />

                            <div className="rounded-md border border-gray-200 bg-white p-2 text-[11px] text-muted-foreground">
                                Totals are calculated by the system on posting.
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => { reset(); onClose(); }}>
                                Cancel
                            </Button>
                            <Button type="submit" className="h-8 text-xs" disabled={createMut.isPending}>
                                {createMut.isPending ? 'Saving...' : 'Save Draft Invoice'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// --------------------------------------- Items editor ---------------------------------------

interface InvoiceItemsEditorProps {
    items: InvoiceEditableItem[];
    onChange: (items: InvoiceEditableItem[]) => void;
}

const InvoiceItemsEditor = ({ items, onChange }: InvoiceItemsEditorProps) => {
    const isOnline = useNetworkStore((state) => state?.online);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

    const updateItem = (index: number, updates: Partial<InvoiceEditableItem>) => {
        onChange(items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-end">
                <Button variant="outline" type="button" className="h-7 text-xs" onClick={() => setIsItemDialogOpen(true)}>
                    + Select Product
                </Button>
            </div>

            {items.length === 0 && (
                <div className="rounded border border-dashed border-gray-300 py-6 text-center text-xs text-muted-foreground">
                    No invoice lines yet.
                </div>
            )}

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={item.companyStockDetailId} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white p-2">
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{item.description || item.skuCode}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{item.skuCode || item.companyStockDetailId}{item.uom ? ` (${item.uom})` : ''}</div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Qty</Label>
                            <Input
                                type="number"
                                min={1}
                                className="h-7 w-16 text-right text-xs"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Price</Label>
                            <Input
                                type="number"
                                min={0}
                                step={0.01}
                                className="h-7 w-20 text-right text-xs"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || 0 })}
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
                        updateItem(existing, { quantity: Number(items[existing].quantity || 0) + 1 });
                    } else {
                        onChange([
                            ...items,
                            {
                                companyStockDetailId: product.id,
                                companyTaxRateId: product.subCategory?.taxRate.id || product?.companyTaxRateId || '',
                                description: product.description,
                                skuCode: product.itemCode,
                                quantity: 1,
                                unitPrice: product?.costTypes?.latestCost || 0,
                                discountPct: 0,
                                taxPct: product.subCategory?.taxRate?.taxRatePercent || 0,
                            },
                        ]);
                    }
                    setIsItemDialogOpen(false);
                }}
            />
        </div>
    );
};

// --------------------------------------- View / Post / Cancel ---------------------------------------

interface SupplierInvoiceViewProps {
    invoiceId: string | null;
    onClose: () => void;
}

function SupplierInvoiceView({ invoiceId, onClose }: SupplierInvoiceViewProps) {
    const [reasonDraft, setReasonDraft] = useState('');
    const [cancelOpen, setCancelOpen] = useState(false);
    const postMut = usePostSupplierInvoice();
    const cancelMut = useCancelSupplierInvoice();
    const { data: queryRes } = useGetSupplierInvoiceById(invoiceId || '');
    const invoice: SupplierInvoiceDetails | undefined = queryRes?.data;

    return (
        <Dialog open={!!invoiceId} onOpenChange={(o) => { if (!o) { onClose(); setCancelOpen(false); } }}>
            <DialogContent className="sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Supplier Invoice Details</DialogTitle>
                </DialogHeader>
                {!invoice && <PageLoader isLoading={!invoice} />}
                {invoice && (
                    <div className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs">
                        <div className="flex items-start justify-between">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                <div>
                                    <span className="font-bold">Invoice :</span>{' '}
                                    {invoice.invoiceNumber || invoice.clientDocumentId || invoice.id?.slice(0, 8) || 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Status :</span>{' '}
                                    <span className={invoice.status === 'POSTED' ? 'text-green-600' : invoice.status === 'CANCELLED' ? 'text-red-600' : 'text-amber-600'}>
                                        {invoice.status || 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-bold">Supplier :</span> {invoice.CompanyCreditor?.name || 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Invoice Date :</span>{' '}
                                    {invoice.invoiceDate ? moment(invoice.invoiceDate).format('DD MMM, YY') : 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Due Date :</span>{' '}
                                    {invoice.dueDate ? moment(invoice.dueDate).format('DD MMM, YY') : 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Purchase Order :</span>{' '}
                                    {invoice.PurchaseOrder?.poNumber
                                        ? `${invoice.PurchaseOrder.poNumber}${invoice.PurchaseOrder.status ? ` (${invoice.PurchaseOrder.status})` : ''}`
                                        : invoice.purchaseOrderId?.slice(0, 8) || 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Posted :</span>{' '}
                                    {invoice.postedAt
                                        ? `${moment(invoice.postedAt).format('DD MMM, YY HH:mm')}${invoice.postedByUser ? ` by ${invoice.postedByUser}` : ''}`
                                        : 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Total Qty :</span>{' '}
                                    {invoice.totalQuantity != null ? Number(invoice.totalQuantity) : 'N/A'}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {invoice.status === 'DRAFT' && (
                                    <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        disabled={postMut.isPending}
                                        onClick={() =>
                                            postMut.mutate(invoice.id, {
                                                onSuccess: (data) => {
                                                    if (!data?.success) toast.error(data?.message || 'Failed to post');
                                                    toast.success('Invoice posted');
                                                },
                                                onError: (error) => {
                                                    // @ts-ignore
                                                    toast.error(error?.response?.data?.message || 'Failed to post');
                                                },
                                            })
                                        }
                                    >
                                        {postMut.isPending ? 'Posting...' : 'Post Invoice'}
                                    </Button>
                                )}
                                {invoice.status === 'DRAFT' && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => setCancelOpen(true)}>
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </div>

                        {invoice.notes && (
                            <div>
                                <span className="font-bold">Notes :</span> {invoice.notes}
                            </div>
                        )}
                        {invoice.cancelledAt && (
                            <div>
                                <span className="font-bold">Cancelled :</span>{' '}
                                {moment(invoice.cancelledAt).format('DD MMM, YY HH:mm')}
                                {invoice.cancelledByUser ? ` by ${invoice.cancelledByUser}` : ''}
                                {invoice.cancelReason ? ` — ${invoice.cancelReason}` : ''}
                            </div>
                        )}

                        <div className="overflow-hidden rounded border border-gray-200">
                            <table className="min-w-full text-[11px]">
                                <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="px-2 py-1">SKU</th>
                                        <th className="px-2 py-1">Description</th>
                                        <th className="px-2 py-1 text-right">Qty</th>
                                        <th className="px-2 py-1 text-right">Price</th>
                                        <th className="px-2 py-1 text-right">Disc%</th>
                                        <th className="px-2 py-1 text-right">Tax%</th>
                                        <th className="px-2 py-1 text-right">Line Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(invoice.items || invoice.SupplierInvoiceItems || []).map((item, idx) => (
                                        <tr key={item.id || item.supplierInvoiceItemId || idx} className="border-t">
                                            <td className="px-2 py-1 font-mono">
                                                {item.CompanyStockDetail?.itemCode || item.skuCode || 'N/A'}
                                            </td>
                                            <td className="px-2 py-1">
                                                {item.CompanyStockDetail?.description || item.description || item.companyStockDetailId}
                                            </td>
                                            <td className="px-2 py-1 text-right">{Number(item.quantity || 0)}</td>
                                            <td className="px-2 py-1 text-right">{Number(item.unitPrice || 0).toFixed(2)}</td>
                                            <td className="px-2 py-1 text-right">{(item.discountPct || 0).toString()}%</td>
                                            <td className="px-2 py-1 text-right">{(item.taxPct || 0).toString()}%</td>
                                            <td className="px-2 py-1 text-right">
                                                {item.lineTotal != null
                                                    ? Number(item.lineTotal).toFixed(2)
                                                    : (Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {invoice.grandTotal != null && (
                            <div className="flex flex-col gap-1 border-t border-gray-300 pt-2 text-right">
                                <div>
                                    <span className="font-bold">Goods Total :</span> {Number(invoice.goodsTotal || 0).toFixed(2)}
                                </div>
                                <div>
                                    <span className="font-bold">Discount :</span> {Number(invoice.discountAmount || 0).toFixed(2)}
                                </div>
                                <div>
                                    <span className="font-bold">Tax :</span> {Number(invoice.taxAmount || 0).toFixed(2)}
                                </div>
                                <div className="text-sm">
                                    <span className="font-bold">Grand Total :</span> {Number(invoice.grandTotal || 0).toFixed(2)}
                                </div>
                            </div>
                        )}

                        {(invoice.goodsReceivingOrders || []).length > 0 && (
                            <div className="overflow-hidden rounded border border-gray-200">
                                <div className="bg-gray-100 px-2 py-1 font-semibold">Linked Goods Receiving Vouchers</div>
                                <table className="min-w-full text-[11px]">
                                    <thead>
                                        <tr className="bg-gray-100 text-left">
                                            <th className="px-2 py-1">GRV</th>
                                            <th className="px-2 py-1">GRV Date</th>
                                            <th className="px-2 py-1 text-right">Quantity</th>
                                            <th className="px-2 py-1 text-right">Goods Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(invoice.goodsReceivingOrders || []).map((grv, idx) => (
                                            <tr key={grv.id || idx} className="border-t">
                                                <td className="px-2 py-1">
                                                    {grv.grvNumber || grv.invoiceNumber || grv.id?.slice(0, 8) || 'N/A'}
                                                </td>
                                                <td className="px-2 py-1">
                                                    {grv.grvDate ? moment(grv.grvDate).format('DD MMM, YY') : 'N/A'}
                                                </td>
                                                <td className="px-2 py-1 text-right">{grv.totalQuantity != null ? Number(grv.totalQuantity) : '—'}</td>
                                                <td className="px-2 py-1 text-right">{grv.goodsTotal != null ? Number(grv.goodsTotal).toFixed(2) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {invoice.comparison && (
                            <div className="overflow-hidden rounded border border-gray-200">
                                <div className="flex items-center justify-between bg-gray-100 px-2 py-1">
                                    <span className="font-semibold">Order / Invoice / Received Comparison</span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            invoice.comparison.matchStatus === 'MATCH'
                                                ? 'bg-green-100 text-green-700'
                                                : invoice.comparison.matchStatus === 'DIFFERENCE'
                                                  ? 'bg-amber-100 text-amber-700'
                                                  : 'bg-gray-100 text-gray-700'
                                        }`}
                                    >
                                        {invoice.comparison.matchStatus || 'N/A'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 p-2 text-[11px]">
                                    <div>
                                        <span className="font-bold">Ordered</span>
                                        <div>Qty {Number(invoice.comparison.totals?.ordered?.quantity ?? 0)}</div>
                                        <div>Value {Number(invoice.comparison.totals?.ordered?.value ?? 0).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <span className="font-bold">Invoiced</span>
                                        <div>Qty {Number(invoice.comparison.totals?.invoiced?.quantity ?? 0)}</div>
                                        <div>Value {Number(invoice.comparison.totals?.invoiced?.value ?? 0).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <span className="font-bold">Received</span>
                                        <div>Qty {Number(invoice.comparison.totals?.received?.quantity ?? 0)}</div>
                                        <div>Value {Number(invoice.comparison.totals?.received?.value ?? 0).toFixed(2)}</div>
                                    </div>
                                </div>
                                {(invoice.comparison.lines || []).length > 0 && (
                                    <table className="min-w-full text-[11px]">
                                        <thead>
                                            <tr className="bg-gray-100 text-left">
                                                <th className="px-2 py-1">SKU</th>
                                                <th className="px-2 py-1">Description</th>
                                                <th className="px-2 py-1 text-right">Ordered</th>
                                                <th className="px-2 py-1 text-right">Invoiced</th>
                                                <th className="px-2 py-1 text-right">Received</th>
                                                <th className="px-2 py-1 text-right">Inv-Rcvd Diff</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(invoice.comparison.lines || []).map((line, idx) => (
                                                <tr key={line.companyStockDetailId || idx} className="border-t">
                                                    <td className="px-2 py-1 font-mono">{line.skuCode || line.companyStockDetailId?.slice(0, 8) || 'N/A'}</td>
                                                    <td className="px-2 py-1">{line.description || 'N/A'}</td>
                                                    <td className="px-2 py-1 text-right">{Number(line.ordered?.quantity ?? 0)} / {Number(line.ordered?.value ?? 0).toFixed(2)}</td>
                                                    <td className="px-2 py-1 text-right">{Number(line.invoiced?.quantity ?? 0)} / {Number(line.invoiced?.value ?? 0).toFixed(2)}</td>
                                                    <td className="px-2 py-1 text-right">{Number(line.received?.quantity ?? 0)} / {Number(line.received?.value ?? 0).toFixed(2)}</td>
                                                    <td className="px-2 py-1 text-right">
                                                        {Number(line.differences?.invoiceVsReceived?.quantity ?? 0)} /{' '}
                                                        {Number(line.differences?.invoiceVsReceived?.value ?? 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {cancelOpen && (
                            <div className="flex items-center gap-2 rounded-md border border-dashed border-red-300 bg-red-50/50 p-2">
                                <Label className="text-xs">Cancel reason</Label>
                                <Input className="h-7 flex-1 text-xs" value={reasonDraft} onChange={(e) => setReasonDraft(e.target.value)} placeholder="e.g. Erroneous invoice" />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-red-600"
                                    disabled={cancelMut.isPending}
                                    onClick={() =>
                                        cancelMut.mutate(
                                            { id: invoice.id, cancelReason: reasonDraft || 'Cancelled' },
                                            {
                                                onSuccess: (data) => {
                                                    if (!data?.success) toast.error(data?.message || 'Failed to cancel');
                                                    setCancelOpen(false);
                                                    toast.success('Invoice cancelled');
                                                },
                                                onError: (error) => {
                                                    // @ts-ignore
                                                    toast.error(error?.response?.data?.message || 'Failed to cancel');
                                                },
                                            },
                                        )
                                    }
                                >
                                    Cancel Invoice
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default SupplierInvoicesTab;