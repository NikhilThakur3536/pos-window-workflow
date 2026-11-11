'use client';

import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import {
    GoodsReceivingClaimCreateSchema,
    goodsReceivingClaimCreateSchema,
    GoodsReceivingClaimItem,
    useCreateGoodsReceivingClaim
} from '@/api-queries/claims';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { CreditorDialog } from '@/modules/common/hoc/creditor-dialog';
import { ProductSelection } from '@/modules/common/hoc/product-selection';
import { useNetworkStore } from '@/stores/network.store';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { ArrowLeft, ChevronDownIcon, CirclePlus, Trash2Icon, Loader2 } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useForm, useFormContext, UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cleanDataPayload } from '@/utils/helpers';
import { toast } from 'sonner';
import moment from 'moment-timezone';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import BarcodeScanner from '../hoc/bar-code-scanner';
import { useAuthUser } from '@/stores/auth-user.store';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { COLOR_CODES_FOR_INVOICE_FORMS } from '@/lib/constant';
import { getApplicableDiscount } from '@/api-queries/quantity-wise-discount';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getGoodsReceivingList } from '@/api-queries/goods-receiving';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { ListOnlyTable } from '@/components/list-only-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const claimColumns = [
    { key: 'itemCode', label: 'Item Code' },
    { key: 'description', label: 'Description' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unitCost', label: 'Unit Cost' },
    { key: 'unitClaimExclusive', label: 'Claim Amount (excl.)' },
    { key: 'taxPercent', label: 'Tax %' },
    { key: 'delete', label: 'Delete' },
];

const CLAIM_REASON_OPTIONS = ['EXPIRED', 'DAMAGED', 'PRICE CLAIM'];

