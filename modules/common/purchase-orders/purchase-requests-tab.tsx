'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Plus, Trash2 } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/Multi-select';
import SelectPopover from '@/components/select-popover';
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
import { cleanDataPayload } from '@/utils/helpers';
import { useNetworkStore } from '@/stores/network.store';
import {
    PURCHASE_REQUEST_STATUSES,
    PurchaseRequestDetails,
    PurchaseRequestItem,
    PurchaseRequestListFilters,
    useGetPurchaseRequestList,
    useGetPurchaseRequestById,
    useCreatePurchaseRequest,
    useClosePurchaseRequest,
    useCancelPurchaseRequest,
    purchaseRequestCreateSchema,
    type PurchaseRequestCreateSchema,
} from '@/api-queries/purchase-requests';

interface PurchaseRequestsTabProps {
    openSupplierQuotationsTab: (purchaseRequestId: string) => void;
}

const PurchaseRequestsTab = ({ openSupplierQuotationsTab }: PurchaseRequestsTabProps) => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const suppliers = useCreditorList({})?.data?.data?.rows || [];

    const initialFilters: PurchaseRequestListFilters = {
        search: '',
        status: '',
    };

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<PurchaseRequestListFilters>(initialFilters);

    const query = useGetPurchaseRequestList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.status ? { status: appliedFilters.status } : {}),
    });

    const { data, isLoading } = query;
    const totalRowCount = query?.data?.total || 0;

    const columns: ColumnDef<PurchaseRequestDetails>[] = [
        {
            accessorKey: 'ref',
            header: (data) => <TableHeaderToggle {...data}>Reference</TableHeaderToggle>,
            cell: ({ row }) => (
                <>
                    <div>{row.original.prNumber || row.original.clientDocumentId || row.original.documentNumber || row.original.id?.slice(0, 8) || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">
                        {row.original.createdAt ? moment(row.original.createdAt).format('Do MMM, YY') : 'N/A'}
                    </div>
                </>
            ),
        },
        {
            accessorKey: 'warehouseId',
            header: (data) => <TableHeaderToggle {...data}>Warehouse</TableHeaderToggle>,
            cell: ({ row }) => row.original.Warehouse?.warehouse || row.original.Warehouse?.name || row.original.warehouseId?.slice(0, 8) || 'N/A',
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = row.original.status;
                const color =
                    status === 'CANCELLED'
                        ? 'text-red-600'
                        : status === 'OPEN'
                          ? 'text-blue-600'
                          : status === 'CLOSED'
                            ? 'text-green-600'
                            : 'text-amber-600';
                return <span className={`font-medium ${color}`}>{status || 'N/A'}</span>;
            },
        },
        {
            accessorKey: 'requiredByDate',
            header: (data) => <TableHeaderToggle {...data}>Required By</TableHeaderToggle>,
            cell: ({ row }) =>
                row.original.requiredByDate ? moment(row.original.requiredByDate).format('DD MMM, YY') : 'N/A',
        },
        {
            accessorKey: 'totalQuantity',
            header: (data) => <TableHeaderToggle {...data}>Quantity</TableHeaderToggle>,
            cell: ({ row }) => row.original.itemCount ?? row.original.totalQuantity ?? 'N/A',
        },
        {
            accessorKey: 'estimatedTotal',
            header: (data) => <TableHeaderToggle {...data}>Est. Total</TableHeaderToggle>,
            cell: ({ row }) => {
                const rows = row.original.items || row.original.PurchaseRequestItems || [];
                if (rows.length > 0) {
                    const total = rows.reduce(
                        (sum, it) => sum + (it.requestedQuantity || 0) * (it.estimatedUnitCost || 0),
                        0,
                    );
                    return `${currencySymbol} ${total.toFixed(2)}`;
                }
                return row.original.estimatedTotal != null
                    ? `${currencySymbol} ${Number(row.original.estimatedTotal).toFixed(2)}`
                    : 'N/A';
            },
        },
        {
            accessorKey: 'candidateSupplierIds',
            header: (data) => <TableHeaderToggle {...data}>Candidates</TableHeaderToggle>,
            cell: ({ row }) => {
                const ids = row.original.candidateSupplierIds || [];
                const names = ids
                    .map((id) => suppliers.find((s) => s.id === id)?.name)
                    .filter(Boolean)
                    .slice(0, 2);
                return (
                    <div className="max-w-[180px] truncate text-xs" title={names.join(', ')}>
                        {names.length ? names.join(', ') : ids.length ? `${ids.length} suppliers` : '—'}
                    </div>
                );
            },
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
                        title="View / Close / Cancel"
                        onClick={() => setSelectedRequestId(row.original.id)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
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
                                placeholder="Search by reference / item..."
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
                                options={PURCHASE_REQUEST_STATUSES.map((s) => ({ label: s, value: s }))}
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
                            Add Purchase Request
                        </Button>
                    </div>
                </DataTable>

                <PurchaseRequestForm open={isFormOpen} onClose={() => setIsFormOpen(false)} />

                <PurchaseRequestView
                    requestId={selectedRequestId}
                    onClose={() => setSelectedRequestId(null)}
                    onOpenQuotations={openSupplierQuotationsTab}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{ description: "You don't have access to add/update the purchase requests." }}
            />
        </PageLoader>
    );
};

