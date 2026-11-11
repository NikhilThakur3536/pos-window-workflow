'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import SelectPopover from '@/components/select-popover';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { toast } from 'sonner';
import { Plus, Eye, Loader2, Wand2, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    useGetDebtorInvoicingOrders,
    useGetDebtorInvoicingOrderById,
    useCreateDebtorInvoicingOrder,
    useQuantityRecommendation,
    type CreateDebtorInvoicingOrderInput,
    type AccountSaleApprovalTokens,
    type QuantityRecommendationItem,
    type GetQuantityRecommendationResponse,
} from '@/api-queries/debtor-invoicing-orders';
import type { ColumnDef } from '@tanstack/react-table';
import { ProductSelection } from '@/modules/common/hoc/product-selection';
import type { StockDetails } from '@/api-queries/company/stock-details';
import type { CartItemPricingType } from '@/api-queries/point-of-sale';
import type { AccountSalesDetails } from '@/api-queries/point-of-sale/account-sales/account-sales';
import { useDebtorList } from '@/api-queries/debtor';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useAuthUser } from '@/stores/auth-user.store';
import { useNetworkStore } from '@/stores/network.store';
import { useInvoiceCountState } from '@/stores/invoice-count.store';
import { generateInvoiceNumber } from '@/utils/helpers';
import moment from 'moment-timezone';
import { useGetStockDispositions, nstVersion, StockDisposition } from '@/api-queries/nst';

interface RecommendationCartItem {
    id: string;
    itemCode: string;
    barcode: string;
    description: string;
    stockOnHand: number;
    companyStockPricingId: string;
    companyStockPricingTypeId: string;
    companyTaxRateId: string;
    unitPrice: number;
    quantity: number;
    requestedQuantity: number;
    discount: number;
    lineTotal: number;
    recommendedQuantity?: number;
    accountSaleCurrentInventory?: number;
    accountSaleDailySalesRate?: number;
    accountSaleWeeklySalesRate?: number;
    accountSaleMonthlySalesRate?: number;
    accountSaleTargetStockDays?: number;
    accountSaleSeasonalUpliftPercent?: number;
    accountSaleQuantityOverride?: boolean;
    stockDispositionId?: string;
    stockDispositionVersion?: number;
    dispositionType?: string;
    originalUnitPrice?: number;
    dispositionDiscountAmount?: number;
}