export default function GoodsReceivingClaimForm({ onClose }: { onClose: () => void }) {
    const createClaim = useCreateGoodsReceivingClaim();
    const form = useForm<GoodsReceivingClaimCreateSchema>({
        resolver: zodResolver(goodsReceivingClaimCreateSchema),
        defaultValues: {
            companyCreditorId: '',
            goodsReceivingOrderId: '',
            originalGoodsReceivingOrderId: '',
            supplierInvoiceNumber: '',
            originalSupplierInvoiceNumber: '',
            claimDate: moment().format('YYYY-MM-DD'),
            claimReason: '',
            sourceType: 'GRV',
            sourceDocumentId: '',
            notes: '',
            items: [],
        },
    });

    const { handleSubmit } = form;

    const [printData, setPrintData] = useState<any>(null);
    const [isCreditorDialogOpen, setIsCreditorDialogOpen] = useState(false);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedGRName, setSelectedGRName] = useState<string>('');
    const [selectedCreditorName, setSelectedCreditorName] = useState<string>('');

    const isOnline = useNetworkStore((state) => state?.online);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';
    const company = useAuthUser((state) => state.user?.company);

    void useCompanyStockDetailsList({ limit: 1000, offset: 0 });

    const companyCreditorId = form.watch('companyCreditorId') || '';

    useEffect(() => {
        if (isCompanyDebtor) {
            form.setValue('companyCreditorId', company?.id || '');
            setSelectedCreditorName(company?.name || '');
        }
    }, [isCompanyDebtor, company, form]);

    const onSubmit = (data: GoodsReceivingClaimCreateSchema) => {
        if (data.items.length === 0) {
            toast.error("Please add at least one claim item");
            return;
        }
        const payload = cleanDataPayload(data);

        createClaim.mutate(payload, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success('Claim created successfully');
                    setPrintData(response.data);
                    onClose();
                }
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Failed to create claim');
            },
        });
    };

    const handleAccept = () => {
        if (createClaim.isPending) return;
        handleSubmit(onSubmit)();
    };

    const handleSelectProduct = async (product: StockDetails) => {
        const currentItems = form.getValues('items') || [];

        const existingItemIndex = currentItems.findIndex((item: any) => item.companyStockDetailId === product.id);
        if (existingItemIndex !== -1) {
            await updateItem(existingItemIndex, { quantity: currentItems[existingItemIndex].quantity + 1 });
            setIsItemDialogOpen(false);
            setScannedBarcode('');
            return;
        }

        const latestCost = product?.companySupplierDeal?.dealUnit || product?.costTypes?.latestCost || 0;
        let discountPercentage = 0;

        if (companyCreditorId) {
            const result = await getApplicableDiscount({
                companyCreditorId,
                companyStockDetailId: product.id,
                quantity: 1,
            });
            discountPercentage = result.data.discountPercent;
        }

        const discountAmount = latestCost * (discountPercentage / 100);
        const unitClaimExclusive = latestCost - discountAmount;

        const newItem: GoodsReceivingClaimItem = {
            id: `temp-${Date.now()}`,
            goodsReceivingOrderId: form.getValues('goodsReceivingOrderId'),
            goodsReceivingOrderItemId: '',
            companyStockDetailId: product.id,
            itemCode: product.itemCode,
            description: product.description,
            claimReason: form.getValues('claimReason'),
            quantity: 1,
            unitCost: latestCost,
            unitClaimExclusive: unitClaimExclusive,
            taxPercent: product.subCategory?.taxRate?.rate || 0,
        };

        form.setValue('items', [...currentItems, newItem]);
        setIsItemDialogOpen(false);
        setScannedBarcode('');

        if (discountAmount) {
            toast.success(`A discount of ${currencySymbol} ${discountAmount?.toFixed(2)} has been applied to ${product.description}.`);
        }
    };

    const handleScannedProduct = (barcode: string) => {
        if (!companyCreditorId && !isCompanyDebtor) {
            toast.error('Please select account before scanning the barcode');
            return;
        }
        setScannedBarcode(String(barcode));
    };

    function onProductSelectionClose() {
        setIsItemDialogOpen(false);
        setScannedBarcode('');
    }

    const updateItem = async (index: number, updates: Partial<GoodsReceivingClaimItem>) => {
        const currentItems = form.getValues('items');
        const updatedItems = [...currentItems];
        const item = { ...updatedItems[index], ...updates } as GoodsReceivingClaimItem;

        if ('quantity' in updates && companyCreditorId) {
            setIsLoading(true);
            const result = await getApplicableDiscount({
                companyCreditorId,
                companyStockDetailId: item.companyStockDetailId,
                quantity: updates.quantity || item.quantity,
            });
            setIsLoading(false);
            const discountPercentage = result.data.discountPercent;
            item.unitClaimExclusive = (item.unitCost || 0) * (1 - discountPercentage / 100);
        }

        updatedItems[index] = item;
        form.setValue('items', updatedItems);
    };

    const removeItem = (index: number) => {
        const currentItems = form.getValues('items');
        form.setValue('items', currentItems.filter((_, i) => i !== index));
    };

    const handleSelectGoodsReceivingOrder = (grOrder: any) => {
        form.setValue('goodsReceivingOrderId', grOrder.id);
        form.setValue('originalGoodsReceivingOrderId', grOrder.id);
        form.setValue('sourceDocumentId', grOrder.id);
        form.setValue('supplierInvoiceNumber', grOrder.supplierInvoiceNumber || grOrder.invoiceNumber || '');
        form.setValue('originalSupplierInvoiceNumber', grOrder.supplierInvoiceNumber || grOrder.invoiceNumber || '');
        setSelectedGRName(grOrder.name || grOrder.companyName || '');
        toast.success(`Selected: ${grOrder.name || grOrder.id}`);
    };

    return (
        <div className={COLOR_CODES_FOR_INVOICE_FORMS?.GRV || 'bg-white'}>
            <h1 className="px-4 py-3 text-2xl font-bold border-b">Goods Receiving Claim</h1>

            <Form {...form}>
                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-3">
                        <ClaimHeaderForm 
                            isCreditorDialogOpen={isCreditorDialogOpen} 
                            setIsCreditorDialogOpen={setIsCreditorDialogOpen}
                            form={form}
                            selectedGRName={selectedGRName}
                            selectedCreditorName={selectedCreditorName}
                            setSelectedCreditorName={setSelectedCreditorName}
                            onSelectGoodsReceivingOrder={handleSelectGoodsReceivingOrder}
                        />
                        <ClaimDetailsForm />
                    </div>

                    <ItemsTable 
                        form={form} 
                        isItemDialogOpen={isItemDialogOpen}
                        setIsItemDialogOpen={setIsItemDialogOpen}
                        scannedBarcode={scannedBarcode}
                        setScannedBarcode={setScannedBarcode}
                        onSelectProduct={handleSelectProduct}
                        onRemove={removeItem}
                        onUpdate={updateItem}
                        companyCreditorId={companyCreditorId}
                        isOnline={isOnline}
                    />

                    <div className="mt-4 border-t p-4">
                        <AcceptHintActions onShowHints={() => {}} onAccept={handleAccept}>
                            <Button variant="secondary" onClick={onClose}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        </AcceptHintActions>
                    </div>
                </form>
            </Form>

            {(isItemDialogOpen || scannedBarcode) && (
                <ProductSelection
                    isOpen={isItemDialogOpen}
                    onClose={onProductSelectionClose}
                    onSelectProduct={handleSelectProduct}
                    companyDebtorId={companyCreditorId}
                    key={companyCreditorId}
                    isOnline={isOnline}
                    scannedBarcode={scannedBarcode}
                    setScannedBarcode={setScannedBarcode}
                    isGRV={false}
                />
            )}

            <BarcodeScanner onScan={handleScannedProduct} active={true} />

            {printData && <div>Print Data Available - Implement GRVInvoiceDialog equivalent if needed</div>}
        </div>
    );
}