// --------------------------------------- Create form ---------------------------------------

interface PurchaseRequestFormProps {
    open: boolean;
    onClose: () => void;
}

const PurchaseRequestForm = ({ open, onClose }: PurchaseRequestFormProps) => {
    const suppliers = useCreditorList({})?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 1000, offset: 0 });
    const warehouses = Array.isArray(warehousesRes?.data?.data)
        ? (warehousesRes.data.data as { id: string; name?: string; warehouse?: string; description?: string }[])
        : ((((warehousesRes?.data?.data as unknown as
              | { rows?: { id: string; name?: string; warehouse?: string; description?: string }[] }
              | undefined)?.rows ||
              []) as { id: string; name?: string; warehouse?: string; description?: string }[]));

    const createMut = useCreatePurchaseRequest();

    const form = useForm<PurchaseRequestCreateSchema>({
        resolver: zodResolver(purchaseRequestCreateSchema),
        defaultValues: {
            warehouseId: '',
            requiredByDate: '',
            clientDocumentId: '',
            candidateSupplierIds: [],
            notes: '',
            items: [],
            timezone: momentTimezone.tz.guess(),
        },
    });

    const { handleSubmit, control, reset } = form;
    const watchedItems = (useWatch({ control, name: 'items' }) || []) as PurchaseRequestItem[];
    const selectedCandidateIds = (useWatch({ control, name: 'candidateSupplierIds' }) || []) as string[];

    function onSubmit(values: PurchaseRequestCreateSchema) {
        const payload = cleanDataPayload(values);
        createMut.mutate(payload as PurchaseRequestCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Purchase request created successfully');
                    reset();
                    onClose();
                } else {
                    toast.error('Purchase request creation failed');
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
            <DialogContent className="sm:max-w-[760px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Add New Purchase Request</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs">
                        <div className="max-h-[70vh] space-y-3 overflow-auto">
                            <div className="grid grid-cols-2 items-start gap-3">
                                <FormField
                                    control={control}
                                    name="warehouseId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Warehouse</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={(warehouses || []).map((w) => ({
                                                        label: w.warehouse || w.description || w.name || w.id,
                                                        value: w.id,
                                                    }))}
                                                    title="Warehouse"
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
                                    name="requiredByDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Required By Date</Label>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    className="h-8 text-xs"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="clientDocumentId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Client Document Reference (optional)</Label>
                                            <FormControl>
                                                <Input className="h-8 text-xs" {...field} />
                                            </FormControl>
                                            <FormMessage className="!-mt-0 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="candidateSupplierIds"
                                    render={() => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Candidate Suppliers (optional)</Label>
                                            <FormControl>
                                                <MultiSelect
                                                    options={(suppliers || []).map((s) => ({
                                                        label: `${s.name} (${s.accountNumber})`,
                                                        value: s.id,
                                                    }))}
                                                    value={selectedCandidateIds}
                                                    onChange={(values) => form.setValue('candidateSupplierIds', values)}
                                                />
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

                            <RequestItemsEditor
                                items={watchedItems}
                                onChange={(items) => form.setValue('items', items, { shouldValidate: true })}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => { reset(); onClose(); }}>
                                Cancel
                            </Button>
                            <Button type="submit" className="h-8 text-xs" disabled={createMut.isPending}>
                                {createMut.isPending ? 'Creating...' : 'Create Purchase Request'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// --------------------------------------- Items editor ---------------------------------------

interface RequestItemsEditorProps {
    items: PurchaseRequestItem[];
    onChange: (items: PurchaseRequestItem[]) => void;
}

const RequestItemsEditor = ({ items, onChange }: RequestItemsEditorProps) => {
    const isOnline = useNetworkStore((state) => state?.online);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

    const updateItem = (index: number, updates: Partial<PurchaseRequestItem>) => {
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
                    No items added yet.
                </div>
            )}

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={item.companyStockDetailId} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white p-2">
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{item.description || item.skuCode}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{item.skuCode || item.companyStockDetailId}</div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Qty</Label>
                            <Input
                                type="number"
                                min={1}
                                className="h-7 w-16 text-right text-xs"
                                value={item.requestedQuantity}
                                onChange={(e) => updateItem(index, { requestedQuantity: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Est. Cost</Label>
                            <Input
                                type="number"
                                min={0}
                                step={0.01}
                                className="h-7 w-20 text-right text-xs"
                                value={item.estimatedUnitCost}
                                onChange={(e) => updateItem(index, { estimatedUnitCost: Number(e.target.value) || 0 })}
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
                        updateItem(existing, { requestedQuantity: items[existing].requestedQuantity + 1 });
                    } else {
                        onChange([
                            ...items,
                            {
                                companyStockDetailId: product.id,
                                description: product.description,
                                skuCode: product.itemCode,
                                requestedQuantity: 1,
                                estimatedUnitCost: 0,
                            },
                        ]);
                    }
                    setIsItemDialogOpen(false);
                }}
            />
        </div>
    );
};