const Orders = () => {
    const [createOpen, setCreateOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState<AccountSalesDetails | null>(null);

    const { filters, setFilters, appliedFilters, pagination, setPagination } = useTableFilters<{ search: string }>({
        search: '',
    });

    const query = useGetDebtorInvoicingOrders({
        ...(appliedFilters.search ? { search: appliedFilters.search } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: AccountSalesDetails[] = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const handleSearch = (value: string) => {
        setFilters({ ...filters, search: value });
    };

    const columns: ColumnDef<AccountSalesDetails>[] = useMemo(
        () => [
            {
                accessorKey: 'invoiceNumber',
                header: 'Invoice',
                cell: ({ row }) => (
                    <span className="font-mono text-xs font-semibold">{row.original.invoiceNumber || row.original.id}</span>
                ),
            },
            {
                accessorKey: 'companyDebtorId',
                header: 'Debtor / Store',
                cell: ({ row }) => {
                    const debtorName = row.original.CompanyDebtor?.name || row.original.name;
                    const account = row.original.CompanyDebtor?.accountNumber;
                    return (
                        <div>
                            <div className="text-sm font-medium">{debtorName || '—'}</div>
                            {account ? <div className="text-xs text-muted-foreground">{account}</div> : null}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'invoiceDate',
                header: 'Date',
                cell: ({ row }) =>
                    row.original.invoiceDate ? new Date(row.original.invoiceDate).toLocaleDateString() : '—',
            },
            {
                accessorKey: 'totalQuantity',
                header: 'Qty',
                cell: ({ row }) => Number(row.original.totalQuantity ?? 0).toFixed(0),
            },
            {
                accessorKey: 'discountAmount',
                header: 'Discount',
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums">{Number(row.original.discountAmount ?? 0).toFixed(2)}</span>
                ),
            },
            {
                accessorKey: 'goodsTotal',
                header: 'Total',
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums font-semibold">
                        {Number(row.original.goodsTotal ?? 0).toFixed(2)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: () => <div className="text-center">Actions</div>,
                cell: ({ row }) => (
                    <div className="flex items-center justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="View"
                            onClick={() => setViewTarget(row.original)}
                        >
                            <Eye className="h-4 w-4 text-gray-600" />
                        </Button>
                    </div>
                ),
            },
        ],
        [],
    );

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-4 px-2">
                <DataTable
                    query={query}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="flex items-end gap-3">
                                <div>
                                    <Label className="text-xs">Search</Label>
                                    <Input
                                        className="mt-1 w-[240px]"
                                        placeholder="Invoice number, debtor name…"
                                        value={filters.search}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSearch(filters.search);
                                        }}
                                    />
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleSearch(filters.search)}>
                                    Search
                                </Button>
                            </div>
                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateOpen(true)}>
                                <Plus className="mr-1 h-4 w-4" /> New Order
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">Showing {totalRowCount} orders</div>
                    </div>
                </DataTable>

                <CreateOrderDialog open={createOpen} onClose={() => setCreateOpen(false)} />

                {viewTarget && <OrderViewDialog record={viewTarget} onClose={() => setViewTarget(null)} />}
            </div>
        </PageLoader>
    );
};

// --------------------------------------- View ---------------------------------------

const OrderViewDialog = ({ record, onClose }: { record: AccountSalesDetails; onClose: () => void }) => {
    const { data: res, isLoading } = useGetDebtorInvoicingOrderById(record.id);

    interface InvoiceItemLike {
        itemCode?: string;
        description?: string;
        quantity?: number;
        unitPrice?: number;
        lineTotal?: number;
        CompanyStockDetail?: { description?: string };
    }

    const order = (res?.data || record) as AccountSalesDetails & {
        DebtorInvoicingOrderItems?: InvoiceItemLike[];
    };
    const items: InvoiceItemLike[] = order.DebtorInvoicingOrderItems || order.items || [];

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Debtor Invoicing Order — {order.invoiceNumber || order.id}</DialogTitle>
                </DialogHeader>
                <PageLoader isLoading={isLoading}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                            <div>
                                <div className="text-muted-foreground">Debtor / Store</div>
                                <div className="font-medium">
                                    {order.CompanyDebtor?.name || order.name || order.companyDebtorId || '—'}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Date</div>
                                <div className="font-medium">
                                    {order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString() : '—'}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Total</div>
                                <div className="font-mono font-medium">{Number(order.goodsTotal ?? 0).toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Items</div>
                                <div className="font-medium">{Number(order.totalQuantity ?? 0).toFixed(0)}</div>
                            </div>
                        </div>

                        {Array.isArray(order.items) || Array.isArray(items) ? (
                            <div>
                                <div className="mb-1 text-sm font-medium">Items</div>
                                <div className="max-h-[40vh] overflow-y-auto rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="border-b text-left text-xs text-muted-foreground">
                                            <tr>
                                                <th className="p-2">Code</th>
                                                <th className="p-2">Description</th>
                                                <th className="p-2 text-right">Qty</th>
                                                <th className="p-2 text-right">Unit Price</th>
                                                <th className="p-2 text-right">Line Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr key={index} className="border-b">
                                                    <td className="p-2 font-mono text-xs">{item.itemCode || '—'}</td>
                                                    <td className="p-2">{item.description || item.CompanyStockDetail?.description || '—'}</td>
                                                    <td className="p-2 text-right">{item.quantity}</td>
                                                    <td className="p-2 text-right">{Number(item.unitPrice ?? 0).toFixed(2)}</td>
                                                    <td className="p-2 text-right font-medium">{Number(item.lineTotal ?? 0).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
};

// --------------------------------------- Create ---------------------------------------

interface CreateOrderDialogProps {
    open: boolean;
    onClose: () => void;
}

const CreateOrderDialog = ({ open, onClose }: CreateOrderDialogProps) => {
    const isOnline = useNetworkStore((state) => state?.online);
    const { asInvoiceCount, setASInvoiceCount } = useInvoiceCountState();
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    // Active stock-disposition (NST) batches. Only ACTIVE dispositions are sellable.
    const activeDispositions: StockDisposition[] =
        useGetStockDispositions({ status: 'ACTIVE', limit: 500 })?.data?.data?.rows || [];

    const dispositionByProduct = useMemo(() => {
        const map: Record<string, StockDisposition> = {};
        for (const d of activeDispositions) {
            if (!d.companyStockDetailId) continue;
            if (map[d.companyStockDetailId]) {
                if ((d.remainingQuantity ?? 0) < (map[d.companyStockDetailId].remainingQuantity ?? 0)) {
                    map[d.companyStockDetailId] = d;
                }
            } else {
                map[d.companyStockDetailId] = d;
            }
        }
        return map;
    }, [activeDispositions]);

    const { data: debtorRes } = useDebtorList({ companyDebtorType: 'COMPANY_OWNED', limit: 1000, offset: 0 });
    const stores = debtorRes?.data?.rows || [];

    const createMutation = useCreateDebtorInvoicingOrder();
    const recommendationMutation = useQuantityRecommendation();
    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();

    const [storeId, setStoreId] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<RecommendationCartItem[]>([]);
    const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const selectedDebtor = useMemo(() => stores.find((s) => s.id === storeId), [stores, storeId]);

    const invoiceNumber = useMemo(() => generateInvoiceNumber('AS', asInvoiceCount + 1), [asInvoiceCount, open]);

    const pendingMetaRef = useRef<{
        payload: CreateDebtorInvoicingOrderInput;
        approvedTokens: AccountSaleApprovalTokens;
    } | null>(null);

    const goodsTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = items.reduce((sum, item) => sum + item.discount, 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const hasQuantityOverride = items.some(
        (item) => item.recommendedQuantity != null && item.quantity !== item.recommendedQuantity,
    );
    const hasDiscountOverride = items.some((item) => item.discount > 0);

    const resetState = () => {
        setStoreId('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setItems([]);
        pendingMetaRef.current = null;
    };

    const handleSelectProduct = (product: StockDetails, companyStockPrice: CartItemPricingType | null) => {
        if (!companyStockPrice) {
            toast.error('Invalid pricing! Please choose another product.');
            return;
        }
        setIsProductSelectionOpen(false);

        const baseUnitPrice = companyStockPrice.priceInclusive || 0;
        const existing = items.find((item) => item.id === product.id);
        if (existing) {
            toast.error('This item is already on the order.');
            return;
        }

        const disposition = dispositionByProduct[product.id];
        // The backend owns the discounted price: use its allocation price verbatim and
        // never recompute it from the rule's discount. A priced allocation is required.
        const dispositionPrice = disposition ? (disposition.discountedUnitPrice ?? disposition.unitPrice) : undefined;
        if (disposition && (dispositionPrice == null || dispositionPrice <= 0)) {
            toast.error('This discounted-stock record has no sellable price.');
            return;
        }
        const unitPrice = dispositionPrice ?? baseUnitPrice;

        const newItem: RecommendationCartItem = {
            id: product.id,
            itemCode: product.itemCode,
            barcode: product.barcode,
            description: product.description,
            stockOnHand: product.stockOnHand,
            companyStockPricingId: companyStockPrice.id,
            companyStockPricingTypeId: companyStockPrice.companyStockPricingTypeId,
            companyTaxRateId: product.companyTaxRateId || '',
            unitPrice,
            quantity: 1,
            requestedQuantity: 1,
            discount: 0,
            lineTotal: unitPrice,
            ...(disposition
                ? {
                      stockDispositionId: disposition.id,
                      stockDispositionVersion: nstVersion(disposition),
                      dispositionType: disposition.dispositionType,
                      originalUnitPrice: baseUnitPrice,
                      dispositionDiscountAmount: Math.round((baseUnitPrice - unitPrice) * 100) / 100,
                  }
                : {}),
        };
        setItems((prev) => [...prev, newItem]);
    };

    const mergeRecommendationRows = (rows: QuantityRecommendationItem[]) => {
        setItems((prev) =>
            prev.map((item) => {
                const rec = rows.find((row) => row.companyStockDetailId === item.id);
                if (!rec) return item;
                return {
                    ...item,
                    requestedQuantity: item.quantity,
                    recommendedQuantity: rec.accountSaleRecommendedQuantity ?? item.quantity,
                    quantity: rec.accountSaleRecommendedQuantity ?? item.quantity,
                    accountSaleCurrentInventory: rec.accountSaleCurrentInventory,
                    accountSaleDailySalesRate: rec.accountSaleDailySalesRate,
                    accountSaleWeeklySalesRate: rec.accountSaleWeeklySalesRate,
                    accountSaleMonthlySalesRate: rec.accountSaleMonthlySalesRate,
                    accountSaleTargetStockDays: rec.accountSaleTargetStockDays,
                    accountSaleSeasonalUpliftPercent: rec.accountSaleSeasonalUpliftPercent,
                    accountSaleQuantityOverride: rec.accountSaleQuantityOverride,
                    lineTotal: (rec.accountSaleRecommendedQuantity ?? item.quantity) * item.unitPrice - item.discount,
                };
            }),
        );
    };

    const getRecommendations = () => {
        if (!storeId) return toast.error('Select a store first');
        if (!items.length) return toast.error('Add at least one product first');

        recommendationMutation.mutate(
            { companyDebtorId: storeId, items: items.map((item) => ({ companyStockDetailId: item.id, quantity: item.quantity })) },
            {
                onSuccess: (response: GetQuantityRecommendationResponse) => {
                    const rows = Array.isArray(response?.data)
                        ? response.data
                        : response?.data?.rows || [];
                    if (!rows.length) {
                        toast.warning('No recommendations returned');
                        return;
                    }
                    mergeRecommendationRows(rows);
                    toast.success('Quantity recommendations applied');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Failed to get recommendations');
                },
            },
        );
    };

    const setLineQuantity = (index: number, quantity: number) => {
        setItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? { ...item, quantity, lineTotal: item.unitPrice * quantity - item.discount }
                    : item,
            ),
        );
    };

    const setLineDiscount = (index: number, discount: number) => {
        const safe = Math.max(0, discount);
        setItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? { ...item, discount: safe, lineTotal: item.unitPrice * item.quantity - safe }
                    : item,
            ),
        );
    };

    const removeLine = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const buildPayload = (): CreateDebtorInvoicingOrderInput => {
        return {
            companyDebtorId: storeId,
            name: selectedDebtor?.name || selectedDebtor?.tradingAs || '',
            address: selectedDebtor?.deliveryAddress || '',
            telephone: selectedDebtor?.telephoneNumberOne || '',
            email: selectedDebtor?.emailAddress || '',
            timezone: moment.tz.guess(),
            invoiceDiscountPercentage: 0,
            documentGpPercentage: 0,
            invoiceDate,
            invoiceNumber,
            invoiceMemo: '',
            invoiceInclusive: 'Yes',
            goodsTotal: +goodsTotal.toFixed(2),
            discountAmount: +discountAmount.toFixed(2),
            taxAmount: 0,
            totalQuantity,
            totalFreeQuantity: 0,
            items: items.map((item) => ({
                companyStockDetailId: item.id,
                companyStockPricingId: item.companyStockPricingId,
                companyStockPricingTypeId: item.companyStockPricingTypeId,
                companyTaxRateId: item.companyTaxRateId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                lineTotal: +item.lineTotal.toFixed(2),
                ...(item.stockDispositionId
                    ? {
                          stockDispositionId: item.stockDispositionId,
                          stockDispositionVersion: item.stockDispositionVersion,
                      }
                    : {}),
            })),
        };
    };

    const handleSuccess = (data: { success: boolean; message?: string }) => {
        if (data?.success) {
            toast.success('Debtor invoicing order created successfully');
            setASInvoiceCount(asInvoiceCount + 1);
            resetState();
            onClose();
        } else {
            toast.error(data?.message || 'Create failed');
        }
    };

    const submitWithToken = (input: CreateDebtorInvoicingOrderInput) => {
        createMutation
            .mutateAsync(input)
            .then((data) => {
                setIsPending(false);
                handleSuccess(data);
            })
            .catch((error) => {
                setIsPending(false);
                const info = isApprovalRequiredError(error);
                if (info) {
                    pendingMetaRef.current = { payload: input, approvedTokens: {} };
                    setApproval({ ...info, actionLabel: 'Create Debtor Invoicing Order' });
                } else {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleSubmit = () => {
        if (!storeId) return toast.error('Select a store');
        if (!items.length) return toast.error('Add at least one product');
        submitWithToken(buildPayload());
    };

    const handleApproved = (token: string, tokens?: Record<string, string>) => {
        setIsPending(true);
        const meta = pendingMetaRef.current;
        if (!meta) {
            setIsPending(false);
            closeApproval();
            return;
        }

        // The 428 may bundle multiple approvals; the dialog approves each
        // approvalRequestId and returns actionCode -> approvalToken. Submit once
        // with every token in the approvalTokens body.
        const approvedTokens: AccountSaleApprovalTokens = { ...meta.approvedTokens, ...(tokens || {}) };
        const tokenValues = Object.values(approvedTokens).filter(Boolean) as string[];
        const needsBodyTokens = tokenValues.length > 1;
        const headerToken = needsBodyTokens ? '' : token || tokenValues[0] || '';

        createMutation
            .mutateAsync({
                ...meta.payload,
                ...(needsBodyTokens ? { approvalTokens: approvedTokens } : {}),
                ...(headerToken ? { approvalToken: headerToken } : {}),
            })
            .then((data) => {
                setIsPending(false);
                pendingMetaRef.current = null;
                closeApproval();
                handleSuccess(data);
            })
            .catch((error) => {
                setIsPending(false);
                const info = isApprovalRequiredError(error);
                if (info) {
                    pendingMetaRef.current = { payload: meta.payload, approvedTokens };
                    setApproval({ ...info, actionLabel: 'Create Debtor Invoicing Order' });
                } else {
                    closeApproval();
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    return (
        <Dialog open={open} onOpenChange={() => { if (!isPending) onClose(); }}>
            <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Create Debtor Invoicing Order</DialogTitle>
                    <DialogDescription>
                        Invoice <span className="font-mono">{invoiceNumber}</span>. Quantities can be recommended from the store&apos;s
                        sales rate and seasonal uplift settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <div className="mb-1 text-sm font-medium text-muted-foreground">Company Owned Store</div>
                            <SelectPopover
                                title="Store"
                                onlyTitle="Select store"
                                selectedValue={storeId || ''}
                                options={stores.map((s) => ({ label: `${s.name || s.tradingAs || s.id} (${s.accountNumber})`, value: s.id }))}
                                onSelect={(value) => setStoreId(String(value || ''))}
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Order Date</Label>
                            <Input type="date" className="mt-1" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Invoice Number</Label>
                            <Input className="mt-1 font-mono" value={invoiceNumber} readOnly />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Button variant="outline" size="sm" onClick={() => setIsProductSelectionOpen(true)}>
                            <Plus className="mr-1 h-4 w-4" /> Add Product
                        </Button>
                        <Button variant="secondary" size="sm" onClick={getRecommendations} disabled={recommendationMutation.isPending}>
                            {recommendationMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Recommending…
                                </>
                            ) : (
                                <>
                                    <Wand2 className="mr-1 h-4 w-4" /> Get Quantity Recommendations
                                </>
                            )}
                        </Button>
                    </div>

                    {items.length ? (
                        <div className="max-h-[46vh] overflow-y-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="border-b text-xs text-muted-foreground">
                                    <tr className="text-left">
                                        <th className="p-2">Code</th>
                                        <th className="p-2">Description</th>
                                        <th className="p-2 text-right">Stock</th>
                                        <th className="p-2 text-right">Recommended</th>
                                        <th className="p-2 text-right">Qty</th>
                                        <th className="p-2 text-right">Disc. ({currencySymbol})</th>
                                        <th className="p-2 text-right">Line Total</th>
                                        <th className="p-2 text-center">Remove</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="border-b align-top">
                                            <td className="p-2 font-mono text-xs">{item.itemCode}</td>
                                            <td className="max-w-[180px] p-2">
                                                <div className="truncate">{item.description}</div>
                                                {item.stockDispositionId ? (
                                                    <span className="mt-0.5 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                                                        {(item.dispositionType || 'NST').replace(/_/g, ' ')}
                                                        {item.originalUnitPrice != null && item.dispositionDiscountAmount != null
                                                            ? ` was ${currencySymbol}${item.originalUnitPrice.toFixed(2)} · save ${currencySymbol}${item.dispositionDiscountAmount.toFixed(2)}`
                                                            : ''}
                                                    </span>
                                                ) : null}
                                            </td>
                                            <td className="p-2 text-right">{item.stockOnHand}</td>
                                            <td className="p-2 text-right">
                                                {item.recommendedQuantity != null ? (
                                                    <div>
                                                        <span className="font-semibold text-green-700">{item.recommendedQuantity}</span>
                                                        {item.recommendedQuantity !== item.quantity ? (
                                                            <div className="text-[10px] text-amber-700">override</div>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="p-2 text-right">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    className="h-7 w-20 ml-auto text-right"
                                                    value={item.quantity}
                                                    onChange={(e) => setLineQuantity(index, Math.max(1, Number(e.target.value) || 0))}
                                                />
                                            </td>
                                            <td className="p-2 text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    className="h-7 w-full text-right"
                                                    value={item.discount}
                                                    onChange={(e) => setLineDiscount(index, Number(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="p-2 text-right font-medium">{item.lineTotal.toFixed(2)}</td>
                                            <td className="p-2 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                                    onClick={() => removeLine(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t text-sm">
                                    <tr>
                                        <td colSpan={4} className="p-2 font-medium">
                                            Totals
                                        </td>
                                        <td className="p-2 text-right font-medium">{totalQuantity}</td>
                                        <td className="p-2 text-right font-medium">{discountAmount.toFixed(2)}</td>
                                        <td className="p-2 text-right font-semibold">{goodsTotal.toFixed(2)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ) : (
                        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No products added yet. Click <span className="font-medium">Add Product</span> to pick stock for this store.
                        </div>
                    )}

                    {hasQuantityOverride || hasDiscountOverride ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                            <span className="font-semibold">Approval required (rule 3007):</span>{' '}
                            {hasQuantityOverride ? 'a requested quantity differs from the recommendation ' : ''}
                            {hasQuantityOverride && hasDiscountOverride ? 'and' : ''}{' '}
                            {hasDiscountOverride ? 'a line discount is being applied' : ''}. Submitting will request a supervisor
                            approval.
                        </div>
                    ) : null}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" disabled={isPending || createMutation.isPending} onClick={handleSubmit}>
                        {isPending || createMutation.isPending ? 'Submitting…' : 'Create Order'}
                    </Button>
                </DialogFooter>
            </DialogContent>

            <ProductSelection
                isOpen={isProductSelectionOpen}
                onClose={() => setIsProductSelectionOpen(false)}
                onSelectProduct={handleSelectProduct}
                companyDebtorId={selectedDebtor?.id || null}
                isOnline={isOnline}
                isEmptyStockValidation
            />

            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId || undefined}
                approvals={approval?.approvals}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                onApproved={handleApproved}
            />
        </Dialog>
    );
};

export default Orders;