interface GoodsReceivingOrderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectOrder: (order: any) => void;
}

function GoodsReceivingOrderDialog({ isOpen, onClose, onSelectOrder }: GoodsReceivingOrderDialogProps) {
    const initialFilters = {
        search: '',
    };

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<{ search: string }>(initialFilters);

    const [selectedOrderInModal, setSelectedOrderInModal] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;

        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const response = await getGoodsReceivingList({
                    limit: pagination.pageSize,
                    offset: pagination.pageIndex * pagination.pageSize,
                    ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
                });

                if (!cancelled) {
                    setOrders(response?.data?.rows || []);
                    setTotalCount(response?.data?.count || 0);
                }
            } catch (err) {
                if (!cancelled) {
                    toast.error('Failed to load Goods Receiving Orders');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchOrders();

        return () => {
            cancelled = true;
        };
    }, [isOpen, pagination.pageSize, pagination.pageIndex, appliedFilters]);

    const orderColumns = useMemo(
        () => [
            { key: 'id', label: 'GR Order ID', className: 'w-[150px]' },
            {
                key: 'supplierInvoiceNumber',
                label: 'Invoice Number',
                className: 'w-[150px] border-l',
                render: (row: any) => row.supplierInvoiceNumber || row.invoiceNumber || 'N/A',
            },
            {
                key: 'name',
                label: 'Name',
                className: 'flex-1 border-l',
                render: (row: any) => row.name || row.companyName || 'N/A',
            },
        ],
        [],
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    function handleSelectAndClose() {
        if (selectedOrderInModal) {
            onSelectOrder(selectedOrderInModal);
            onClose();
        }
    }

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedOrderInModal(null);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <PageLoader isLoading={isLoading} width="w-[80vw]" height="h-[95vh]">
                    <DialogHeader className="mb-4 p-4 pb-0">
                        <DialogTitle>Select Goods Receiving Order</DialogTitle>
                        <div className="mt-2 flex items-center gap-2">
                            <Input
                                placeholder="Search by GR order ID, invoice number or name"
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="max-w-sm p-1"
                            />
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden px-4">
                        <div className="h-full overflow-y-auto">
                            <ListOnlyTable
                                columns={orderColumns}
                                data={orders}
                                onRowClick={setSelectedOrderInModal}
                                selectedRowKey={selectedOrderInModal?.id}
                                rowKeyExtractor={(row) => row.id}
                                pagination={pagination}
                                setPagination={setPagination}
                                totalCount={totalCount}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between p-4 pt-0">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSelectAndClose} disabled={!selectedOrderInModal}>
                            Select GR Order
                        </Button>
                    </DialogFooter>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
}

