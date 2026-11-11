import { StockDetails, companyStockDetailById, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { resolveStockBarcode } from '@/api-queries/company-stock-barcodes';
import {
    GoodsReceivingDetails,
    GoodsReceivingSchema,
    goodsReceivingSchema,
    getGoodsReceivingById,
    useCreateGoodsReceiving,
    useGetGoodsReceivingById,
} from '@/api-queries/goods-receiving';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { CreditorDialog } from '@/modules/common/hoc/creditor-dialog';
import { ProductSelection } from '@/modules/common/hoc/product-selection';
import { useNetworkStore } from '@/stores/network.store';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { ArrowLeft, ChevronDownIcon, CirclePlus, Link2, PackagePlus, Trash2Icon } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFormContext, UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cleanDataPayload, generateUUIDForData } from '@/utils/helpers';
// import { CartItemPricingType } from '@/api-queries/point-of-sale';
import { toast } from 'sonner';
import moment from 'moment-timezone';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { GoodsReceivingCartItem } from '@/api-queries/goods-receiving';
import { useScanBarcode, useAddTempItem } from '@/api-queries/goods-receiving/barcode-workflow';
import {
    useResolveBarcode,
    useGetUnresolvedTempItems,
    toUnresolvedTempItems,
    TempItem,
} from '@/api-queries/goods-receiving/barcode-workflow';
import { useGetCompanyTaxRates } from '@/api-queries/company-tax-rate-master';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import GRVInvoiceDialog from './invoice/invoice-dialog';
import BarcodeScanner from '../hoc/bar-code-scanner';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompanyStockPricingTypeList } from '@/api-queries/company/stock-pricing-type';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import SelectPopover from '@/components/select-popover';
import {
    calculateGpPercent,
    calculateMarkupPercent,
    calculatePriceFromGp,
    calculatePriceFromMarkup,
} from '@/utils/helpers';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getApplicableDiscount } from '@/api-queries/quantity-wise-discount';
import { useAuthUser } from '@/stores/auth-user.store';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { COLOR_CODES_FOR_INVOICE_FORMS } from '@/lib/constant';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useGetSupplierInvoiceById, useGetSupplierInvoiceList } from '@/api-queries/supplier-invoices';
import { useCalculateRebate } from '@/api-queries/goods-receiving/supplier-allowances';
import type { RebateCalculationResponse } from '@/api-queries/goods-receiving/supplier-allowances';
import {
    useGetGrvPriceMatch,
    useApproveGrvPriceMatch,
    useDisputeGrvPriceMatch,
} from '@/api-queries/goods-receiving/supplier-commitments';
import type { GrvPriceMatchDetails, GrvPriceMatchItem } from '@/api-queries/goods-receiving/supplier-commitments';

// 3067/3079: an unknown barcode queued during GRV building. Added via add-temp-item
// against the created GRV id once the GRV is submitted. clientDocumentId is stable
// per item and reused on retries (3228); the queue lives in memory, never offline.
interface PendingTempBarcodeItem {
    barcode: string;
    description?: string;
    quantity: number;
    unitPrice?: number;
    clientDocumentId: string;
}

const columns = [
    {
        key: 'code',
        label: 'Code',
    },
    {
        key: 'description',
        label: 'Description',
    },
    {
        key: 'originalUnitPrice',
        label: 'Latest Cost',
    },
    {
        key: 'unitPrice',
        label: 'Unit Price',
    },
    {
        key: 'additionalCost',
        label: 'Additional Cost',
    },
    {
        key: 'quantity',
        label: 'Quantity',
    },
    {
        key: 'variance',
        label: 'Variance',
    },
    {
        key: 'freeStock',
        label: 'Free Stock',
    },
    {
        key: 'discount',
        label: 'Discount (%)',
    },
    {
        key: 'lockPrice',
        label: 'Lock Line Price',
    },
    {
        key: 'total',
        label: 'Total',
    },
    {
        key: 'vatAmount',
        label: 'VAT Amount',
    },
    {
        key: 'sellingPriceToggle',
        label: 'Set Selling Price',
    },
    {
        key: 'delete',
        label: 'Delete',
    },
];

// 3141: visual styling for the GRV price-match status values.
const GRV_PRICE_MATCH_STATUS_CLASS: Record<string, string> = {
    MATCHED: 'text-emerald-700',
    WARNING: 'text-amber-600',
    APPROVAL_REQUIRED: 'text-amber-700 font-semibold',
    CLAIM_REQUIRED: 'text-blue-700 font-semibold',
    DISPUTED: 'text-red-600 font-semibold',
};

const priceMatchStatusClass = (status: string) =>
    `rounded bg-muted px-1 py-0.5 ${GRV_PRICE_MATCH_STATUS_CLASS[status] ?? 'text-muted-foreground'}`;

interface GoodsReceivingFormProps {
    onClose: () => void;
    grvId?: string | null;
}