// --------------------------------------- View / Close / Cancel ---------------------------------------

interface PurchaseRequestViewProps {
    requestId: string | null;
    onClose: () => void;
    onOpenQuotations: (purchaseRequestId: string) => void;
}

function PurchaseRequestView({ requestId, onClose, onOpenQuotations }: PurchaseRequestViewProps) {
    const [reasonDraft, setReasonDraft] = useState('');
    const [action, setAction] = useState<'close' | 'cancel' | null>(null);
    const closeMut = useClosePurchaseRequest();
    const cancelMut = useCancelPurchaseRequest();
    const { data: queryRes } = useGetPurchaseRequestById(requestId || '');
    const activePr: PurchaseRequestDetails | undefined = queryRes?.data;

    return (
        <Dialog open={!!requestId} onOpenChange={(o) => { if (!o) { onClose(); setAction(null); } }}>
            <DialogContent className="sm:max-w-[760px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Purchase Request Details</DialogTitle>
                </DialogHeader>
                {!activePr && <PageLoader isLoading={!activePr} />}
                {activePr && (
                    <div className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs">
                        <div className="flex items-start justify-between">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                <div>
                                    <span className="font-bold">Reference :</span>{' '}
                                    {activePr.prNumber ||
                                        activePr.clientDocumentId ||
                                        activePr.documentNumber ||
                                        activePr.id?.slice(0, 8) ||
                                        'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Status :</span>{' '}
                                    <span className={activePr.status === 'CANCELLED' ? 'text-red-600' : activePr.status === 'CLOSED' ? 'text-green-600' : 'text-blue-600'}>
                                        {activePr.status || 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-bold">Warehouse :</span>{' '}
                                    {activePr.Warehouse?.warehouse ||
                                        activePr.Warehouse?.name ||
                                        activePr.warehouseId?.slice(0, 8) ||
                                        'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Required By :</span>{' '}
                                    {activePr.requiredByDate ? moment(activePr.requiredByDate).format('DD MMM, YY') : 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Created :</span>{' '}
                                    {activePr.createdAt ? moment(activePr.createdAt).format('DD MMM, YY HH:mm') : 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Total Qty :</span> {activePr.itemCount ?? activePr.totalQuantity ?? 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold">Quotes :</span> {activePr.quotationCount ?? '0'}
                                </div>
                                <div>
                                    <span className="font-bold">POs :</span> {activePr.purchaseOrderCount ?? '0'}
                                </div>
                                <div>
                                    <span className="font-bold">Requested By :</span>{' '}
                                    {activePr.requestedByUser || activePr.addedByUser || 'N/A'}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {activePr.status === 'OPEN' && (
                                    <Button size="sm" className="h-7 text-xs" onClick={() => { setReasonDraft(''); setAction('close'); }}>
                                        Close
                                    </Button>
                                )}
                                {(activePr.status === 'DRAFT' || activePr.status === 'OPEN') && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs text-red-600"
                                        onClick={() => { setReasonDraft(''); setAction('cancel'); }}
                                    >
                                        Cancel Request
                                    </Button>
                                )}
                                {activePr.status === 'OPEN' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => onOpenQuotations(activePr.id)}
                                    >
                                        View Quotations
                                    </Button>
                                )}
                            </div>
                        </div>

                        {action && (
                            <div className="flex items-center gap-2 rounded-md border border-dashed border-blue-300 bg-blue-50/50 p-2">
                                <Label className="text-xs">{action === 'close' ? 'Close reason (optional)' : 'Cancel reason'}</Label>
                                <Input
                                    className="h-7 flex-1 text-xs"
                                    value={reasonDraft}
                                    onChange={(e) => setReasonDraft(e.target.value)}
                                        placeholder={action === 'close' ? 'e.g. No longer needed' : 'e.g. Raised in error'}
                                />
                                <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={(closeMut.isPending || cancelMut.isPending) && !!action}
                                    onClick={() => {
                                        if (action === 'close') {
                                            closeMut.mutate(activePr.id, {
                                                onSuccess: (data) => {
                                                    if (!data?.success) toast.error(data?.message || 'Failed to close');
                                                    setAction(null);
                                                    toast.success('Purchase request closed');
                                                },
                                                onError: (error) => {
                                                    // @ts-ignore
                                                    toast.error(error?.response?.data?.message || 'Failed to close');
                                                },
                                            });
                                        } else {
                                            cancelMut.mutate(
                                                { id: activePr.id, cancelReason: reasonDraft || 'Cancelled' },
                                                {
                                                    onSuccess: (data) => {
                                                        if (!data?.success) toast.error(data?.message || 'Failed to cancel');
                                                        setAction(null);
                                                        toast.success('Purchase request cancelled');
                                                    },
                                                    onError: (error) => {
                                                        // @ts-ignore
                                                        toast.error(error?.response?.data?.message || 'Failed to cancel');
                                                    },
                                                },
                                            );
                                        }
                                    }}
                                >
                                    {action === 'close' ? 'Close' : 'Cancel'}
                                </Button>
                            </div>
                        )}

                        {activePr.notes && (
                            <div>
                                <span className="font-bold">Notes :</span> {activePr.notes}
                            </div>
                        )}
                        {activePr.cancelReason && (
                            <div>
                                <span className="font-bold">Cancel Reason :</span> {activePr.cancelReason}
                            </div>
                        )}
                        {activePr.closeReason && (
                            <div>
                                <span className="font-bold">Close Reason :</span> {activePr.closeReason}
                            </div>
                        )}

                        <div className="overflow-hidden rounded border border-gray-200">
                            <table className="min-w-full text-[11px]">
                                <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="px-2 py-1">SKU</th>
                                        <th className="px-2 py-1">Description</th>
                                        <th className="px-2 py-1 text-right">Requested Qty</th>
                                        <th className="px-2 py-1 text-right">Est. Unit Cost</th>
                                        <th className="px-2 py-1 text-right">Est. Line Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(activePr.items || activePr.PurchaseRequestItems || []).map((item, idx) => (
                                        <tr key={item.id || item.purchaseRequestItemId || idx} className="border-t">
                                            <td className="px-2 py-1 font-mono">{item.skuCode || 'N/A'}</td>
                                            <td className="px-2 py-1">{item.description || item.companyStockDetailId}</td>
                                            <td className="px-2 py-1 text-right">{item.requestedQuantity ?? '0'}</td>
                                            <td className="px-2 py-1 text-right">{Number(item.estimatedUnitCost || 0).toFixed(2)}</td>
                                            <td className="px-2 py-1 text-right">
                                                {(item.requestedQuantity || 0) * (item.estimatedUnitCost || 0) ? 
                                                    ((item.requestedQuantity || 0) * (item.estimatedUnitCost || 0)).toFixed(2) : '0.00'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default PurchaseRequestsTab;