function ClaimHeaderForm({ 
    isCreditorDialogOpen, 
    setIsCreditorDialogOpen, 
    form,
    selectedGRName,
    selectedCreditorName,
    setSelectedCreditorName,
    onSelectGoodsReceivingOrder 
}: any) {
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';
    const [isGRDialogOpen, setIsGRDialogOpen] = useState(false);

    return (
        <div className="space-y-4">
            <h3 className="font-semibold">Claim Header</h3>

            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Name</FormLabel>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex-grow">
                                <FormField
                                    control={form.control}
                                    name="companyCreditorId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="relative">
                                                <FormControl>
                                                    <Input
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                                        readOnly
                                                        name={field.name}
                                                        value={selectedCreditorName || field.value}
                                                        onClick={() => {
                                                            if (form.watch('items').length === 0 && !isCompanyDebtor) {
                                                                setIsCreditorDialogOpen(true);
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                {isCompanyDebtor ? null : (
                                                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                                )}
                                            </div>
                                            <FormMessage className="!-mt-2 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </TooltipTrigger>
                        {form.watch('items').length !== 0 && (
                            <TooltipContent><p>Cannot change supplier after adding items</p></TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>

            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">GR Order</FormLabel>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex-grow">
                                <FormField
                                    control={form.control}
                                    name="goodsReceivingOrderId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="relative">
                                                <FormControl>
                                                    <Input
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs cursor-pointer"
                                                        readOnly
                                                        placeholder="Select Goods Receiving Order"
                                                        value={selectedGRName||field.value}
                                                        onClick={() => {
                                                            if (form.watch('items').length === 0) {
                                                                setIsGRDialogOpen(true);
                                                            } else {
                                                                toast.error("Cannot change GR Order after adding items");
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                            </div>
                                            <FormMessage className="!-mt-2 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </TooltipTrigger>
                        {form.watch('items').length !== 0 && (
                            <TooltipContent><p>Cannot change GR Order after adding items</p></TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>

            {isCreditorDialogOpen && (
                <CreditorDialog
                    isOpen={isCreditorDialogOpen}
                    onClose={() => setIsCreditorDialogOpen(false)}
                    onSelectCreditor={(creditor: any) => {
                        form.setValue('companyCreditorId', creditor.id);
                        setSelectedCreditorName(creditor.name || creditor.companyName || '');
                        setIsCreditorDialogOpen(false);
                    }}
                />
            )}

            <GoodsReceivingOrderDialog
                isOpen={isGRDialogOpen}
                onClose={() => setIsGRDialogOpen(false)}
                onSelectOrder={onSelectGoodsReceivingOrder}
            />
        </div>
    );
}

function ClaimDetailsForm() {
    const form = useFormContext<GoodsReceivingClaimCreateSchema>();
    return (
        <div className="space-y-4">
            <h3 className="font-semibold">Claim Details</h3>
            <div className="space-y-3">
                <FormField control={form.control} name="claimDate" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Claim Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="claimReason" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Claim Reason</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Claim Reason" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {CLAIM_REASON_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="sourceType" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Source Type</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl><Textarea {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>
        </div>
    );
}

function ItemsTable({ form, isItemDialogOpen, setIsItemDialogOpen, scannedBarcode, setScannedBarcode, onSelectProduct, onRemove, onUpdate, companyCreditorId, isOnline }: any) {
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';

    return (
        <PageLoader isLoading={false}>
            <div className="mt-6 px-4">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Claim Items ({form.watch('items')?.length || 0})</h3>
                    <Button type="button" onClick={() => setIsItemDialogOpen(true)} disabled={!companyCreditorId && !isCompanyDebtor} variant="outline">
                        <CirclePlus className="h-4 w-4 mr-2" />
                        Select Product
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            {claimColumns.map((col) => <TableHead key={col.key}>{col.label}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(form.watch('items') || []).map((item: any, index: number) => (
                            <Fragment key={index}>
                                <TableRow>
                                    <TableCell>{item.itemCode}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>
                                        <Input type="number" value={item.quantity} onChange={(e) => onUpdate(index, { quantity: Number(e.target.value) || 1 })} className="h-6 w-16 p-1 text-right text-xs" />
                                    </TableCell>
                                    <TableCell>{item.unitCost?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={item.unitClaimExclusive ?? 0}
                                            onChange={(e) => onUpdate(index, { unitClaimExclusive: Number(e.target.value) || 0 })}
                                            className="h-6 w-20 p-1 text-right text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>{item.taxPercent}%</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-700">
                                            <Trash2Icon className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </PageLoader>
    );
}