export default function GoodsReceivingForm({ onClose, grvId: initialGrvId }: GoodsReceivingFormProps) {
    const createGRV = useCreateGoodsReceiving();

    // 3141: the price-match endpoint is creditor-scoped, so the panel is only shown
    // for company (creditor) GRVs, not debtor goods-receiving.
    const isCompanyDebtorUser = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';

    // Edit mode: open an already-created GRV to load + resolve its unresolved temp items.
    const [currentGrvId, setCurrentGrvId] = useState<string | null>(initialGrvId ?? null);
    const isEditMode = !!currentGrvId;

    const grvQuery = useGetGoodsReceivingById(currentGrvId ?? '');
    const unresolvedQuery = useGetUnresolvedTempItems(currentGrvId);

    const unresolvedItems = useMemo(() => toUnresolvedTempItems(unresolvedQuery.data?.data), [unresolvedQuery.data]);
    const unresolvedCount = unresolvedItems.length;
    // Block the final action while unresolved items exist OR the unresolved list is still loading.
    const unresolvedBlocking = isEditMode && (unresolvedQuery.isLoading || unresolvedCount > 0);

    // 422 GRV_UNRESOLVED_BARCODE_ITEMS -> show the returned unresolved item list.
    const [unresolved422Items, setUnresolved422Items] = useState<TempItem[] | null>(null);

    // After creating a GRV with queued unknown-barcode items the form stays open in
    // edit mode so the temp lines can be resolved inline instead of closing.
    const stayInEditAfterCreateRef = useRef(false);

    // 3067/3079 unknown-barcode temp items: queued while building the GRV, then added
    // against the created GRV id. clientDocumentId is generated once and reused on any
    // retry (3228); the queue is held in memory only (never persisted to offline storage).
    const addTempMut = useAddTempItem();
    const [pendingTempItems, setPendingTempItems] = useState<PendingTempBarcodeItem[]>([]);
    const pendingTempItemsRef = useRef<PendingTempBarcodeItem[]>([]);

    const updatePendingTempItems = (next: PendingTempBarcodeItem[]) => {
        setPendingTempItems(next);
        pendingTempItemsRef.current = next;
    };

    const form = useForm<GoodsReceivingSchema>({
        resolver: zodResolver(goodsReceivingSchema),
        defaultValues: {
            companyCreditorId: '',
            name: '',
            transactionType: 'Purchase',
            address: '',
            telephone: '',
            email: '',
            taxNumber: '',
            invoiceDiscountPercentage: 0,
            grvDate: '',
            supplierInvoiceNumber: '',
            deliveryMethod: '',
            orderNumber: '',
            grvMemo: '',
            deliveryNoteNumber: '',
            sourceDocument: '',
            invoiceInclusive: true,
            warehouseId: '',
            internalOrderNo: '',
            purchaseOrderId: '',
            supplierInvoiceId: '',
            documentGpPercentage: 0,
            goodsTotal: 0,
            discountAmount: 0,
            taxAmount: 0,
            totalQuantity: 0,
            items: [],
            timezone: moment.tz.guess(),
            originalInvoiceDate: '',
            grvCaptureDate: '',
            receivedDate: '',
            deliverToName: '',
            deliverToAddress: '',
            totalClaimInclusive: true,
        },
    });

    const { handleSubmit, reset } = form;

    useEffect(() => {
        setCurrentGrvId(initialGrvId ?? null);
    }, [initialGrvId]);

    // Edit mode: populate the form from the opened GRV so the existing lines render and
    // only the unresolved temp items need action (3227 unresolved-temp-items).
    useEffect(() => {
        if (!isEditMode || !grvQuery.data?.data) return;
        const rec = grvQuery.data.data;
        const itemRows = rec.CreditorGoodsReceivingOrderItems || rec.DebtorGoodsReceivingOrderItems || [];
        reset({
            companyCreditorId: rec.companyCreditorId || '',
            name: rec.name || '',
            transactionType: rec.transactionType || 'Purchase',
            address: rec.address || '',
            telephone: rec.telephone || '',
            email: rec.email || '',
            taxNumber: rec.taxNumber || '',
            invoiceDiscountPercentage: rec.invoiceDiscountPercentage || 0,
            grvDate: rec.grvDate || '',
            supplierInvoiceId: (rec as any).supplierInvoiceId || '',
            supplierInvoiceNumber: rec.supplierInvoiceNumber || '',
            deliveryMethod: rec.deliveryMethod || '',
            orderNumber: rec.orderNumber || '',
            grvMemo: rec.grvMemo || '',
            deliveryNoteNumber: rec.deliveryNoteNumber || '',
            sourceDocument: rec.sourceDocument || '',
            invoiceInclusive: rec.invoiceInclusive ?? true,
            warehouseId: rec.warehouseId || '',
            internalOrderNo: rec.internalOrderNo || '',
            purchaseOrderId: rec.purchaseOrderId || '',
            documentGpPercentage: rec.documentGpPercentage || 0,
            goodsTotal: rec.goodsTotal || 0,
            discountAmount: rec.discountAmount || 0,
            taxAmount: rec.taxAmount || 0,
            totalQuantity: rec.totalQuantity || 0,
            timezone: rec.timezone || moment.tz.guess(),
            originalInvoiceDate: (rec as any).originalInvoiceDate || '',
            grvCaptureDate: (rec as any).grvCaptureDate || '',
            receivedDate: (rec as any).receivedDate || '',
            deliverToName: (rec as any).deliverToName || '',
            deliverToAddress: (rec as any).deliverToAddress || '',
            totalClaimInclusive: (rec as any).totalClaimInclusive ?? true,
            items: itemRows.map((row: any) => ({
                companyStockDetailId: row.companyStockDetailId,
                companyTaxRateId: row.companyTaxRateId || '',
                description: row.description || '',
                unitPrice: row.unitPrice || 0,
                originalUnitPrice: row.originalUnitPrice ?? row.unitPrice ?? 0,
                quantity: row.quantity || 0,
                freeStock: row.freeStock || 0,
                discount: row.discount || 0,
                discountPercentage: row.discountPercentage || 0,
                lineTotal: row.lineTotal || 0,
                code: row.code || '',
                additionalCost: row.additionalCost || 0,
                isPriceLocked: row.isPriceLocked || false,
                taxRateId: row.taxRateId || '',
                taxName: row.taxName || '',
                taxPercent: row.taxPercent || 0,
                // 3044/3047/3141: rebate + price-match result returned by the server.
                rebateAmount: row.rebateAmount,
                effectiveUnitCost: row.effectiveUnitCost,
                rebateBreakdown: row.rebateBreakdown,
                expectedUnitCost: row.expectedUnitCost,
                matchSource: row.matchSource,
                costVarianceAmount: row.costVarianceAmount,
                costVariancePercent: row.costVariancePercent,
                priceMatchStatus: row.priceMatchStatus,
                priceMatchNotes: row.priceMatchNotes,
                supplierDealId: row.supplierDealId,
            })),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode, grvQuery.data, reset]);

    const [printData, setPrintData] = useState<GoodsReceivingDetails | null>(null);

    const [includeClaimInPrint, setIncludeClaimInPrint] = useState(false);

    const [pendingSubmitPayload, setPendingSubmitPayload] = useState<any>(null);
    const [showClaimPrintPrompt, setShowClaimPrintPrompt] = useState(false);

    const [pendingPrintData, setPendingPrintData] = useState<GoodsReceivingDetails | null>(null);
    const [pendingIncludeClaimInPrint, setPendingIncludeClaimInPrint] = useState(false);
    const [showPrintPrompt, setShowPrintPrompt] = useState(false);

    const submitGRV = (payload: any, isClaimCreate?: boolean) => {
        const finalPayload = isClaimCreate ? { ...payload, isClaimCreate: true } : payload;

        createGRV.mutate(finalPayload as GoodsReceivingSchema, {
            onSuccess: async (data) => {
                if (data.success) {
                    toast.success('GRV created successfully');
                    reset();

                    const responseData = data.data as any;

                    console.log('GRV create response', responseData);

                    // 3067/3079: flush queued unknown-barcode items against the created GRV.
                    // Each item resends its stable clientDocumentId; approval tokens are never stored.
                    const grvId = responseData?.id;
                    const pending = pendingTempItemsRef.current;
                    updatePendingTempItems([]);

                    if (grvId && pending?.length) {
                        const settled = await Promise.allSettled(
                            pending.map((item) =>
                                addTempMut.mutateAsync({
                                    grvId,
                                    barcode: item.barcode,
                                    description: item.description || undefined,
                                    quantity: item.quantity,
                                    unitPrice: item.unitPrice,
                                    clientDocumentId: item.clientDocumentId,
                                }),
                            ),
                        );
                        const added = settled.filter((r) => r.status === 'fulfilled').length;
                        if (added > 0) {
                            toast.success(
                                `${added} temporary barcode item${added === 1 ? '' : 's'} added to this GRV - resolve them below.`,
                            );
                        }
                        if (added < pending.length) {
                            toast.warning('Some temporary barcode items could not be added - retry below.');
                        }

                        // Enter edit mode so the queued temp lines can be resolved inline.
                        setCurrentGrvId(grvId);
                        stayInEditAfterCreateRef.current = true;
                    }

                    if (isClaimCreate) {
                        const refreshed = await getGoodsReceivingById(responseData.id, true);

                        setPendingIncludeClaimInPrint(true);
                        setPendingPrintData(refreshed?.data || responseData);
                    } else {
                        setPendingIncludeClaimInPrint(false);
                        setPendingPrintData(responseData);
                    }

                    setShowPrintPrompt(true);
                }
            },
            onError: (error: any) => {
                const response = error?.response;
                if (response?.status === 422 && response?.data?.code === 'GRV_UNRESOLVED_BARCODE_ITEMS') {
                    // Show the returned unresolved item list instead of a generic error.
                    const list = response?.data?.data?.rows || response?.data?.data?.items || [];
                    if (Array.isArray(list) && list.length) {
                        setUnresolved422Items(list);
                    } else {
                        toast.error(response?.data?.message || 'GRV has unresolved barcode items');
                    }
                    return;
                }
                toast.error(response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    const onSubmit = (data: GoodsReceivingSchema) => {
        if (isEditMode) {
            // 3227: prevent the final GRV action while unresolved temp items remain.
            if (unresolvedBlocking) {
                const pending = unresolvedCount || 'some';
                toast.error(`Resolve all temporary barcode items (${pending}) before posting this GRV`);
                return;
            }
            onClose();
            return;
        }

        const payload = cleanDataPayload(data);

        const rawItems = form.getValues('items') || [];

        const hasActiveSupplierDeal = rawItems.some((item: any) => {
            const deal = item?.companySupplierDeal;
            if (!deal) return false;
            if (!deal.dealUnit) return false;

            const now = moment();
            const startDate = deal.startDate ? moment(deal.startDate) : null;
            const endDate = deal.endDate ? moment(deal.endDate) : null;

            if (startDate && now.isBefore(startDate, 'day')) return false;
            if (endDate && now.isAfter(endDate, 'day')) return false;

            return true;
        });

        if (hasActiveSupplierDeal) {
            setPendingSubmitPayload(payload);
            setShowClaimPrintPrompt(true);
        } else {
            submitGRV(payload);
        }
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for grv');
    };

    const handleAccept = (e?: any) => {
        if (isEditMode) {
            e?.preventDefault();
            if (unresolvedBlocking) {
                toast.error(`Resolve all temporary barcode items (${unresolvedCount}) before posting this GRV`);
                return;
            }
            onClose();
            return;
        }
        handleSubmit(onSubmit)();
    };

    const handleClaimPrintPromptAnswer = (shouldRaiseClaim: boolean) => {
        if (pendingSubmitPayload) {
            submitGRV(pendingSubmitPayload, shouldRaiseClaim);
        }
        setShowClaimPrintPrompt(false);
        setPendingSubmitPayload(null);
    };

    const handlePrintPromptAnswer = (shouldPrint: boolean) => {
        if (shouldPrint && pendingPrintData) {
            setIncludeClaimInPrint(pendingIncludeClaimInPrint);
            setPrintData(pendingPrintData);
        } else if (!stayInEditAfterCreateRef.current) {
            onClose();
        }
        setShowPrintPrompt(false);
        setPendingPrintData(null);
        setPendingIncludeClaimInPrint(false);
    };

    return (
        <div className={COLOR_CODES_FOR_INVOICE_FORMS?.GRV}>
            <h1 className="px-4 py-2 text-2xl font-bold">Goods Received Voucher{isEditMode ? ' - Open GRV' : ''}</h1>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-2 gap-4 overflow-y-auto px-4 py-2 md:grid-cols-2 lg:grid-cols-4">
                        <AccountDetailsForm />
                        <GRVDetailsForm />
                        <div className="space-y-1"></div>
                        <TotalsForm />
                    </div>

                    <ItemsTable
                        form={form}
                        pendingTempItems={pendingTempItems}
                        onPendingTempItemsChange={updatePendingTempItems}
                        grvId={currentGrvId}
                        unresolvedItems={unresolvedItems}
                        onUnresolvedRefetch={() => {
                            // 3080/3081: after LINK/CREATE refresh both the unresolved list and
                            // the GRV items so linked products appear as normal lines.
                            unresolvedQuery.refetch();
                            grvQuery.refetch();
                        }}
                    />
                </form>

                <div className="mt-2">
                    <AcceptHintActions
                        onShowHints={handleShowHints}
                        onAccept={handleAccept}
                        disabled={unresolvedBlocking}
                        saveButtonTitle={
                            unresolvedBlocking
                                ? `Resolve ${unresolvedCount || ''} Temp Item${unresolvedCount === 1 ? '' : 's'}`.trim()
                                : undefined
                        }
                    >
                        <Button variant="secondary" onClick={() => onClose()}>
                            <ArrowLeft /> Back
                        </Button>
                    </AcceptHintActions>
                </div>
            </Form>

            {/* 3141: price-match result for an existing GRV (edit mode). */}
            {isEditMode && currentGrvId && !isCompanyDebtorUser && (
                <GrvPriceMatchPanel grvId={currentGrvId} onRefreshGrv={() => grvQuery.refetch()} />
            )}

            {showClaimPrintPrompt && (
                <Dialog
                    open={showClaimPrintPrompt}
                    onOpenChange={(open) => !open && handleClaimPrintPromptAnswer(false)}
                >
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Supplier Deal Detected</DialogTitle>
                        </DialogHeader>

                        <div className="py-2 text-sm text-gray-700">
                            An active supplier deal was found on the selected items. Do you want to raise this as a
                            claim?
                        </div>

                        <DialogFooter className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => handleClaimPrintPromptAnswer(false)}>
                                No
                            </Button>
                            <Button onClick={() => handleClaimPrintPromptAnswer(true)}>Yes, Raise Claim</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {showPrintPrompt && (
                <Dialog open={showPrintPrompt} onOpenChange={(open) => !open && handlePrintPromptAnswer(false)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Print Invoice</DialogTitle>
                        </DialogHeader>

                        <div className="py-2 text-sm text-gray-700">Do you want to print the invoice?</div>

                        <DialogFooter className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => handlePrintPromptAnswer(false)}>
                                No
                            </Button>
                            <Button onClick={() => handlePrintPromptAnswer(true)}>Yes, Print</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {printData && (
                <GRVInvoiceDialog
                    printData={printData}
                    includeClaimPage={includeClaimInPrint}
                    onRefreshClaimPrint={async (claimId) => {
                        if (!printData?.id) return null;
                        const refreshed = await getGoodsReceivingById(printData.id, true);
                        const row = refreshed?.data;
                        return (
                            row?.claimPrintDocuments?.find((d) => d.claimId === claimId) ||
                            row?.claimPrintDocuments?.[0] ||
                            null
                        );
                    }}
                    onClose={() => {
                        setPrintData(null);
                        setIncludeClaimInPrint(false);
                        const staying = stayInEditAfterCreateRef.current;
                        stayInEditAfterCreateRef.current = false;
                        if (!staying) {
                            onClose();
                        }
                    }}
                />
            )}

            {/* 422 GRV_UNRESOLVED_BARCODE_ITEMS: show the returned unresolved item list */}
            <Dialog open={unresolved422Items !== null} onOpenChange={(open) => !open && setUnresolved422Items(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Unresolved Barcode Items</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[50vh] space-y-1 overflow-y-auto text-sm">
                        <p className="text-xs text-red-600">
                            This GRV has unresolved temporary barcode items. Resolve them before the final GRV action.
                        </p>
                        {(unresolved422Items || []).map((item, index) => (
                            <div
                                key={item.grvItemId || item.id || `item-${index}`}
                                className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1"
                            >
                                <span className="font-mono text-xs font-medium">{item.barcode || 'N/A'}</span>
                                <span className="flex-1 truncate text-xs">{item.description || 'No description'}</span>
                                <span className="text-xs">Qty {item.quantity || 0}</span>
                            </div>
                        ))}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" type="button" onClick={() => setUnresolved422Items(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function AccountDetailsForm() {
    const form = useFormContext<GoodsReceivingSchema>();
    const [isCreditorDialogOpen, setIsCreditorDialogOpen] = useState(false);
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';
    const company = useAuthUser((state) => state.user?.company);

    useEffect(() => {
        if (isCompanyDebtor) {
            form.setValue('name', company?.companyName || '');
            form.setValue(
                'address',
                `${company?.addressLineOne} ${company?.addressLineTwo ? `, ${company?.addressLineTwo}` : null} ${
                    company?.addressLineThree ? `, ${company?.addressLineThree}` : null
                } ${company?.addressLineFour ? `, ${company?.addressLineFour}` : null}  ${
                    company?.postalCode ? `, ${company?.postalCode}` : null
                }`,
            );
            form.setValue('email', company?.emailAddress || '');
            form.setValue('telephone', company?.telephone || '');
        }
    }, [isCompanyDebtor]);

    return (
        <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-700">Account Details</h3>

            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Name</FormLabel>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex-grow">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="relative">
                                                <FormControl>
                                                    <Input
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                                        readOnly
                                                        onClick={() => {
                                                            if (form.watch('items').length === 0 && !isCompanyDebtor) {
                                                                setIsCreditorDialogOpen(true);
                                                            }
                                                        }}
                                                        {...field}
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
                            <TooltipContent>
                                <p>Cannot change supplier after adding items</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>
            <div className="space-y-2">
                <FormLabel className="text-xs">Address Details</FormLabel>
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea className="border-input h-12 rounded-md border bg-white text-xs" {...field} />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Tel</FormLabel>
                <FormField
                    control={form.control}
                    name="telephone"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Email</FormLabel>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Tax</FormLabel>
                <FormField
                    control={form.control}
                    name="taxNumber"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">GRV Disc (%)</FormLabel>
                <FormField
                    control={form.control}
                    name="invoiceDiscountPercentage"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            {isCreditorDialogOpen && (
                <CreditorDialog
                    isOpen={isCreditorDialogOpen}
                    onClose={() => setIsCreditorDialogOpen(false)}
                    onSelectCreditor={(creditor) => {
                        form.setValue('companyCreditorId', creditor.id);
                        form.setValue('name', creditor.name);
                        form.setValue('address', creditor.postalAddress || creditor.deliveryAddress || '');
                        form.setValue(
                            'telephone',
                            creditor?.contact ||
                                creditor?.cellphoneNumber ||
                                creditor?.telephoneNumberOne ||
                                creditor?.telephoneNumberTwo ||
                                '',
                        );
                        form.setValue('email', creditor?.emailAddress || '');
                        setIsCreditorDialogOpen(false);
                    }}
                />
            )}
        </div>
    );
}

function GRVDetailsForm() {
    const form = useFormContext<GoodsReceivingSchema>();
    const today = new Date().toISOString().split('T')[0];

    const formCreditorId = form.watch('companyCreditorId') || '';
    const supplierInvoices =
        useGetSupplierInvoiceList(
            {
                limit: 10,
                offset: 0,
                status: 'POSTED',
                companyCreditorId: formCreditorId || undefined,
            },
            { enabled: !!formCreditorId },
        )?.data?.data || [];

    const selectedInvoiceId = form.watch('supplierInvoiceId') || '';
    const invoiceByIdQuery = useGetSupplierInvoiceById(selectedInvoiceId);

    const mappedInvoiceRef = useRef<string | null>(null);

    useEffect(() => {
        if (!selectedInvoiceId) {
            mappedInvoiceRef.current = null;
            if ((form.getValues('items') || []).length > 0) {
                form.setValue('items', [], { shouldValidate: true });
            }
            return;
        }

        if (mappedInvoiceRef.current === selectedInvoiceId) return;

        const details = invoiceByIdQuery?.data?.data;
        if (!details) return;

        const invoiceItems = details.items || details.SupplierInvoiceItems || [];

        const mappedItems: GoodsReceivingCartItem[] = invoiceItems.map((invItem) => {
            const unitPrice = Number(invItem.unitPrice) || 0;
            const quantity = Number(invItem.quantity) || 1;
            const discountPct = Number(invItem.discountPct) || 0;
            const discount = unitPrice * quantity * (discountPct / 100);
            const lineTotal = unitPrice * quantity - discount;

            return {
                companyStockDetailId: invItem.companyStockDetailId,
                companyTaxRateId: invItem.companyTaxRateId || invItem.CompanyStockDetail?.companyTaxRateId || '',
                description:
                    invItem.description || invItem.CompanyStockDetail?.description || invItem.skuCode || 'Product',
                unitPrice,
                originalUnitPrice: unitPrice,
                quantity,
                freeStock: 0,
                discountPercentage: discountPct,
                discount,
                lineTotal,
                code: invItem.CompanyStockDetail?.itemCode || invItem.skuCode || '',
                additionalCost: 0,
                isPriceLocked: true,
                taxPercent: Number(invItem.taxPct) || 0,
                invoicedQuantity: quantity,
                sourceSupplierInvoiceId: details.id,
                supplierInvoiceItemId: invItem.supplierInvoiceItemId || invItem.id,
            };
        });

        const companyCreditorId = details.companyCreditorId || '';
        if (companyCreditorId) {
            form.setValue('companyCreditorId', companyCreditorId, { shouldValidate: true });
            form.setValue('name', details.CompanyCreditor?.name || '', { shouldValidate: true });
            form.setValue('address', details.CompanyCreditor?.postalAddress || '', { shouldValidate: true });
            form.setValue(
                'telephone',
                details.CompanyCreditor?.contact ||
                    details.CompanyCreditor?.cellphoneNumber ||
                    details.CompanyCreditor?.telephoneNumberOne ||
                    details.CompanyCreditor?.telephoneNumberTwo ||
                    '',
                { shouldValidate: true },
            );
            form.setValue('email', details.CompanyCreditor?.emailAddress || '', { shouldValidate: true });
        }

        form.setValue('supplierInvoiceNumber', details.invoiceNumber || '', { shouldValidate: true });
        mappedInvoiceRef.current = selectedInvoiceId;
        form.setValue('items', mappedItems, { shouldValidate: true });
    }, [selectedInvoiceId, invoiceByIdQuery?.data?.data, form]);

    useEffect(() => {
        form.setValue('grvDate', today, { shouldValidate: true });
    }, [form, today]);

    return (
        <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-700">GRV Details</h3>

            <div className="flex items-center gap-2">
                <Label htmlFor="grvDate" className="w-28 shrink-0 text-xs">
                    GRV Date
                </Label>
                <FormField
                    control={form.control}
                    name="grvDate"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    type="date"
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                    value={today}
                                    readOnly
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <Label htmlFor="originalInvoiceDate" className="w-28 shrink-0 text-xs">
                    Original Invoice Date
                </Label>
                <FormField
                    control={form.control}
                    name="originalInvoiceDate"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    type="date"
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <Label htmlFor="grvCaptureDate" className="w-28 shrink-0 text-xs">
                    GRV Capture Date
                </Label>
                <FormField
                    control={form.control}
                    name="grvCaptureDate"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    type="date"
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                    value={today}
                                    readOnly
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <Label htmlFor="receivedDate" className="w-28 shrink-0 text-xs">
                    Received Date
                </Label>
                <FormField
                    control={form.control}
                    name="receivedDate"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    type="date"
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                    value={today}
                                    readOnly
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>

            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Delivery Method</FormLabel>
                <FormField
                    control={form.control}
                    name="deliveryMethod"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Order Number</FormLabel>
                <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            {/* <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Purchase Order Ref.</FormLabel>
                <FormField
                    control={form.control}
                    name="purchaseOrderId"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <SelectPopover
                                    options={purchaseOrders.map((po) => ({
                                        label: `${po.poNumber || po.orderNumber || po.id?.slice(0, 8) || po.id} - ${po.status || ''}`,
                                        value: po.id,
                                    }))}
                                    title="Purchase Order"
                                    onlyTitle="Select purchase order"
                                    selectedValue={field.value || ''}
                                    onSelect={field.onChange}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div> */}
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Supplier Invoice ID</FormLabel>
                <FormField
                    control={form.control}
                    name="supplierInvoiceId"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <SelectPopover
                                    options={supplierInvoices.map((inv) => ({
                                        label: `${inv.invoiceNumber || inv.id?.slice(0, 8)}${
                                            inv.status ? ` (${inv.status})` : ''
                                        }`,
                                        value: inv.id,
                                    }))}
                                    title="Supplier Invoice"
                                    onlyTitle={formCreditorId ? 'Select supplier invoice' : 'Select creditor first'}
                                    selectedValue={field.value || ''}
                                    onSelect={field.onChange}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Supplier Invoice Number</FormLabel>
                <FormField
                    control={form.control}
                    name="supplierInvoiceNumber"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    readOnly
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">GRV Memo</FormLabel>
                <FormField
                    control={form.control}
                    name="grvMemo"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Deliver To Name</FormLabel>
                <FormField
                    control={form.control}
                    name="deliverToName"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="space-y-2">
                <FormLabel className="text-xs">Deliver To Address</FormLabel>
                <FormField
                    control={form.control}
                    name="deliverToAddress"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea className="border-input h-12 rounded-md border bg-white text-xs" {...field} />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}

function TotalsForm() {
    const form = useFormContext<GoodsReceivingSchema>();
    return (
        <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-700">Totals</h3>
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">GRV Inclusive</FormLabel>
                <FormField
                    control={form.control}
                    name="invoiceInclusive"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <RadioGroup
                                    onValueChange={(val) => field.onChange(val === 'yes')}
                                    value={field.value ? 'yes' : 'no'}
                                    className="flex space-x-4"
                                >
                                    <FormItem className="flex items-center gap-3">
                                        <FormControl>
                                            <RadioGroupItem value="yes" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Yes</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center gap-3">
                                        <FormControl>
                                            <RadioGroupItem value="no" />
                                        </FormControl>
                                        <FormLabel className="font-normal">No</FormLabel>
                                    </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>

            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Total Claim Inclusive</FormLabel>
                <FormField
                    control={form.control}
                    name="totalClaimInclusive"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <RadioGroup
                                    onValueChange={(val) => field.onChange(val === 'yes')}
                                    value={field.value ? 'yes' : 'no'}
                                    className="flex space-x-4"
                                >
                                    <FormItem className="flex items-center gap-3">
                                        <FormControl>
                                            <RadioGroupItem value="yes" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Yes</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center gap-3">
                                        <FormControl>
                                            <RadioGroupItem value="no" />
                                        </FormControl>
                                        <FormLabel className="font-normal">No</FormLabel>
                                    </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>

            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Goods Total</FormLabel>
                <FormField
                    control={form.control}
                    name="goodsTotal"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.01"
                                    readOnly
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                    {...field}
                                    value={(
                                        form.control._formValues.goodsTotal + form.control._formValues.discountAmount
                                    )?.toFixed(2)}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>

            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Discount Amnt</FormLabel>
                <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.01"
                                    readOnly
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                    {...field}
                                    value={field.value.toFixed(2)}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Tax Amount</FormLabel>
                <FormField
                    control={form.control}
                    name="taxAmount"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.01"
                                    readOnly
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>

            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Collection Fee:</FormLabel>
                <Input
                    type="number"
                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                    value={0}
                    readOnly
                />
            </div>

            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Delivery Fee:</FormLabel>
                <Input
                    type="number"
                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                    value={0}
                    readOnly
                />
            </div>

            <div className="flex items-center gap-2">
                <FormLabel className="w-28 shrink-0 text-xs">Total Items</FormLabel>
                <FormField
                    control={form.control}
                    name="totalQuantity"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.01"
                                    readOnly
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>

            <div className="flex items-center gap-2">
                <Label htmlFor="goodsTotal" className="w-28 shrink-0 text-xs">
                    Payable Amount
                </Label>
                <FormField
                    control={form.control}
                    name="goodsTotal"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input
                                    {...field}
                                    value={field.value.toFixed(2)}
                                    type="number"
                                    step="0.01"
                                    readOnly
                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                />
                            </FormControl>
                            <FormMessage className="!-mt-2 !text-xs" />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}

function ItemsTable({
    form,
    pendingTempItems,
    onPendingTempItemsChange,
    grvId,
    unresolvedItems,
    onUnresolvedRefetch,
}: {
    form: UseFormReturn<GoodsReceivingSchema>;
    pendingTempItems: PendingTempBarcodeItem[];
    onPendingTempItemsChange: (next: PendingTempBarcodeItem[]) => void;
    grvId: string | null;
    unresolvedItems: TempItem[];
    onUnresolvedRefetch: () => void;
}) {
    const isOnline = useNetworkStore((state) => state?.online);
    const [isLoading] = useState(false);

    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const resolveMut = useResolveBarcode();

    // 3080/3081 Resolve temp items: LINK uses the product picker, CREATE uses a small form.
    const [linkResolveTarget, setLinkResolveTarget] = useState<TempItem | null>(null);
    const [resolveTarget, setResolveTarget] = useState<TempItem | null>(null);
    const [createDescription, setCreateDescription] = useState('');
    const [createItemCode, setCreateItemCode] = useState('');
    const [createTaxRateId, setCreateTaxRateId] = useState('');
    const [createPricingTypeId, setCreatePricingTypeId] = useState('');
    const [createSellingPrice, setCreateSellingPrice] = useState('');
    // 3228: one stable clientDocumentId per resolution request; reused on the approval resend.
    const [resolveDocumentId, setResolveDocumentId] = useState('');

    // 3224: HTTP 428 APPROVAL_REQUIRED -> supervisor approves once -> resend with approvalToken.
    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const pendingResolveRef = useRef<Record<string, unknown> | null>(null);

    // CREATE selectors: tax rate + pricing type
    const taxRateList = useGetCompanyTaxRates()?.data?.data?.rows || [];
    const pricingTypeList = useCompanyStockPricingTypeList({})?.data?.data?.rows || [];

    const stockListQuery = useCompanyStockDetailsList({
        limit: 1000,
        offset: 0,
    });
    const stockList = stockListQuery.data?.data?.rows || [];

    const companyCreditorId = form.watch('companyCreditorId') || '';
    const items = form.watch('items') || [];
    const invoiceLocked = !!form.watch('supplierInvoiceId');

    // 3044/3047: best-effort rebate preview per line before the GRV is created. The
    // rebate is calculated authoritatively on GRV create/update; this only shows the
    // operator what to expect. Keyed by companyStockDetailId.
    const calculateRebateMut = useCalculateRebate();
    const [rebatePreviews, setRebatePreviews] = useState<Record<string, RebateCalculationResponse['data']>>({});

    const refreshRebatePreview = async (companyStockDetailId: string, unitCost: number, quantity: number) => {
        const creditorId = form.getValues('companyCreditorId') || '';
        const warehouseId = form.getValues('warehouseId') || '';
        if (!creditorId || !warehouseId || !companyStockDetailId) return;
        try {
            const res = await calculateRebateMut.mutateAsync({
                companyCreditorId: creditorId,
                companyStockDetailId,
                companyWarehouseId: warehouseId,
                unitCost,
                quantity,
                asOf: form.getValues('grvDate') || moment().format('YYYY-MM-DD'),
            });
            if (res?.data) {
                setRebatePreviews((prev) => ({ ...prev, [companyStockDetailId]: res.data }));
            }
        } catch {
            // Preview is best-effort; the authoritative rebate is applied on GRV create/update.
        }
    };

    useMemo(() => {
        const goodsTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity + item.freeStock, 0);
        const discountAmount = items.reduce((sum, item) => sum + item.discount, 0);

        form.setValue('goodsTotal', goodsTotal);
        form.setValue('totalQuantity', totalQuantity);

        // const discountPercentage = form.getValues('invoiceDiscountPercentage') || 0;

        form.setValue('discountAmount', discountAmount);
    }, [items, form]);

    const addProductToItems = async (product: StockDetails, quantity = 1) => {
        const currentItems = form.getValues('items') || [];

        const existingItemIndex = currentItems.findIndex((item) => item.companyStockDetailId === product.id);
        if (existingItemIndex !== -1) {
            await updateItem(existingItemIndex, { quantity: currentItems[existingItemIndex].quantity + quantity });
            setIsItemDialogOpen(false);
            setScannedBarcode('');
            return;
        }

        const latestCost = product?.costTypes?.latestCost || 0;

        const companyCreditorId = form.getValues('companyCreditorId') || '';

        let discountPercentage = 0;

        if (companyCreditorId) {
            const result = await getApplicableDiscount({
                companyCreditorId,
                companyStockDetailId: product.id,
                quantity: 1,
            });

            discountPercentage = result.data.discountPercent;
        }

        const discountAmount = latestCost * (discountPercentage / 100) * quantity;
        const lineTotal = latestCost * quantity - discountAmount;

        if (discountAmount) {
            toast.success(
                `A discount of ${currencySymbol} ${discountAmount?.toFixed(2)} has been applied to ${product.description}.`,
            );
        }

        const newItem: GoodsReceivingCartItem = {
            companyStockDetailId: product.id,
            companyTaxRateId: product.subCategory?.taxRate.id || product?.companyTaxRateId || '',
            description: product.description,
            unitPrice: latestCost,
            originalUnitPrice: latestCost,
            quantity,
            freeStock: 0,
            discountPercentage: discountPercentage || 0,
            lineTotal: lineTotal,
            code: product.itemCode,
            additionalCost: 0,
            discount: discountAmount,
            isPriceLocked: false,
            taxRateId: product.subCategory?.taxRate?.id,
            taxName: product.subCategory?.taxRate?.name,
            taxPercent: product.subCategory?.taxRate?.taxRatePercent || 0,
        };

        (newItem as any).companySupplierDeal = (product as any)?.companySupplierDeal || null;

        form.setValue('items', [...currentItems, newItem]);
        setIsItemDialogOpen(false);
        setScannedBarcode('');

        // 3044/3047: preview the supplier rebate for this line (best-effort).
        void refreshRebatePreview(product.id, latestCost, quantity);
    };

    const handleSelectProduct = async (product: StockDetails, _price?: unknown, scannedBaseQuantity = 1) => {
        // When a temp line is waiting for LINK, resolve it with the chosen product id
        // (3080/3081) instead of adding a normal GRV line.
        if (linkResolveTarget) {
            submitWithToken({
                action: 'LINK',
                grvItemId: linkResolveTarget.grvItemId || linkResolveTarget.id,
                reason: 'Supplier barcode belongs to this product',
                companyStockDetailId: product.id,
                clientDocumentId: resolveDocumentId,
            });
            setLinkResolveTarget(null);
            return;
        }
        await addProductToItems(product, Math.max(1, Number(scannedBaseQuantity) || 1));
    };

    // Barcode Scan (3075/3078): known barcode -> add the matched product as a normal GRV
    // line using companyStockDetailId + baseStockQuantity; unknown barcode -> Unknown
    // Barcode modal -> queued as a temporary item and added against the GRV after create.
    const scanMut = useScanBarcode();

    const [scannedBarcode, setScannedBarcode] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);

    // Unknown-barcode capture
    const [unknownBarcode, setUnknownBarcode] = useState<string>('');
    const [unknownScanInfo, setUnknownScanInfo] = useState<string>('');
    const [tempDescription, setTempDescription] = useState('');
    const [tempQuantity, setTempQuantity] = useState(1);
    const [tempUnitPrice, setTempUnitPrice] = useState('');

    const handleScannedProduct = async (barcode: string) => {
        if (invoiceLocked) {
            toast.error('Cannot add products — items are locked to the selected supplier invoice');
            return;
        }
        if (!companyCreditorId) {
            toast.error('Please select account before scanning the barcode');
            return;
        }
        const code = String(barcode);
        if (!code.trim()) {
            toast.error('Enter a barcode to scan');
            return;
        }
        setIsScanning(true);

        // Product barcodes (including SHRINK/CASE/PALLET package mappings) resolve through
        // the barcode service first so the converted base quantity is used. Unmapped
        // barcodes continue through the GRV scan endpoint below.
        try {
            const warehouseId = form.getValues('warehouseId');
            const resolved = await resolveStockBarcode({
                barcode: code,
                scannedPackageQuantity: 1,
                ...(warehouseId ? { warehouseId } : {}),
            });
            const resolvedData = resolved?.data;
            if (resolved?.success && resolvedData?.companyStockDetailId) {
                const product =
                    stockList.find((p) => p.id === resolvedData.companyStockDetailId) ||
                    (await companyStockDetailById(resolvedData.companyStockDetailId))?.data;
                if (product) {
                    const quantity =
                        typeof resolvedData.baseStockQuantity === 'number' && resolvedData.baseStockQuantity > 0
                            ? resolvedData.baseStockQuantity
                            : 1;
                    await addProductToItems(product, quantity);
                    setIsScanning(false);
                    return;
                }
            }
        } catch {
            // Not a mapped barcode; use the GRV scan endpoint.
        }

        scanMut.mutate(
            { barcode: code, scannedPackageQuantity: 1 },
            {
                onSuccess: (data) => {
                    setIsScanning(false);
                    if (!data?.success) {
                        toast.error(data?.message || 'Scan failed');
                        return;
                    }
                    const result = data.data;
                    // Known scan: add/update a normal GRV line from the matched product.
                    const matchedStockDetailId = result?.companyStockDetailId || result?.matchedStockDetailId;
                    if (matchedStockDetailId) {
                        const product = stockList.find((p) => p.id === matchedStockDetailId);
                        if (product) {
                            // 3078: baseStockQuantity (scannedPackageQuantity * baseQuantityPerScan)
                            // is the item quantity returned for a known scan.
                            const quantity =
                                typeof result?.baseStockQuantity === 'number' && result.baseStockQuantity > 0
                                    ? result.baseStockQuantity
                                    : 1;
                            addProductToItems(product, quantity);
                            if (result?.replacedBarcode) {
                                toast.info('Old/replaced barcode recognised.');
                            }
                        } else {
                            // Fall back to the product picker pre-filtered by the barcode.
                            setScannedBarcode(code);
                        }
                        // Never show the temporary-product modal for a known scan.
                        return;
                    }
                    // Unknown scan: capture modal (never silently select a similar product).
                    setUnknownBarcode(code);
                    setUnknownScanInfo(result?.message || '');
                    setTempDescription(result?.description || '');
                },
                onError: (error: any) => {
                    setIsScanning(false);
                    // Show the returned message; do not silently fall back to the product picker.
                    toast.error(
                        error?.response?.data?.message || 'Scan failed. Please retry or add the product manually.',
                    );
                },
            },
        );
    };

    const handleQueuePendingBarcodeItem = () => {
        if (!unknownBarcode.trim()) return;
        if (!tempQuantity || tempQuantity <= 0) {
            toast.error('Enter a quantity for the temporary item');
            return;
        }
        onPendingTempItemsChange([
            ...pendingTempItems,
            {
                barcode: unknownBarcode,
                description: tempDescription.trim() || undefined,
                quantity: tempQuantity,
                unitPrice: tempUnitPrice ? Number(tempUnitPrice) : undefined,
                clientDocumentId: generateUUIDForData(),
            },
        ]);
        setUnknownBarcode('');
        setTempDescription('');
        setTempQuantity(1);
        setTempUnitPrice('');
        toast.success('Temporary barcode item queued — it will be added to the GRV once created');
    };

    const removePendingBarcodeItem = (clientDocumentId: string) => {
        onPendingTempItemsChange(pendingTempItems.filter((item) => item.clientDocumentId !== clientDocumentId));
    };

    // --------------------------------------- 3080/3081 LINK / CREATE ---------------------------------------

    const startLinkResolve = (item: TempItem) => {
        setResolveDocumentId(generateUUIDForData());
        setLinkResolveTarget(item);
    };

    const openCreateResolve = (item: TempItem) => {
        setResolveTarget(item);
        setCreateItemCode('');
        setCreateDescription(item.description || '');
        setCreateTaxRateId('');
        setCreatePricingTypeId('');
        setCreateSellingPrice('');
        setResolveDocumentId(generateUUIDForData());
    };

    const closeResolve = () => {
        setResolveTarget(null);
        setLinkResolveTarget(null);
        pendingResolveRef.current = null;
        setResolveDocumentId('');
    };

    // Resend the exact same request with the approval token (3224). Token is memory-only.
    const submitWithToken = (payload: Record<string, unknown>) => {
        resolveMut
            .mutateAsync(payload as any)
            .then((data) => {
                if (data?.success) {
                    toast.success('Temporary barcode item resolved');
                    closeResolve();
                    onUnresolvedRefetch();
                } else {
                    toast.error(data?.message || 'Resolve failed');
                }
            })
            .catch((error) => {
                const info = isApprovalRequiredError(error);
                if (info) {
                    // 428 APPROVAL_REQUIRED: item stays UNRESOLVED until a supervisor approves.
                    pendingResolveRef.current = { ...payload };
                    setApproval({ ...info, actionLabel: 'Resolve Barcode' });
                } else {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleResolveApproved = (token: string) => {
        const meta = pendingResolveRef.current;
        if (!meta) {
            closeApproval();
            return;
        }
        // Approval token is held in memory only (3228).
        submitWithToken({ ...meta, approvalToken: token });
    };

    const handleCreateConfirm = () => {
        if (!resolveTarget) return;
        if (!createDescription.trim()) {
            toast.error('Product description is required');
            return;
        }
        submitWithToken({
            action: 'CREATE',
            grvItemId: resolveTarget.grvItemId || resolveTarget.id,
            reason: 'New supplier product',
            clientDocumentId: resolveDocumentId,
            productData: {
                itemCode: createItemCode.trim() || undefined,
                description: createDescription.trim(),
                companyTaxRateId: createTaxRateId || undefined,
                companyStockPricingTypeId: createPricingTypeId || undefined,
                sellingPrice: createSellingPrice ? Number(createSellingPrice) : undefined,
            },
        });
    };

    // On product Selection close
    function onProductSelectionClose() {
        setIsItemDialogOpen(false);
        setScannedBarcode('');
        setLinkResolveTarget(null);
    }

    const recalculateItemLines = (item: GoodsReceivingCartItem): GoodsReceivingCartItem => {
        const originalUnitPrice = item.originalUnitPrice || item.unitPrice;
        const totalItems = item.quantity + item.freeStock;

        const next = { ...item };

        if (item.isPriceLocked) {
            const totalLinePrice = originalUnitPrice * item.quantity;
            const effectiveUnitPrice = totalItems > 0 ? totalLinePrice / totalItems : originalUnitPrice;
            next.unitPrice = effectiveUnitPrice;
            const discountAmount = totalLinePrice * (item.discountPercentage / 100);
            next.discount = discountAmount;
            next.lineTotal = totalLinePrice - discountAmount;
        } else {
            const totalLinePrice = item.unitPrice * totalItems;
            const discountAmount = totalLinePrice * (item.discountPercentage / 100);
            next.discount = discountAmount;
            next.lineTotal = totalLinePrice - discountAmount;
        }

        return next;
    };

    const updateItem = (index: number, updates: Partial<GoodsReceivingCartItem>) => {
        const currentItems = form.getValues('items');
        const updatedItems = [...currentItems];

        const item = { ...updatedItems[index], ...updates };

        if ('isPriceLocked' in updates && updates.isPriceLocked) {
            item.unitPrice = item.originalUnitPrice || item.unitPrice;
        }

        const requiresRecalc =
            'quantity' in updates ||
            'discountPercentage' in updates ||
            'unitPrice' in updates ||
            'freeStock' in updates ||
            'isPriceLocked' in updates;

        updatedItems[index] = requiresRecalc ? recalculateItemLines(item) : item;

        // Commit the edit first so a typed quantity is never lost, even if the
        // quantity-wise discount lookup below is slow or fails.
        form.setValue('items', updatedItems);

        // Refresh the applicable discount in the background after a quantity change.
        // The quantity itself is already saved above — discount is applied only as
        // a follow-up so the entered quantity can never be reverted by an API hiccup.
        if ('quantity' in updates) {
            const companyCreditorId = form.getValues('companyCreditorId') || '';
            const committed = updatedItems[index] as GoodsReceivingCartItem;

            // 3044/3047: keep the rebate preview in step with the new quantity (best-effort).
            void refreshRebatePreview(committed.companyStockDetailId, committed.unitPrice, committed.quantity);

            if (!companyCreditorId) return;

            getApplicableDiscount({
                companyCreditorId,
                companyStockDetailId: committed.companyStockDetailId,
                quantity: committed.quantity,
            })
                .then((result) => {
                    const latestItems = form.getValues('items');
                    const latest = latestItems[index] as GoodsReceivingCartItem | undefined;
                    if (
                        !latest ||
                        latest.companyStockDetailId !== committed.companyStockDetailId ||
                        latest.quantity !== committed.quantity
                    ) {
                        return;
                    }

                    const discountPercent = result.data?.discountPercent ?? latest.discountPercentage;
                    const next = recalculateItemLines({ ...latest, discountPercentage: discountPercent });

                    const nextItems = [...latestItems];
                    nextItems[index] = next;
                    form.setValue('items', nextItems);

                    if (next.discount) {
                        toast.success(
                            `A discount of ${currencySymbol} ${next.discount.toFixed(2)} has been applied to ${next.description}.`,
                        );
                    }
                })
                .catch(() => {
                    // Keep the quantity the user entered; the discount simply stays unchanged.
                });
        }
    };

    const removeItem = (index: number) => {
        const currentItems = form.getValues('items');
        const updatedItems = currentItems.filter((_, i) => i !== index);
        form.setValue('items', updatedItems);
    };

    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';

    return (
        <PageLoader isLoading={isLoading}>
            <div className="mt-4 p-2">
                <div>
                    <div className="mb-2 flex w-full justify-end gap-2">
                        {invoiceLocked && (
                            <span className="text-muted-foreground self-center text-xs">
                                Items locked to the selected supplier invoice — quantity &amp; variance only.
                            </span>
                        )}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <Button
                                            disabled={
                                                invoiceLocked || (!form.watch('companyCreditorId') && !isCompanyDebtor)
                                            }
                                            onClick={() => setIsItemDialogOpen(true)}
                                            variant="outline"
                                            type="button"
                                        >
                                            <CirclePlus className="h-6 w-6 text-gray-600" />
                                            <span className="text-xs">Select Product</span>
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                {invoiceLocked ? (
                                    <TooltipContent>
                                        Cannot add products — items are locked to the selected supplier invoice
                                    </TooltipContent>
                                ) : !form.watch('companyCreditorId') && !isCompanyDebtor ? (
                                    <TooltipContent>Please select a creditor first</TooltipContent>
                                ) : null}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    {grvId && unresolvedItems.length > 0 && (
                        <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                            {unresolvedItems.length} unresolved temporary barcode item(s) on this GRV. Link or create
                            the product for each — the final GRV action stays locked while these remain.
                        </div>
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col.key}>{col.label}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => (
                                <Fragment key={`${item.companyStockDetailId}-${index}`}>
                                    <ProductList
                                        item={item}
                                        index={index}
                                        onUpdate={updateItem}
                                        onRemove={removeItem}
                                        locked={invoiceLocked}
                                        rebatePreview={rebatePreviews[item.companyStockDetailId]}
                                        currencySymbol={currencySymbol}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="items"
                                        render={({ fieldState }) => {
                                            const itemError =
                                                fieldState.error && Array.isArray(fieldState.error)
                                                    ? fieldState.error[index]
                                                    : null;

                                            if (!itemError) return <></>;

                                            return (
                                                <TableRow>
                                                    <TableCell colSpan={columns.length} className="bg-red-50 py-1">
                                                        <div className="ml-1 text-xs text-red-500">
                                                            {itemError?.quantity?.message && (
                                                                <>{itemError?.quantity?.message}</>
                                                            )}
                                                            {itemError.freeStock?.message && (
                                                                <>
                                                                    {itemError?.quantity?.message ? ' |' : ''}{' '}
                                                                    {itemError?.freeStock?.message}
                                                                </>
                                                            )}
                                                            {itemError.sellingPrice?.message && (
                                                                <>
                                                                    {itemError?.quantity?.message ||
                                                                    itemError?.freeStock?.message
                                                                        ? ' | '
                                                                        : ''}
                                                                    {itemError?.sellingPrice?.message}
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }}
                                    />
                                </Fragment>
                            ))}

                            {/* 3227: unresolved temporary barcode rows (edit mode) */}
                            {grvId &&
                                unresolvedItems.map((tempItem, index) => (
                                    <TableRow
                                        key={tempItem.grvItemId || tempItem.id || `temp-${index}`}
                                        className="bg-amber-50/60"
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                                    Temporary
                                                </span>
                                                <span className="font-mono text-xs">{tempItem.barcode || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[180px] truncate">
                                            {tempItem.description || 'N/A'}
                                        </TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>
                                            {tempItem.unitPrice != null
                                                ? `${currencySymbol}${Number(tempItem.unitPrice).toFixed(2)}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>{Number(tempItem.quantity || 0)}</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>
                                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                                                UNRESOLVED
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 gap-1 px-2 text-xs"
                                                    disabled={resolveMut.isPending}
                                                    onClick={() => startLinkResolve(tempItem)}
                                                >
                                                    <Link2 className="h-3.5 w-3.5" /> Link
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 gap-1 px-2 text-xs"
                                                    disabled={resolveMut.isPending}
                                                    onClick={() => openCreateResolve(tempItem)}
                                                >
                                                    <PackagePlus className="h-3.5 w-3.5" /> Create
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>

                    <FormField
                        control={form.control}
                        name="items"
                        render={({ fieldState }) => (
                            <FormItem>
                                <FormMessage className="!my-2 ml-1 !text-xs" />
                            </FormItem>
                        )}
                    />
                </div>

                {(isItemDialogOpen || scannedBarcode || linkResolveTarget) &&
                    (!invoiceLocked || !!linkResolveTarget) && (
                        <ProductSelection
                            isOpen={isItemDialogOpen || !!linkResolveTarget}
                            onClose={onProductSelectionClose}
                            onSelectProduct={handleSelectProduct}
                            companyDebtorId={companyCreditorId}
                            warehouseId={form.watch('warehouseId')}
                            key={companyCreditorId}
                            isOnline={isOnline}
                            scannedBarcode={scannedBarcode}
                            setScannedBarcode={setScannedBarcode}
                            isGRV={true}
                        />
                    )}

                {pendingTempItems.length > 0 && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-amber-800">
                                Temporary Barcode Items ({pendingTempItems.length})
                            </div>
                            <div className="text-xs text-amber-700">
                                Added to this GRV after it is created, then resolved with Link / Create.
                            </div>
                        </div>
                        <div className="mt-2 space-y-1">
                            {pendingTempItems.map((item) => (
                                <div
                                    key={item.clientDocumentId}
                                    className="flex items-center justify-between gap-2 text-sm"
                                >
                                    <span className="font-mono text-xs font-medium text-amber-900">{item.barcode}</span>
                                    <span className="flex-1 truncate text-amber-800">
                                        {item.description || 'No description'}
                                        {item.unitPrice != null
                                            ? ` · ${currencySymbol}${item.unitPrice.toFixed(2)}`
                                            : ''}
                                    </span>
                                    <span className="text-amber-800">Qty {item.quantity}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => removePendingBarcodeItem(item.clientDocumentId)}
                                        title="Remove temporary item"
                                    >
                                        <Trash2Icon className="h-3.5 w-3.5 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <BarcodeScanner onScan={handleScannedProduct} active={!invoiceLocked} />
            </div>

            {/* 3067/3079 Unknown barcode modal */}
            <Dialog open={!!unknownBarcode} onOpenChange={(open) => !open && setUnknownBarcode('')}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Unknown Barcode</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                            Barcode <span className="font-mono font-semibold">{unknownBarcode}</span> is not linked to a
                            product. Record it as a temporary item — it is added to this GRV after creation and resolved
                            with Link / Create.
                            {unknownScanInfo && <div className="mt-1 text-xs opacity-80">{unknownScanInfo}</div>}
                        </div>
                        <div>
                            <Label className="text-xs">Description</Label>
                            <Input
                                className="h-9"
                                value={tempDescription}
                                onChange={(e) => setTempDescription(e.target.value)}
                                placeholder="Unknown product description"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Quantity</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    className="h-9"
                                    value={tempQuantity}
                                    onChange={(e) => setTempQuantity(Number(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Unit Price</Label>
                                <Input
                                    type="number"
                                    className="h-9"
                                    value={tempUnitPrice}
                                    onChange={(e) => setTempUnitPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setUnknownBarcode('')}>
                            Skip
                        </Button>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={handleQueuePendingBarcodeItem}
                        >
                            Add as Temporary Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 3081 Create product from unknown barcode */}
            <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && closeResolve()}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Create Product from Unknown Barcode</DialogTitle>
                        <DialogDescription>
                            Barcode: <span className="font-mono font-semibold">{resolveTarget?.barcode || 'N/A'}</span>
                            {resolveTarget?.description ? ` · ${resolveTarget.description}` : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">Description</Label>
                            <Input
                                className="h-8 text-xs"
                                value={createDescription}
                                onChange={(e) => setCreateDescription(e.target.value)}
                                placeholder="New product name"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Item Code</Label>
                            <Input
                                className="h-8 text-xs"
                                value={createItemCode}
                                onChange={(e) => setCreateItemCode(e.target.value)}
                                placeholder="NEW-SKU-001"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Tax Rate</Label>
                            <SelectPopover
                                title="tax rate"
                                selectedValue={createTaxRateId}
                                options={taxRateList.map((t) => ({
                                    value: t.id,
                                    label: `${t.name}${t.taxRatePercent ? ` (${t.taxRatePercent}%)` : ''}`,
                                }))}
                                onSelect={(val) => setCreateTaxRateId(val || '')}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Pricing Type</Label>
                            <SelectPopover
                                title="pricing type"
                                selectedValue={createPricingTypeId}
                                options={pricingTypeList.map((p) => ({
                                    value: p.id,
                                    label: p.name || p.code || p.id,
                                }))}
                                onSelect={(val) => setCreatePricingTypeId(val || '')}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Selling Price</Label>
                            <Input
                                type="number"
                                className="h-8 text-xs"
                                value={createSellingPrice}
                                onChange={(e) => setCreateSellingPrice(e.target.value)}
                                placeholder="Optional - omit to skip selling price"
                            />
                        </div>
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
                            3224: actions requiring supervisor approval stay unresolved until a supervisor approves via
                            the popup, then the same request is resent with the approval token.
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={closeResolve}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={resolveMut.isPending}
                            onClick={handleCreateConfirm}
                        >
                            {resolveMut.isPending ? 'Creating...' : 'Create Product'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 3224 Supervisor approval for APPROVAL_REQUIRED (428) */}
            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                approverGroupName={approval?.approverGroupName}
                onApproved={handleResolveApproved}
            />

            {isScanning && (
                <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <span className="rounded-md bg-white px-4 py-2 text-sm font-medium shadow-md">
                        Scanning barcode...
                    </span>
                </div>
            )}
        </PageLoader>
    );
}

function ProductList({
    item,
    index,
    onUpdate,
    onRemove,
    locked = false,
    rebatePreview,
    currencySymbol = '',
}: {
    item: GoodsReceivingCartItem;
    index: number;
    onUpdate: (index: number, updates: Partial<GoodsReceivingCartItem>) => void;
    onRemove: (index: number) => void;
    locked?: boolean;
    rebatePreview?: RebateCalculationResponse['data'];
    currencySymbol?: string;
}) {
    const [showSellingPrice, setShowSellingPrice] = useState(!!item.companyStockPricingTypeId);
    const companyStockPricingTypes = useCompanyStockPricingTypeList({})?.data?.data?.rows;
    const isInvoiceProduct = item.invoicedQuantity != null || !!item.sourceSupplierInvoiceId || locked;
    const maxQuantity = isInvoiceProduct && item.invoicedQuantity != null ? item.invoicedQuantity : undefined;

    // 3044/3047: prefer the value returned by the server (on an existing GRV) and fall
    // back to the live calculate preview for a line being built.
    const rebateAmount = item.rebateAmount ?? rebatePreview?.rebateAmount;
    const effectiveUnitCost = item.effectiveUnitCost ?? rebatePreview?.effectiveUnitCost;
    const expectedUnitCost = item.expectedUnitCost ?? rebatePreview?.expectedUnitCost ?? null;
    const priceMatchStatus = item.priceMatchStatus ?? rebatePreview?.priceMatchStatus;
    const hasRebateInfo = rebateAmount != null || effectiveUnitCost != null || priceMatchStatus != null;
    const handleSellingPriceToggle = (checked: boolean) => {
        if (locked) return;
        setShowSellingPrice(checked);
        if (!checked) {
            onUpdate(index, {
                companyStockPricingTypeId: undefined,
                sellingPrice: undefined,
                markup: undefined,
                gp: undefined,
            });
        } else {
            const defaultPricingType =
                companyStockPricingTypes?.find((data) => data?.name?.toLowerCase()?.includes('retail'))?.id ||
                companyStockPricingTypes?.[0]?.id;

            onUpdate(index, {
                companyStockPricingTypeId: defaultPricingType,
            });
        }
    };

    return (
        <>
            <TableRow>
                <TableCell>{item.code}</TableCell>
                <TableCell>
                    <div>{item.description}</div>
                    {hasRebateInfo && (
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                            {rebateAmount != null && (
                                <span className="font-medium text-emerald-700">
                                    Rebate {currencySymbol}
                                    {Number(rebateAmount).toFixed(2)}
                                </span>
                            )}
                            {effectiveUnitCost != null && (
                                <span className="text-emerald-700">
                                    Net cost {currencySymbol}
                                    {Number(effectiveUnitCost).toFixed(2)}
                                </span>
                            )}
                            {expectedUnitCost != null && (
                                <span className="text-muted-foreground">
                                    Expected {currencySymbol}
                                    {Number(expectedUnitCost).toFixed(2)}
                                </span>
                            )}
                            {priceMatchStatus && (
                                <span className={priceMatchStatusClass(priceMatchStatus)}>{priceMatchStatus}</span>
                            )}
                        </div>
                    )}
                </TableCell>
                <TableCell>{(item.originalUnitPrice || item.unitPrice).toFixed(2)}</TableCell>
                <TableCell>
                    <Input
                        type="number"
                        value={item.unitPrice}
                        step={1}
                        min={0}
                        onChange={(e) => {
                            const unitPrice = Number(e.target.value) || 0;

                            onUpdate(index, {
                                unitPrice,
                                sellingPrice: 0,
                                gp: 0,
                                markup: 0,
                            });
                        }}
                        className="h-6 w-16 p-1 text-right text-xs"
                        disabled={!!item.isPriceLocked || locked}
                    />
                </TableCell>
                <TableCell>{item.additionalCost || 0}</TableCell>
                <TableCell>
                    <Input
                        type="number"
                        value={item.quantity}
                        min={1}
                        max={isInvoiceProduct ? maxQuantity : undefined}
                        onChange={(e) => {
                            let value = Number(e.target.value) || 1;
                            if (isInvoiceProduct && maxQuantity != null && value > maxQuantity) {
                                value = maxQuantity;
                            }
                            if (value < 1) value = 1;
                            onUpdate(index, { quantity: value });
                        }}
                        title={isInvoiceProduct ? 'Quantity cannot exceed the invoiced quantity' : undefined}
                        className="h-6 w-16 p-1 text-right text-xs"
                    />
                </TableCell>
                <TableCell>
                    {item.invoicedQuantity != null && (
                        <span
                            className={
                                item.quantity - item.invoicedQuantity === 0
                                    ? 'text-muted-foreground'
                                    : item.quantity - item.invoicedQuantity > 0
                                      ? 'font-semibold text-green-600'
                                      : 'font-semibold text-red-600'
                            }
                        >
                            {item.quantity - item.invoicedQuantity > 0 ? '+' : ''}
                            {item.quantity - item.invoicedQuantity}
                        </span>
                    )}
                </TableCell>
                <TableCell>
                    <Input
                        type="number"
                        value={item.freeStock}
                        step={1}
                        min={0}
                        onChange={(e) => onUpdate(index, { freeStock: Number(e.target.value) || 0 })}
                        className="h-6 w-16 p-1 text-right text-xs"
                        disabled={locked}
                    />
                </TableCell>
                <TableCell>
                    <Input
                        type="number"
                        value={item.discountPercentage}
                        onChange={(e) => {
                            if (locked) return;
                            let value = Number(e.target.value) || 0;
                            if (value < 0) value = 0;
                            if (value > 100) value = 100;
                            onUpdate(index, { discountPercentage: value });
                        }}
                        min={0}
                        max={100}
                        className="h-6 w-16 p-1 text-right text-xs"
                        disabled={locked}
                    />
                </TableCell>
                <TableCell>
                    <div className="flex items-center justify-center">
                        <Checkbox
                            checked={item.isPriceLocked || false}
                            disabled={locked || !item.originalUnitPrice}
                            onCheckedChange={(checked) => onUpdate(index, { isPriceLocked: checked === true })}
                        />
                    </div>
                </TableCell>
                <TableCell>{item.lineTotal.toFixed(2)}</TableCell>
                <TableCell>{((item.lineTotal || 0) * ((item.taxPercent || 0) / 100)).toFixed(2)}</TableCell>
                <TableCell>
                    <div className="flex items-center justify-center">
                        <Checkbox
                            checked={showSellingPrice}
                            disabled={locked}
                            onCheckedChange={handleSellingPriceToggle}
                        />
                    </div>
                </TableCell>
                <TableCell>
                    <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="h-6 w-6 text-red-500 hover:text-red-700"
                        onClick={() => onRemove(index)}
                    >
                        <Trash2Icon className="h-4 w-4" />
                        <span className="sr-only">Remove item</span>
                    </Button>
                </TableCell>
            </TableRow>

            {showSellingPrice && (
                <TableRow className="bg-gray-50">
                    <TableCell colSpan={12}>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium">
                                    Pricing Type: <MandatoryField />
                                </Label>
                                {companyStockPricingTypes && (
                                    <SelectPopover
                                        options={companyStockPricingTypes?.map((type) => ({
                                            value: type?.id,
                                            label: type?.name,
                                        }))}
                                        selectedValue={
                                            item.companyStockPricingTypeId ||
                                            companyStockPricingTypes?.find((data) =>
                                                data?.name?.toLowerCase()?.includes('retail'),
                                            )?.id ||
                                            ''
                                        }
                                        onSelect={(val) => onUpdate(index, { companyStockPricingTypeId: val })}
                                        title="Pricing Type"
                                        selectClass="h-6 text-xs"
                                        mandatoryField
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium">
                                    Selling Price (incl.): <MandatoryField />
                                </Label>
                                <Input
                                    type="number"
                                    value={item.sellingPrice || '0.00'}
                                    onChange={(e) => {
                                        const sellingPrice = parseFloat(e.target.value) || 0;
                                        const latestCost = item.lineTotal / (item.quantity + item.freeStock || 0) || 0;

                                        onUpdate(index, {
                                            sellingPrice,
                                            gp: calculateGpPercent(sellingPrice, latestCost),
                                            markup: calculateMarkupPercent(sellingPrice, latestCost),
                                        });
                                    }}
                                    className="h-6 w-24 p-1 text-right text-xs"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium">Markup (%):</Label>
                                <Input
                                    type="number"
                                    value={item.markup || '0.00'}
                                    onChange={(e) => {
                                        const markup = parseFloat(e.target.value) || 0;
                                        const latestCost = item.lineTotal / (item.quantity + item.freeStock || 0) || 0;
                                        const newSellingPrice = calculatePriceFromMarkup(markup, latestCost);

                                        onUpdate(index, {
                                            markup,
                                            sellingPrice: newSellingPrice,
                                            gp: calculateGpPercent(newSellingPrice, latestCost),
                                        });
                                    }}
                                    className="h-6 w-24 p-1 text-right text-xs"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium">GP (%):</Label>
                                <Input
                                    type="number"
                                    value={item.gp || '0.00'}
                                    onChange={(e) => {
                                        const gp = parseFloat(e.target.value) || 0;
                                        const latestCost = item.lineTotal / (item.quantity + item.freeStock || 0) || 0;
                                        const newSellingPrice = calculatePriceFromGp(gp, latestCost);

                                        onUpdate(index, {
                                            gp,
                                            sellingPrice: newSellingPrice,
                                            markup: calculateMarkupPercent(newSellingPrice, latestCost),
                                        });
                                    }}
                                    className="h-6 w-24 p-1 text-right text-xs"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

// 3141: GRV price-matching and claims. Shows the complete price-match result returned
// for a GRV and lets the operator approve or dispute a cost variance. The original GRV
// cost and tax are never modified by the rebate-adjusted values shown here. Approve /
// dispute may answer 428 APPROVAL_REQUIRED; the same request is then resent with the
// supervisor approval token (sent as the X-Approval-Token header by the API layer).
function GrvPriceMatchPanel({ grvId, onRefreshGrv }: { grvId: string; onRefreshGrv?: () => void }) {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const { data, isLoading, refetch } = useGetGrvPriceMatch(grvId);
    const approveMut = useApproveGrvPriceMatch();
    const disputeMut = useDisputeGrvPriceMatch();

    // 3224: owns its own approval cycle so it does not clash with the barcode-resolve one.
    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const pendingRef = useRef<{ action: 'approve' | 'dispute'; reason: string } | null>(null);

    const [action, setAction] = useState<'approve' | 'dispute' | null>(null);
    const [reason, setReason] = useState('');

    const fmt = (value?: number | null) => `${currencySymbol}${Number(value ?? 0).toFixed(2)}`;

    const run = async (actionType: 'approve' | 'dispute', reasonText: string, approvalToken?: string) => {
        const mut = actionType === 'approve' ? approveMut : disputeMut;
        try {
            const res = await mut.mutateAsync({ goodsReceivingOrderId: grvId, reason: reasonText, approvalToken });
            if (res?.success === false) {
                toast.error(res.message || 'Action failed');
                return;
            }
            toast.success(actionType === 'approve' ? 'Price variance approved' : 'Price variance disputed');
            pendingRef.current = null;
            setAction(null);
            setReason('');
            await refetch();
            onRefreshGrv?.();
        } catch (error) {
            const info = isApprovalRequiredError(error);
            if (info) {
                pendingRef.current = { action: actionType, reason: reasonText };
                setApproval({
                    ...info,
                    actionLabel: actionType === 'approve' ? 'Approve Price Variance' : 'Dispute Price Variance',
                });
            } else {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Action failed');
            }
        }
    };

    const handleApproved = (token: string) => {
        const pending = pendingRef.current;
        if (!pending) {
            closeApproval();
            return;
        }
        void run(pending.action, pending.reason, token);
    };

    const handleConfirm = () => {
        if (!action) return;
        if (!reason.trim()) {
            toast.error('Reason is required');
            return;
        }
        void run(action, reason.trim());
    };

    if (isLoading) {
        return <div className="text-muted-foreground mx-4 mt-4 text-xs">Loading price-match result…</div>;
    }

    const details: GrvPriceMatchDetails | undefined = data?.data;
    if (!details) return null;

    const lines: GrvPriceMatchItem[] = details.items || details.rows || [];
    const busy = approveMut.isPending || disputeMut.isPending;
    const actionable = !!details.priceMatchStatus && details.priceMatchStatus !== 'MATCHED';

    return (
        <div className="mx-4 mt-4 rounded-md border p-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Price Match &amp; Rebate</h3>
                {details.priceMatchStatus && (
                    <span className={priceMatchStatusClass(details.priceMatchStatus)}>{details.priceMatchStatus}</span>
                )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-4">
                <div>
                    Gross Invoice Value: <span className="font-medium">{fmt(details.grossValue)}</span>
                </div>
                <div>
                    Rebate / Allowance: <span className="font-medium text-emerald-700">{fmt(details.rebateValue)}</span>
                </div>
                <div>
                    Net Payable: <span className="font-medium">{fmt(details.netPayableValue)}</span>
                </div>
                <div>
                    Calculated:{' '}
                    <span className="font-medium">
                        {details.rebateCalculatedAt
                            ? moment(details.rebateCalculatedAt).format('YYYY-MM-DD HH:mm')
                            : '-'}
                    </span>
                </div>
                {details.supplierPurchaseCommitmentId && (
                    <div className="col-span-2">
                        Commitment:{' '}
                        <span className="font-mono text-[11px]">{details.supplierPurchaseCommitmentId}</span>
                    </div>
                )}
                {!!details.rebateBreakdown?.length && (
                    <div className="col-span-2 md:col-span-4">
                        Breakdown:{' '}
                        {details.rebateBreakdown.map((entry, index) => (
                            <span key={entry.allowanceId || index} className="mr-3 inline-block">
                                {entry.allowanceName || entry.allowanceCode || 'Allowance'}
                                {entry.amount != null
                                    ? `: ${fmt(entry.amount)}`
                                    : entry.value != null
                                      ? `: ${fmt(entry.value)}`
                                      : ''}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {lines.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Unit Cost</TableHead>
                                <TableHead>Expected</TableHead>
                                <TableHead>Effective Cost</TableHead>
                                <TableHead>Variance</TableHead>
                                <TableHead>Rebate</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lines.map((line, idx) => {
                                const variance = line.costVarianceAmount ?? 0;
                                return (
                                    <TableRow key={line.companyStockDetailId || `pm-${idx}`}>
                                        <TableCell className="font-mono text-[11px]">
                                            <div>{line.companyStockDetailId || '-'}</div>
                                            {line.supplierDealId && (
                                                <div className="text-muted-foreground text-[10px]">
                                                    Deal: {line.supplierDealId}
                                                </div>
                                            )}
                                            {line.priceMatchNotes && (
                                                <div className="text-muted-foreground max-w-[220px] text-[10px] font-sans">
                                                    {line.priceMatchNotes}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{fmt(line.unitCost)}</TableCell>
                                        <TableCell>
                                            {line.expectedUnitCost != null ? fmt(line.expectedUnitCost) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {line.effectiveUnitCost != null ? fmt(line.effectiveUnitCost) : '-'}
                                        </TableCell>
                                        <TableCell
                                            className={
                                                variance === 0
                                                    ? ''
                                                    : variance > 0
                                                      ? 'font-semibold text-red-600'
                                                      : 'text-green-600'
                                            }
                                        >
                                            {variance === 0
                                                ? fmt(0)
                                                : `${variance > 0 ? '+' : ''}${fmt(variance)} (${Number(
                                                      line.costVariancePercent ?? 0,
                                                  ).toFixed(1)}%)`}
                                        </TableCell>
                                        <TableCell className="align-top text-emerald-700">
                                            <div>{line.rebateAmount != null ? fmt(line.rebateAmount) : '-'}</div>
                                            {!!line.rebateBreakdown?.length && (
                                                <div className="mt-0.5 space-y-0.5">
                                                    {line.rebateBreakdown.map((entry, bIdx) => (
                                                        <div
                                                            key={entry.allowanceId || `${bIdx}`}
                                                            className="text-muted-foreground text-[10px] font-normal"
                                                        >
                                                            {entry.allowanceName || entry.allowanceCode || 'Allowance'}
                                                            {entry.amount != null
                                                                ? `: ${fmt(entry.amount)}`
                                                                : entry.value != null
                                                                  ? `: ${fmt(entry.value)}`
                                                                  : ''}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{line.matchSource || '-'}</TableCell>
                                        <TableCell>
                                            {line.priceMatchStatus ? (
                                                <span className={priceMatchStatusClass(line.priceMatchStatus)}>
                                                    {line.priceMatchStatus}
                                                </span>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {actionable && (
                <div className="mt-3 flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                            setAction('dispute');
                            setReason('');
                        }}
                    >
                        Dispute
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                            setAction('approve');
                            setReason('');
                        }}
                    >
                        Approve Variance
                    </Button>
                </div>
            )}

            <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {action === 'approve' ? 'Approve Price Variance' : 'Dispute Price Variance'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label className="text-xs">Reason</Label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="Enter a reason"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setAction(null)}>
                            Cancel
                        </Button>
                        <Button type="button" disabled={busy} onClick={handleConfirm}>
                            {busy ? 'Submitting…' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                approverGroupName={approval?.approverGroupName}
                onApproved={handleApproved}
            />
        </div>
    );
}
