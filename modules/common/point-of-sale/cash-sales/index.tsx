import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MinusIcon, PackagePlus, PlusIcon, Trash2Icon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DebtorSelection } from './debtor-selection';
import VoidSale from './actions/void-sale';
import CustomerInfo from './actions/customer-info';
import SuspendSale from './actions/suspend-sale';
import CreditCharge from './actions/credit-charge';
import PaymentScreen from './actions/payment-screen';
import { RepSelection } from '../../hoc/rep-selection';
import SuspendedCashSales from './suspended';
import { CompanyStockDetailsListResponse, StockDetails } from '@/api-queries/company/stock-details';
import { CompanyCreditor } from '@/types';
import { CartItemPricingType } from '@/api-queries/point-of-sale';
import { TenderDetails } from '@/api-queries/point-of-sale/tenders';
import {
    CashSaleCreateSchema,
    useCreateCashSales,
    AppliedDiscountType,
    CashSaleCartItem,
    CashSaleInvoiceType,
    CashSaleCustomerSchema,
    GetCashSaleResponse,
    CashSalesDetails,
} from '@/api-queries/point-of-sale/cash-sales';
import CashSaleInvoiceDialog from './invoice/invoice-dialog';
import { useGetCompanyDefaultSettingsOnesList } from '@/api-queries/company-settings';
import { TENDER_TYPES } from '@/lib/constant';
import moment from 'moment-timezone';
import { useAuthUser } from '@/stores/auth-user.store';
import { useCreateVoidedSales, VoidSaleCreateSchema } from '@/api-queries/point-of-sale/void-cash-sales';
import { ProductSearchSelection } from '../../hoc/product-search-selection';
import {
    SuspendedSaleCreateSchema,
    SuspendedSaleCustomerSchema,
    SuspendedSalesDetails,
    useCreateSuspendedSale,
} from '@/api-queries/point-of-sale/suspended-sales';
import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
import { useNetworkStore } from '@/stores/network.store';
import { generateUUIDForData, getApiKey, getIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';
import { apiUrls } from '@/api-queries';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useQueryClient } from '@tanstack/react-query';
import { UserDetails } from '@/api-queries/user';
import SupervisorLogin from '../../hoc/supervisor-login';
import BarcodeScanner from '../../hoc/bar-code-scanner';
import { LoyaltyPointRedemptionDetails } from '@/api-queries/loyalty';
import { AppliedPromotionDetails, EvaluatePromotionData, useEvaluatePromotion, EvaluatePromotionFreeItemOffer } from '@/api-queries/promotions';
import { getApplicableDiscount } from '@/api-queries/quantity-wise-discount';
import {
    getStockDispositionById,
    isSellableNST,
    matchDispositionSaleError,
    nstAllowsPromotionStacking,
    nstNotSellableReason,
    nstVersion,
    parseNSTLabelScan,
    verifyNSTLinesForCheckout,
    StockDisposition,
} from '@/api-queries/nst';
import NSTPickerDialog from '@/modules/common/nst/nst-picker-dialog';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import OverrideReasonDialog from '@/components/approval/override-reason-dialog';
import { useOverrideReason } from '@/hooks/use-override-reason';
import { useNegativeStockOverride, getNegativeStockLines } from '@/hooks/use-negative-stock-override';
import NegativeStockOverrideDialog from './negative-stock-override-dialog';
import { useGetSecurityActions } from '@/api-queries/security';
import { useResolvePricingMatrix } from '@/api-queries/pricing-policy';
import { useActiveTillSession, getTillBalanceStatus, isTillSessionActive } from '@/api-queries/till-session';
import { useTillSessionState } from '@/stores/till-session.store';
import OpenTillDialog from './open-till-dialog';
import TillDrawerStatus from './till-drawer-status';
import { isPackSellingUnit, unitsPerSellingUnit } from '@/utils/selling-unit';
import { ManualDiscountInput } from '@/components/custom-components/manual-discount-input';
import {
    clampDiscount,
    getAutomaticDiscountAmount,
    getManualDiscountAmount,
    getManualDiscountValue,
    hasManualDiscount,
    roundDiscount,
    toManualDiscountPayload,
    withManualDiscount,
} from '@/lib/manual-discount';

// Approval action codes the cash-sale create endpoint can require. The server names the
// action in its 428 body and the granted token must be resent under that same key.
//
//   POS_DISCOUNT_OVERRIDE       the pricing matrix flagged a discount / price override
//   POS_NEGATIVE_STOCK_OVERRIDE the sale would drive available stock below zero
//
// The client never sends a flag such as negativeStockOverride to pre-empt the decision -
// it submits the normal payload and lets the backend decide, then retries with the token.
export const NEGATIVE_STOCK_ACTION_CODE = 'POS_NEGATIVE_STOCK_OVERRIDE';
export const DISCOUNT_OVERRIDE_ACTION_CODE = 'POS_DISCOUNT_OVERRIDE';
// Used only when a 428 arrives without an action code, so a token is still keyed
// against the action it was actually requested for.
const DEFAULT_APPROVAL_ACTION_CODE = DISCOUNT_OVERRIDE_ACTION_CODE;

export type CashSaleApprovalTokens = {
    POS_DISCOUNT_OVERRIDE?: string;
    POS_NEGATIVE_STOCK_OVERRIDE?: string;
};

export interface SplitPaymentEntry {
    tenderTypeId: string;
    tenderType: string;
    description: string;
    amount: number;
    remarks: string;
}

export interface PaymentSuccessType {
    netAmountToPay: number;
    manualDiscount: number;
    selectedPaymentMethod: TenderDetails;
    changeDue: number;
    bankAccountNumber: string;
    chequeReference: string;
    cardNumber: string;
    cardExpiryDate: string;
    loyaltyPointRes?: LoyaltyPointRedemptionDetails;
    appliedDiscount: AppliedDiscountType;
    isSplitPayment?: boolean;
    payments?: SplitPaymentEntry[];
    // Full server-side promotion evaluation for the cart. When present it is the source of
    // truth for the promotion discount and the free / reward lines appended to the order.
    promotionEvaluation?: EvaluatePromotionData | null;
}

// A discounted-stock line is limited by its allocation, not by the product's overall
// on-hand quantity: the cart must show the NST remaining quantity as its stock.
const getCartLineStock = (item: CashSaleCartItem) =>
    item.stockDispositionId
        ? (item.dispositionRemainingQuantity ?? 0)
        : (item.availableStock ?? item.stockOnHand ?? 0);

export default function POSScreen() {
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);

    const isOnline = useNetworkStore((state) => state?.online);

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';

    // Active till session: online checkouts must be recorded against an opened till session.
    const activeTillSessionQuery = useActiveTillSession(isOnline);
    const activeTillSession = activeTillSessionQuery.data?.data;

    useEffect(() => {
        if (!isOnline) return;
        // A session is open when the backend reports status ACTIVE (from
        // /session/active and /session/open) or OPEN.
        if (isTillSessionActive(activeTillSession)) {
            useTillSessionState.getState().setTillSession(activeTillSession);
        } else if (activeTillSessionQuery.isFetched) {
            useTillSessionState.getState().clearTillSession();
        }
    }, [activeTillSession, activeTillSessionQuery.isFetched, isOnline]);

    const [showOpenTillDialog, setShowOpenTillDialog] = useState(false);

    // The Open Till prompt is only ever shown for a cashier that has an active till
    // assignment. A user with no assignment is left alone and the checkout gate
    // surfaces the "contact your administrator" message instead.
    const authUser = useAuthUser((state) => state.user);
    const nstInventoryScope = authUser?.userType === 'COMPANY-DEBTOR-USER' ? 'STORE' : 'COMPANY';
    const nstCompanyDebtorId =
        nstInventoryScope === 'STORE' ? authUser?.companyDebtorId || null : null;
    const hasActiveTillAssignment = (authUser?.eligibleTills?.length || 0) > 0;
    const storedTillSession = useTillSessionState((state) => state.tillSession);
    const hasOpenSessionForUi = isTillSessionActive(storedTillSession);

    // The session the live drawer widget reports against: the locally stored session
    // (kept in sync from /session/active) with the server value as the fallback.
    const openSessionForDrawer = isTillSessionActive(storedTillSession)
        ? storedTillSession
        : isTillSessionActive(activeTillSession)
          ? activeTillSession
          : null;

    // Prompt on POS load: once the session state is known and there is no open
    // session, the Open Till dialog is raised immediately rather than waiting for
    // the first checkout attempt. A dismissed prompt is not re-raised in a loop -
    // the checkout gate still re-opens it if the cashier tries to take payment.
    const autoPromptedRef = useRef(false);
    useEffect(() => {
        if (!isOnline) return;
        const sessionKnown = activeTillSessionQuery.isFetched && !activeTillSessionQuery.isError;
        if (hasOpenSessionForUi) {
            autoPromptedRef.current = false;
            return;
        }
        if (!sessionKnown || !hasActiveTillAssignment) return;
        if (!autoPromptedRef.current) {
            autoPromptedRef.current = true;
            setShowOpenTillDialog(true);
        }
    }, [
        isOnline,
        activeTillSessionQuery.isFetched,
        activeTillSessionQuery.isError,
        hasOpenSessionForUi,
        hasActiveTillAssignment,
    ]);

    // A normal sale never touches the NST API. The allocation is loaded only when the
    // cashier picks the near-expiry option on a line, and re-checked before checkout.
    const [nstPickerLine, setNstPickerLine] = useState<CashSaleCartItem | null>(null);
    // Opens the "Add Discounted Stock" picker (all sellable allocations, no cart line).
    const [nstAllOpen, setNstAllOpen] = useState(false);
    // Blocks promotions for the whole basket once a selected line's rule disallows stacking.
    const nstBlocksPromotionsRef = useRef(false);

    // Turns a chosen allocation into the exact fields the backend expects on that item.
    const buildDispositionAttach = useCallback((d: StockDisposition, baseUnitPrice: number) => {
        if (!isSellableNST(d)) return null;
        // The backend owns the discounted price. Use its allocation price verbatim and
        // never recompute it from the rule's discount, so the line can never disagree
        // with what approval priced. No price means the batch cannot be sold.
        const discountedPrice = d.discountedUnitPrice ?? d.unitPrice;
        if (discountedPrice == null || discountedPrice <= 0) return null;
        return {
            stockDispositionId: d.id,
            stockDispositionVersion: nstVersion(d),
            dispositionType: d.dispositionType,
            originalUnitPrice: d.originalUnitPrice ?? baseUnitPrice,
            dispositionDiscountAmount: Math.round((baseUnitPrice - discountedPrice) * 100) / 100,
            // Display-only details for the NST badge; never sent with the sale.
            dispositionBatchNumber: d.batchNumber,
            dispositionExpiryDate: d.expiryDate,
            dispositionRemainingQuantity: d.remainingQuantity,
            dispositionReason: d.reason,
            dispositionAllowPromotionStacking: nstAllowsPromotionStacking(d),
            // A manual discount must never ride along on an NST line.
            discount: 0,
            manualDiscountType: 'AMOUNT' as const,
            manualDiscountAmount: 0,
            discountPercentage: 0,
            unitPrice: discountedPrice,
        };
    }, []);

    // Applies (or clears) the near-expiry allocation on one cart line. A normal line keeps
    // no stockDispositionId at all, so the payload stays a plain product line.
    const applyDispositionToLine = useCallback(
        (line: CashSaleCartItem, d: StockDisposition | null) => {
            setCartItems((prevItems) =>
                prevItems.map((item) => {
                    if (item.id !== line.id || item.selectedSerialNumber !== line.selectedSerialNumber) return item;
                    if (!d) {
                        const unitPrice =
                            item.originalUnitPrice ?? item.selectedPricing?.priceInclusive ?? item.unitPrice;
                        return {
                            ...item,
                            unitPrice,
                            discount: 0,
                            manualDiscountType: 'AMOUNT',
                            manualDiscountAmount: 0,
                            discountPercentage: 0,
                            lineTotal: unitPrice * item.quantity,
                            stockDispositionId: undefined,
                            stockDispositionVersion: undefined,
                            dispositionType: undefined,
                            originalUnitPrice: undefined,
                            dispositionDiscountAmount: undefined,
                            dispositionBatchNumber: undefined,
                            dispositionExpiryDate: undefined,
                            dispositionRemainingQuantity: undefined,
                            dispositionReason: undefined,
                            dispositionAllowPromotionStacking: undefined,
                        };
                    }
                    const baseUnitPrice =
                        item.originalUnitPrice ?? item.selectedPricing?.priceInclusive ?? item.unitPrice;
                    const attach = buildDispositionAttach(d, baseUnitPrice);
                    if (!attach) return item;
                    return { ...item, ...attach, lineTotal: attach.unitPrice * item.quantity };
                }),
            );
        },
        [buildDispositionAttach],
    );

    const isElectronApp = process.env.NEXT_PUBLIC_IS_ELECTRON_APP === 'true';
    const screenHeight = isElectronApp ? 'h-[75vh]' : 'h-[81vh]';
    const [cartItems, setCartItems] = useState<CashSaleCartItem[]>([]);

    // Re-evaluates the promotion guard against the live basket: the block only holds while
    // a line whose rule forbids stacking is actually present, so removing the line (or
    // clearing the allocation) lifts the refusal immediately.
    useEffect(() => {
        nstBlocksPromotionsRef.current = cartItems.some(
            (item) => item.stockDispositionId && item.dispositionAllowPromotionStacking === false,
        );
    }, [cartItems]);
    const [barcodeSessionActive, setBarcodeSessionActive] = useState(false);
    const [showBarcodeSessionDialog, setShowBarcodeSessionDialog] = useState(false);
    const [fastScanMode, setFastScanMode] = useState(true);
    const [pendingBarcode, setPendingBarcode] = useState('');
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);
    // True from the moment the create-cash-sale request is fired until the sale state is
    // reset (invoice closed). While true, PaymentScreen must not call the promotion
    // evaluate API again. It is cleared on any failed attempt so the cashier can retry.
    const [isSaleSubmitted, setIsSaleSubmitted] = useState(false);
    console.log('cartitems', cartItems);

    const { mutate: createCashSales, isPending } = useCreateCashSales(isOnline);
    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    // Tokens granted by the supervisor, keyed by the action code the 428 reported. A
    // single sale can need more than one (e.g. a discount override and a negative
    // stock override), so they accumulate rather than overwrite.
    const securityRequestReferenceRef = useRef<string | null>(null);
    // Holds the exact arguments of the submission that returned 428, plus every
    // approval token granted so far. Retrying reuses `args` verbatim so items,
    // quantities, terminal, store and securityRequestReference stay identical.
    const pendingApprovalRef = useRef<{
        args: PaymentSuccessType;
        approvedTokens: CashSaleApprovalTokens;
        payload?: CashSaleCreateSchema;
        securityReference?: string;
    } | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const createVoidedSale = useCreateVoidedSales();
    const createSuspendedSale = useCreateSuspendedSale();

    // Pricing matrix override resolution (mirrors Account Sales). Re-solves every
    // time a line discount / price / quantity changes so the cashier sees the
    // approval-required state before reaching the payment screen.
    const pricingMatrixMutation = useResolvePricingMatrix();
    const [hasDiscountOverride, setHasDiscountOverride] = useState(false);
    const hasDiscountOverrideRef = useRef(false);
    const { overrideReasonOpen, askReason, closeOverrideReason, clearReason } = useOverrideReason();
    const overrideReasonRef = useRef<string | null>(null);
    // Negative stock override is independent of the discount override, so it keeps its
    // own reason and refs. Both can be true on the same sale and both reasons are sent.
    const {
        negativeStockOverrideOpen,
        negativeStockRequireReason: negativeStockDialogRequireReason,
        negativeStockLines,
        askNegativeStockOverride,
        closeNegativeStockOverride,
    } = useNegativeStockOverride();
    const negativeStockOverrideRef = useRef(false);
    const negativeStockReasonRef = useRef<string | null>(null);

    const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
    const [quickAddProduct, setQuickAddProduct] = useState<StockDetails | null>(null);
    const [quickAddPrice, setQuickAddPrice] = useState<CartItemPricingType | null>(null);
    const [quickAddQuantity, setQuickAddQuantity] = useState<number>(1);

    const quantityInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);
    const discountInputRef = useRef<HTMLInputElement>(null);

    const quickAddLineTotal = useMemo(() => {
        if (!quickAddPrice) return 0;
        return Math.max(0, quickAddPrice.priceInclusive * quickAddQuantity);
    }, [quickAddPrice, quickAddQuantity]);

    // When the scanned product is already an NST line in the cart, the quick-add panel
    // must treat it as near-expiry stock: its price is fixed to the discounted amount and
    // no manual price / discount / pricing-type change is allowed.
    const quickAddExistingNstLine = useMemo(() => {
        if (!quickAddProduct) return null;
        return cartItems.find((item) => item.id === quickAddProduct.id && !!item.stockDispositionId) || null;
    }, [quickAddProduct, cartItems]);

    const { data } = useGetCompanyDefaultSettingsOnesList(true, {
        page: 1,
        limit: 100,
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
    });

    // ----------------- Modals Start -----------------

    const [isSerialNumberModalOpen, setIsSerialNumberModalOpen] = useState(false);

    const [selectedDebtor, setSelectedDebtor] = useState<CompanyCreditor | null>(null);
    const [selectedRep, setSelectedRep] = useState<SalesRepresentativeDetails | null>(null);

    const [isInventoryZero, setIsInventoryZero] = useState(false);
    const [supervisorDetails, setSupervisorDetails] = useState<UserDetails | null>(null);

    const [printData, setPrintData] = useState<CashSaleInvoiceType | null>(null);

    const [customerData, setCustomerData] = useState<CashSaleCustomerSchema | null>(null);

    // Promotions Variables
    const [appliedPromotion, setAppliedPromotion] = useState<AppliedPromotionDetails | null>(null);
    const [appliedPromotionDiscount, setAppliedPromotionDiscount] = useState<number | 0>(0);
    const { mutate: evaluatePromotion, isPending: isEvaluatingPromotion } = useEvaluatePromotion();


    // ----------------- Modals End -----------------

    const [formProduct, setFormProduct] = useState<StockDetails | null>(null);
    const [formPrice, setFormPrice] = useState<CartItemPricingType | null>();
    const [formQuantity, setFormQuantity] = useState<number>(1);
    const [formDiscount, setFormDiscount] = useState<number>(0);
    const [formLineComment, setFormLineComment] = useState<string>('');
    const [formComment, setFormComment] = useState<string>('');
    const [formTaxRate, setFormTaxRate] = useState<number>(0);
    const [quickAddDiscount, setQuickAddDiscount] = useState(0);
    const [isCommentFieldFocused, setIsCommentFieldFocused] = useState(false);
    const allowCashSaleNegativeStock =
        data?.data?.rows?.find((item) => item.settingOne?.name === 'ALLOW_CASH_SALE_NEGATIVE_STOCK')?.value === true;

    // The POS_NEGATIVE_STOCK_OVERRIDE security action is fetched once when the POS
    // screen loads. requireReason decides whether the negative-stock override popup
    // also demands a reason, which is sent with the create payload.
    const { data: securityActionsData, isPending: isSecurityActionsPending } = useGetSecurityActions();
    const negativeStockRequireReason = useMemo(() => {
        // Until the action list arrives we cannot know whether a reason is mandatory.
        // Fail safe and ask for one: an unnecessary prompt is a minor annoyance, while
        // omitting the reason is a hard rejection from the create endpoint
        // ("A reason is required for POS_NEGATIVE_STOCK_OVERRIDE.").
        if (isSecurityActionsPending || !securityActionsData) return true;

        return Boolean(
            securityActionsData.data?.find((action) => action.code === NEGATIVE_STOCK_ACTION_CODE)?.requireReason,
        );
    }, [securityActionsData, isSecurityActionsPending]);

    const calculateLineTotal = useCallback(() => {
        if (!formProduct || !formPrice) return 0;

        const price = formPrice.priceInclusive || 0;
        const quantity = Math.max(0, Number(formQuantity) || 0);
        const discountPercent = Math.max(0, Number(formDiscount) || 0);

        const baseAmount = price * quantity;
        const discountAmount = baseAmount * (discountPercent / 100);

        return Math.max(0, baseAmount - discountAmount);
    }, [formProduct, formPrice, formQuantity, formDiscount]);

    const lineTotal = useMemo(() => calculateLineTotal(), [calculateLineTotal]);

    const subtotal = (quickAddExistingNstLine?.unitPrice ?? quickAddPrice?.priceInclusive ?? 0) * quickAddQuantity;

    const finalTotal = Math.max(0, subtotal - (quickAddExistingNstLine ? 0 : quickAddDiscount || 0));

    // useEffect(() => {
    //     if (formProduct === null) {
    //         setFormQuantity(1);
    //         setFormPrice(null);
    //         setFormDiscount(0);
    //         setFormComment('');
    //         setFormTaxRate(0);
    //         setFormLineComment('');
    //     }
    // }, [formProduct]);
    useEffect(() => {
        console.log('formproduct', formProduct);
        if (formProduct === null) {
            setFormQuantity(1);
            setFormPrice(null);
            setFormDiscount(0);
            setFormComment('');
            setFormTaxRate(0);
            setFormLineComment('');
        }
    }, [formProduct]);

    useEffect(() => {
        if (showQuickAddDialog) {
            setTimeout(() => {
                quantityInputRef.current?.focus();
            }, 100);
        }
    }, [showQuickAddDialog]);

    const calculateTotals = useCallback(() => {
        const subTotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const totalDiscount = cartItems.reduce((sum, item) => sum + item.discount, 0);
        const total = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
        return { subTotal, totalDiscount, total };
    }, [cartItems]);

    const { subTotal, totalDiscount, total } = useMemo(() => calculateTotals(), [calculateTotals]);

    // const handleSelectProductForForm = useCallback(
    //     (product: StockDetails | null, companyStockPrice: CartItemPricingType | null) => {
    //         if (!product || !companyStockPrice) return;
    //         const { priceInclusive, priceExclusive } = companyStockPrice;
    //         const taxRate = ((priceInclusive - priceExclusive) / priceExclusive) * 100;

    //         setFormProduct(product);
    //         setFormQuantity(1);
    //         setFormPrice(companyStockPrice);
    //         setFormTaxRate(taxRate || +'0.00');
    //         setFormDiscount(0);
    //         setFormComment('');
    //         setFormLineComment('');
    //         setScannedBarcode('');
    //     },
    //     [],
    // );

    // const handleSelectProductForForm = useCallback(
    //     (product: StockDetails | null, companyStockPrice: CartItemPricingType | null) => {
    //         if (!product || !companyStockPrice) return;
    //         const { priceInclusive, priceExclusive } = companyStockPrice;
    //         const taxRate = ((priceInclusive - priceExclusive) / priceExclusive) * 100;

    //         setFormProduct(product);
    //         setFormQuantity((prev) => {
    //             // If same product is selected again, keep current quantity
    //             if (formProduct?.id === product.id) {
    //                 return prev || 1;
    //             }
    //             return 1;
    //         });
    //         setFormPrice(companyStockPrice);
    //         setFormTaxRate(taxRate || 0);
    //         setFormDiscount((prevDisc) => {
    //             if (formProduct?.id === product.id) return prevDisc || 0;
    //             return 0;
    //         });
    //         setFormComment((prevComment) => {
    //             if (formProduct?.id === product.id) return prevComment;
    //             return '';
    //         });
    //         setFormLineComment((prevLineComment) => {
    //             if (formProduct?.id === product.id) return prevLineComment;
    //             return '';
    //         });
    //         setScannedBarcode('');
    //     },
    //     [formProduct?.id],
    // );

    const formProductIdRef = useRef<string | null>(null);
    useEffect(() => {
        formProductIdRef.current = formProduct?.id ?? null;
    }, [formProduct]);

    const handleSelectProductForForm = useCallback(
        (product: StockDetails | null, companyStockPrice: CartItemPricingType | null) => {
            if (!product || !companyStockPrice) return;
            console.log('selected:', product, companyStockPrice); // fires once per selection

            const sameProduct = formProductIdRef.current === product.id;
            const { priceInclusive, priceExclusive } = companyStockPrice;
            const taxRate = ((priceInclusive - priceExclusive) / priceExclusive) * 100;

            setFormProduct(product);
            setFormQuantity((prev) => (sameProduct ? prev || 1 : 1));
            setFormPrice(companyStockPrice);
            setFormTaxRate(taxRate || 0);
            setFormDiscount((prev) => (sameProduct ? prev || 0 : 0));
            setFormComment((prev) => (sameProduct ? prev : ''));
            setFormLineComment((prev) => (sameProduct ? prev : ''));
            setScannedBarcode('');
        },
        [],
    );

    const addQuickItemToCart = useCallback(
        (product: StockDetails, pricing: CartItemPricingType, quantity: number = 1, discount: number = 0) => {
            const quantityToAdd = Math.max(1, quantity);
            const finalDiscount = Math.max(0, discount);

            setCartItems((prevItems) => {
                const existingItemIndex = prevItems.findIndex(
                    (item) => item.id === product.id && !item.selectedSerialNumber,
                );

                if (existingItemIndex > -1) {
                    const existingItem = prevItems[existingItemIndex];

                    const newQuantity = existingItem.quantity + quantityToAdd;

                    // An NST line's price is the fixed discounted amount; a quantity bump
                    // must never re-price the line from the normal pricing-type amount.
                    const baseAmount = existingItem.stockDispositionId
                        ? existingItem.unitPrice * newQuantity
                        : pricing.priceInclusive * newQuantity;

                    const updatedItems = [...prevItems];

                    updatedItems[existingItemIndex] = {
                        ...existingItem,
                        quantity: newQuantity,
                        discount: existingItem.stockDispositionId ? 0 : finalDiscount,
                        lineTotal: baseAmount - (existingItem.stockDispositionId ? 0 : finalDiscount),
                        comment: '',
                        lineComment: '',
                        companyStockPricingId: pricing.id,
                        selectedPricing: pricing,
                    };

                    return updatedItems;
                }

                const unitPrice = pricing.priceInclusive;
                const baseAmount = unitPrice * quantityToAdd;

                return [
                    ...prevItems,
                    {
                        ...product,
                        quantity: quantityToAdd,
                        discount: 0,
                        unitPrice,
                        lineTotal: baseAmount,
                        comment: '',
                        lineComment: '',
                        companyStockPricingId: pricing.id,
                        selectedPricing: pricing,
                    },
                ];
            });
        },
        [],
    );

    const handleQuickAddFromScan = useCallback(
        (product: StockDetails | null, pricing: CartItemPricingType | null, scannedBaseQuantity = 1) => {
            if (!product || !pricing) return;

            const quantityToAdd = Math.max(1, Number(scannedBaseQuantity) || 1);

            console.log('Fast Mode:', fastScanMode);
            console.log('Session:', barcodeSessionActive);

            if (barcodeSessionActive && fastScanMode) {
                addQuickItemToCart(product, pricing, quantityToAdd);

                setScannedBarcode('');

                return;
            }

            const { priceInclusive, priceExclusive } = pricing;
            const taxRate = ((priceInclusive - priceExclusive) / priceExclusive) * 100;

            setQuickAddProduct(product);
            setQuickAddPrice(pricing);
            setQuickAddQuantity(quantityToAdd);
            setShowQuickAddDialog(true);

            // Clear normal form to avoid conflict
            setFormProduct(null);
            setFormPrice(null);
            setScannedBarcode('');
        },
        [fastScanMode, barcodeSessionActive],
    );

    // const handleConfirmQuickAdd = useCallback(() => {
    //     if (!quickAddProduct || !quickAddPrice) return;

    //     const quantityToAdd = Math.max(1, quickAddQuantity);
    //     const finalDiscount = 0; // Default in quick add

    //     setCartItems((prevItems) => {
    //         const existingItemIndex = prevItems.findIndex(
    //             (item) => item.id === quickAddProduct.id && !item.selectedSerialNumber
    //         );

    //         if (existingItemIndex > -1) {
    //             const existingItem = prevItems[existingItemIndex];
    //             const newQuantity = existingItem.quantity + quantityToAdd;
    //             const baseAmount = quickAddPrice.priceInclusive * newQuantity;
    //             const newLineTotal = baseAmount - finalDiscount;

    //             const updatedItems = [...prevItems];
    //             updatedItems[existingItemIndex] = {
    //                 ...existingItem,
    //                 quantity: newQuantity,
    //                 discount: finalDiscount,
    //                 lineTotal: newLineTotal,
    //                 unitPrice: quickAddPrice.priceInclusive,
    //                 comment: '',
    //                 lineComment: '',
    //                 companyStockPricingId: quickAddPrice.id,
    //                 selectedPricing: quickAddPrice,
    //             };
    //             return updatedItems;
    //         }

    //         // New item - Exact same shape as original handleAddProductToCart
    //         const baseAmount = quickAddPrice.priceInclusive * quantityToAdd;

    //         return [
    //             ...prevItems,
    //             {
    //                 ...quickAddProduct,
    //                 quantity: quantityToAdd,
    //                 discount: finalDiscount,
    //                 unitPrice: quickAddPrice.priceInclusive,
    //                 lineTotal: baseAmount - finalDiscount,
    //                 comment: '',
    //                 lineComment: '',
    //                 companyStockPricingId: quickAddPrice.id,
    //                 selectedPricing: quickAddPrice,
    //             },
    //         ];
    //     });

    //     toast.success(`${quickAddProduct.description} added to cart`);
    //     setShowQuickAddDialog(false);
    //     setQuickAddProduct(null);
    //     setQuickAddPrice(null);
    // }, [quickAddProduct, quickAddPrice, quickAddQuantity]);

    const handleConfirmQuickAdd = useCallback(() => {
        if (!quickAddProduct || !quickAddPrice) return;

        // A manual / matrix discount is not allowed on an already-selected NST line.
        addQuickItemToCart(
            quickAddProduct,
            quickAddPrice,
            quickAddQuantity,
            quickAddExistingNstLine ? 0 : quickAddDiscount,
        );

        if (!barcodeSessionActive) {
            setBarcodeSessionActive(true);
        }

        console.log('Session Started');
        console.log('Fast Mode:', fastScanMode);

        setShowQuickAddDialog(false);
        setQuickAddProduct(null);
        setQuickAddPrice(null);
        setQuickAddDiscount(0);
    }, [
        quickAddProduct,
        quickAddPrice,
        quickAddQuantity,
        quickAddExistingNstLine,
        addQuickItemToCart,
        quickAddDiscount,
    ]);

    // const handleAddProductToCart = useCallback(async () => {
    //     if (!formProduct || !formPrice) {
    //         toast.error('Please select a product first by clicking the Stock Code input.');
    //         return;
    //     }

    //     const quantityToAdd = Math.max(1, formQuantity);

    //     const existingItem = cartItems.find((item) => item.id === formProduct.id && !item.selectedSerialNumber);

    //     const totalQuantity = existingItem ? existingItem.quantity + quantityToAdd : quantityToAdd;

    //     // if (formProduct.hasSerialNumber) {
    //     //     setIsSerialNumberModalOpen(true);
    //     // } else {

    //     // let discountAmount = 0;
    //     const discountPercent = Math.max(0, Number(formDiscount) || 0);

    //     if (!isCompanyDebtor && isOnline) {
    //         try {
    //             setIsLoading(true);

    //             const result = await getApplicableDiscount({
    //                 isApplicableForCashSale: true,
    //                 companyStockDetailId: formProduct.id,
    //                 quantity: totalQuantity,
    //             });

    //             const discountPercent = result?.data?.discountPercent || 0;
    //             const baseAmount = formPrice.priceInclusive * totalQuantity;
    //             // discountAmount = baseAmount * (discountPercent / 100);

    //             if (discountAmount) {
    //                 toast.success(
    //                     `A discount of ${currencySymbol} ${discountAmount.toFixed(2)} has been applied to ${formProduct.description}.`,
    //                 );
    //             }
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     }

    //     setCartItems((prevItems) => {
    //         const existingItemIndex = prevItems.findIndex(
    //             (item) => item.id === formProduct.id && !item.selectedSerialNumber,
    //         );

    //         if (existingItemIndex > -1) {
    //             const updatedItems = [...prevItems];
    //             const existingItem = updatedItems[existingItemIndex];

    //             if (existingItem.quantity === formProduct.stockOnHand && !supervisorDetails) {
    //                 toast.error('Max limit reached');
    //                 return prevItems;
    //             }

    //             const newQuantity = existingItem.quantity + quantityToAdd;
    //             const baseAmount = existingItem.unitPrice * newQuantity;
    //             const finalDiscount = discountAmount || existingItem.discount + formDiscount;
    //             const newLineTotal = baseAmount - finalDiscount;

    //             updatedItems[existingItemIndex] = {
    //                 ...existingItem,
    //                 quantity: newQuantity,
    //                 discount: finalDiscount,
    //                 lineTotal: newLineTotal,
    //                 comment: formComment,
    //                 lineComment: formLineComment,
    //                 companyStockPricingId: existingItem?.selectedPricing?.id || '',
    //                 selectedPricing: existingItem?.selectedPricing,
    //             };

    //             return updatedItems;
    //         }

    //         const baseAmount = formPrice.priceInclusive * quantityToAdd;
    //         const finalDiscount = baseAmount * (discountPercent / 100);

    //         return [
    //             ...prevItems,
    //             {
    //                 ...formProduct,
    //                 quantity: quantityToAdd,
    //                 discount: finalDiscount,
    //                 unitPrice: formPrice.priceInclusive,
    //                 lineTotal: baseAmount - finalDiscount,
    //                 comment: formComment,
    //                 lineComment: formLineComment,
    //                 companyStockPricingId: formPrice?.id,
    //                 selectedPricing: formPrice,
    //             },
    //         ];
    //     });

    //     setFormProduct(null);

    //     // }
    // }, [formProduct, formPrice, formQuantity, formDiscount, formComment, formLineComment]);
    const handleAddProductToCart = useCallback(async () => {
        if (!formProduct || !formPrice) {
            toast.error('Please select a product first by clicking the Stock Code input.');
            return;
        }

        const quantityToAdd = Math.max(1, formQuantity);

        const existingItem = cartItems.find((item) => item.id === formProduct.id && !item.selectedSerialNumber);

        const totalQuantity = existingItem ? existingItem.quantity + quantityToAdd : quantityToAdd;

        let discountAmount = 0;
        const manualDiscountPercent = Math.max(0, Number(formDiscount) || 0);

        if (!isCompanyDebtor && isOnline) {
            try {
                setIsLoading(true);

                const result = await getApplicableDiscount({
                    isApplicableForCashSale: true,
                    companyStockDetailId: formProduct.id,
                    quantity: totalQuantity,
                });

                const quantityWiseDiscountPercent = result?.data?.discountPercent || 0;
                const baseAmount = formPrice.priceInclusive * totalQuantity;
                discountAmount = baseAmount * (quantityWiseDiscountPercent / 100);

                if (discountAmount > 0) {
                    toast.success(
                        `A discount of ${currencySymbol} ${discountAmount.toFixed(2)} has been applied to ${formProduct.description}.`,
                    );
                }
            } finally {
                setIsLoading(false);
            }
        }

        setCartItems((prevItems) => {
            const existingItemIndex = prevItems.findIndex(
                (item) => item.id === formProduct.id && !item.selectedSerialNumber,
            );

            if (existingItemIndex > -1) {
                const updatedItems = [...prevItems];
                const existingItem = updatedItems[existingItemIndex];

                if (
                    existingItem.quantity === (formProduct.availableStock ?? formProduct.stockOnHand) &&
                    !supervisorDetails
                ) {
                    toast.error('Max limit reached');
                    return prevItems;
                }

                const newQuantity = existingItem.quantity + quantityToAdd;
                const baseAmount = existingItem.unitPrice * newQuantity;

                // The manual percentage entered on the add form replaces an existing manual
                // value; when it is empty, keep the line's stored manual discount.
                const nextManual =
                    !existingItem.stockDispositionId && manualDiscountPercent > 0
                        ? {
                              mode: 'PERCENT' as const,
                              amount: 0,
                              percentage: clampDiscount(manualDiscountPercent, 0, 100),
                          }
                        : getManualDiscountValue(existingItem);
                const manualAmount = existingItem.stockDispositionId
                    ? 0
                    : nextManual.mode === 'PERCENT'
                      ? (baseAmount * nextManual.percentage) / 100
                      : clampDiscount(nextManual.amount, 0, baseAmount);
                // Automatic (quantity-wise) and manual discounts are applied separately;
                // the legacy discount field carries their combined line total.
                const finalDiscount = existingItem.stockDispositionId
                    ? 0
                    : Math.min(baseAmount, (discountAmount || 0) + manualAmount);

                updatedItems[existingItemIndex] = {
                    ...existingItem,
                    quantity: newQuantity,
                    discount: roundDiscount(finalDiscount),
                    manualDiscountType: existingItem.stockDispositionId ? 'AMOUNT' : nextManual.mode,
                    manualDiscountAmount:
                        existingItem.stockDispositionId || nextManual.mode === 'PERCENT'
                            ? 0
                            : roundDiscount(manualAmount),
                    discountPercentage:
                        existingItem.stockDispositionId || nextManual.mode === 'AMOUNT'
                            ? 0
                            : roundDiscount(nextManual.percentage),
                    lineTotal: roundDiscount(baseAmount - finalDiscount),
                    comment: formComment,
                    lineComment: formLineComment,
                    companyStockPricingId: existingItem.companyStockPricingId || existingItem?.selectedPricing?.id || '',
                    selectedPricing: existingItem?.selectedPricing,
                };

                return updatedItems;
            }

            // New item
            const unitPrice = formPrice.priceInclusive;
            const baseAmount = unitPrice * quantityToAdd;
            const manualPercent = clampDiscount(manualDiscountPercent, 0, 100);
            const manualAmount = (baseAmount * manualPercent) / 100;
            // Automatic quantity discount and the cashier's manual discount stack; the
            // manual part is also recorded separately for the backend.
            const finalDiscount = Math.min(baseAmount, (discountAmount || 0) + manualAmount);

            return [
                ...prevItems,
                {
                    ...formProduct,
                    quantity: quantityToAdd,
                    discount: roundDiscount(finalDiscount),
                    manualDiscountType: manualPercent > 0 ? 'PERCENT' : 'AMOUNT',
                    manualDiscountAmount: 0,
                    discountPercentage: roundDiscount(manualPercent),
                    unitPrice,
                    lineTotal: roundDiscount(baseAmount - finalDiscount),
                    comment: formComment,
                    lineComment: formLineComment,
                    companyStockPricingId: formPrice?.id,
                    selectedPricing: formPrice,
                },
            ];
        });

        setFormProduct(null);
    }, [
        formProduct,
        formPrice,
        formQuantity,
        formDiscount,
        formComment,
        formLineComment,
        cartItems,
        isCompanyDebtor,
        isOnline,
        supervisorDetails,
        currencySymbol,
    ]);

    // const handleSelectSerialNumber = useCallback(
    //     (serialNumber: SerialNumber, selectedProductForSerialNumber: Product) => {
    //         if (selectedProductForSerialNumber) {
    //             setCartItems((prevItems) => {
    //                 return [
    //                     ...prevItems,
    //                     {
    //                         ...selectedProductForSerialNumber,
    //                         quantity: 1,
    //                         selectedSerialNumber: serialNumber.serial,
    //                         discount: formDiscount,
    //                         lineTotal: selectedProductForSerialNumber.unitPrice - formDiscount,
    //                         lineComment: formLineComment,
    //                     },
    //                 ];
    //             });
    //             setFormProduct(null);
    //         }
    //     },
    //     [formDiscount, formLineComment],
    // );

    // Barcode Scan

    const [scannedBarcode, setScannedBarcode] = useState<string>('');

    // Adds a brand-new discounted-stock cart line straight from an NST batch label scan
    // ("NST:<id>") or the "Add Discounted Stock" picker. A fresh /get is always performed
    // so the line reflects the latest discounted price, version and remaining quantity.
    const addScannedNSTLine = useCallback(
        async (dispositionId: string) => {
            let disposition: StockDisposition | null = null;
            try {
                const res = await getStockDispositionById({
                    id: dispositionId,
                    ...(selectedDebtor ? { companyDebtorId: selectedDebtor.id } : {}),
                });
                disposition = res?.data || null;
            } catch {
                disposition = null;
            }
            if (!disposition) {
                toast.error('The scanned discounted-stock record could not be found.');
                return;
            }
            if (!isSellableNST(disposition) || (disposition.remainingQuantity ?? 0) <= 0) {
                toast.error(nstNotSellableReason(disposition));
                return;
            }
            const detail = disposition.stockDetail || disposition.CompanyStockDetail;
            if (!detail) {
                toast.error('This discounted-stock record is missing its product details.');
                return;
            }
            const unitPrice = disposition.discountedUnitPrice ?? disposition.unitPrice;
            if (unitPrice == null || unitPrice <= 0) {
                toast.error('This discounted-stock record has no sellable price.');
                return;
            }
            const d = disposition;
            const originalUnitPrice = d.originalUnitPrice ?? unitPrice;
            setCartItems((prev) => {
                const existing = prev.find((i) => i.stockDispositionId === dispositionId);
                if (existing) {
                    const nextQty = Math.min(existing.quantity + 1, d.remainingQuantity ?? existing.quantity + 1);
                    return prev.map((i) =>
                        i.stockDispositionId === dispositionId
                            ? { ...i, quantity: nextQty, lineTotal: (i.unitPrice || 0) * nextQty }
                            : i,
                    );
                }
                return [
                    ...prev,
                    {
                        ...detail,
                        quantity: 1,
                        availableStock: d.remainingQuantity ?? 0,
                        stockOnHand: d.remainingQuantity ?? 0,
                        discount: 0,
                        manualDiscountType: 'AMOUNT',
                        manualDiscountAmount: 0,
                        discountPercentage: 0,
                        unitPrice,
                        lineTotal: unitPrice,
                        comment: '',
                        lineComment: '',
                        companyStockPricingId: d.companyStockPricingId || '',
                        companyTaxRateId: d.companyTaxRateId,
                        selectedPricing: {
                            id: d.companyStockPricingId || '',
                            companyStockPricingTypeId: d.companyStockPricingTypeId || '',
                            priceInclusive: unitPrice,
                            priceExclusive: unitPrice,
                            type: { name: 'NST' },
                        },
                        stockDispositionId: d.id,
                        stockDispositionVersion: nstVersion(d),
                        dispositionType: d.dispositionType,
                        originalUnitPrice,
                        dispositionDiscountAmount: Math.max(originalUnitPrice - unitPrice, 0),
                        dispositionBatchNumber: d.batchNumber,
                        dispositionExpiryDate: d.expiryDate,
                        dispositionRemainingQuantity: d.remainingQuantity,
                        dispositionReason: d.reason,
                        dispositionAllowPromotionStacking: nstAllowsPromotionStacking(d),
                    } as CashSaleCartItem,
                ];
            });
            toast.success('Discounted stock added to the sale.');
        },
        [selectedDebtor],
    );
    useEffect(() => {
        const handleFastModeShortcut = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;

            const isTyping =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement ||
                target.isContentEditable;

            if (isTyping) return;

            if (e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();

                setFastScanMode((prev) => {
                    const next = !prev;

                    toast.success(next ? 'Fast Scan Mode Enabled' : 'Fast Scan Mode Disabled');

                    return next;
                });
            }
        };

        window.addEventListener('keydown', handleFastModeShortcut);

        return () => {
            window.removeEventListener('keydown', handleFastModeShortcut);
        };
    }, []);

    const handleScannedProduct = (barcode: string) => {
        // NST batch labels scan as NST:<stockDispositionId>; resolve the allocation
        // straight into a cart line instead of treating it as a product barcode.
        const nstScanId = parseNSTLabelScan(barcode);
        if (nstScanId) {
            void addScannedNSTLine(nstScanId);
            return;
        }

        if (!barcodeSessionActive) {
            setPendingBarcode(barcode);
            setBarcodeSessionActive(true);
            setShowBarcodeSessionDialog(true);
            setScannedBarcode(String(barcode));
            return;
        }
        setScannedBarcode(String(barcode));
    };

    // On product Selection close
    function onProductSelectionClose() {
        setScannedBarcode('');
    }

    const handleCartQuantityChange = useCallback(
        async (itemId: string, change: number, serialNumber?: string) => {
            const targetItem = cartItems.find(
                (item) =>
                    item.id === itemId &&
                    (serialNumber ? item.selectedSerialNumber === serialNumber : !item.selectedSerialNumber),
            );

            if (!targetItem) return;

            const newQuantity = targetItem.quantity + change;
            if (newQuantity <= 0) return;

            // An NST line can never be bumped past what the allocation still holds.
            let effectiveQuantity = newQuantity;
            if (targetItem.stockDispositionId && targetItem.dispositionRemainingQuantity != null) {
                if (newQuantity > targetItem.dispositionRemainingQuantity) {
                    effectiveQuantity = Math.max(targetItem.dispositionRemainingQuantity, 0);
                    toast.warning(
                        `Only ${effectiveQuantity} remaining on this discounted-stock line. Quantity updated.`,
                    );
                }
            }

            const baseLineAmount = (targetItem.unitPrice || 0) * effectiveQuantity;
            const hasManual = hasManualDiscount(targetItem);
            let discountAmount = targetItem.stockDispositionId
                ? 0
                : hasManual
                  ? getManualDiscountAmount(targetItem, baseLineAmount)
                  : targetItem.discount || 0;

            if (!isCompanyDebtor && isOnline && !targetItem.stockDispositionId) {
                try {
                    setIsLoading(true);

                    const result = await getApplicableDiscount({
                        isApplicableForCashSale: true,
                        companyStockDetailId: targetItem.id,
                        quantity: newQuantity,
                    });

                    const discountPercent = result?.data?.discountPercent || 0;

                    const baseAmount = (targetItem.unitPrice || 0) * newQuantity;

                    // Preserve a cashier-entered manual discount when the quantity changes;
                    // otherwise refresh the automatic quantity-wise discount.
                    discountAmount = hasManual
                        ? getManualDiscountAmount(targetItem, baseAmount)
                        : baseAmount * (discountPercent / 100);

                    if (discountAmount) {
                        toast.success(
                            `A discount of ${currencySymbol} ${discountAmount.toFixed(2)} has been applied to ${targetItem.description}.`,
                        );
                    }
                } finally {
                    setIsLoading(false);
                }
            }

            setCartItems(
                (prevItems) =>
                    prevItems
                        .map((item) => {
                            const isMatch =
                                item.id === itemId &&
                                (serialNumber
                                    ? item.selectedSerialNumber === serialNumber
                                    : !item.selectedSerialNumber);

                            if (!isMatch) return item;

                            // A near-expiry line is already discounted; never stack another.
                            // For normal lines the value above already reflects the stored
                            // manual discount (amount stays fixed, percentage is recalculated).
                            const finalDiscount = item.stockDispositionId ? 0 : discountAmount;

                            const newLineTotal = (item?.unitPrice || 0) * effectiveQuantity - finalDiscount;

                            return {
                                ...item,
                                quantity: effectiveQuantity,
                                discount: finalDiscount,
                                lineTotal: newLineTotal,
                            };
                        })
                        .filter(Boolean) as CashSaleCartItem[],
            );
        },
        [cartItems],
    );

    const handleRemoveFromCart = useCallback((itemId: string, serialNumber?: string) => {
        setCartItems((prevItems) => {
            return prevItems.filter((item) => {
                const isMatch = item.id === itemId;
                // && (serialNumber ? item.selectedSerialNumber === serialNumber : !item.selectedSerialNumber);
                return !isMatch;
            });
        });
    }, []);

    const handleUpdateLineManualDiscount = useCallback(
        (
            itemId: string,
            value: Parameters<typeof withManualDiscount<CashSaleCartItem>>[1],
            selectedSerialNumber?: string,
        ) => {
            setCartItems((prevItems) =>
                prevItems.map((item) => {
                    const isMatch =
                        item.id === itemId &&
                        (selectedSerialNumber
                            ? item.selectedSerialNumber === selectedSerialNumber
                            : !item.selectedSerialNumber);
                    if (!isMatch || item.stockDispositionId) return item;
                    return withManualDiscount(item, value, (item.unitPrice || 0) * item.quantity);
                }),
            );
        },
        [],
    );

    // Pricing matrix override helpers (mirrors Account Sales). A line counts as an
    // override when a manual discount was applied or the unit price differs from
    // the configured price; quantity changes are covered because they auto-discount.
    const generateSecurityReference = (): string => {
        return `POS-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    };
    const isItemDiscounted = useCallback((item: CashSaleCartItem) => {
        // An NST line's discount is backend-authorised; it never counts as an override.
        if (item.stockDispositionId) return false;
        if (item.isDiscountOverride || item.discountOverride) return true;
        return (item.discount || 0) > 0 || (item.dispositionDiscountAmount || 0) > 0;
    }, []);
    const isItemPriceOverridden = useCallback((item: CashSaleCartItem) => {
        // An NST line's unit price is the fixed discounted price; never an override.
        if (item.stockDispositionId) return false;
        if (item.isPriceOverride || item.priceOverride) return true;
        const basePrice = item.selectedPricing?.priceInclusive;
        if (basePrice == null) return false;
        return Math.abs((item.unitPrice || 0) - basePrice) > 0.001;
    }, []);

    // Resolve is only needed when the cart actually carries a discount or a
    // changed/overridden price. A plain cart on the backend price with zero
    // discount can skip it (checkout still re-checks as a safety net).
    const hasPricingOverride = useMemo(() => {
        const hasDocumentDiscount = Number(appliedPromotionDiscount || 0) > 0;
        const hasLineOverride = cartItems.some((item) => isItemDiscounted(item) || isItemPriceOverridden(item));
        return hasDocumentDiscount || hasLineOverride;
    }, [cartItems, appliedPromotionDiscount, isItemDiscounted, isItemPriceOverridden]);

    const checkPricingOverride = useCallback(
        async (documentDiscount = 0) => {
            const docDiscount = Number(documentDiscount || 0) + Number(appliedPromotionDiscount || 0);
            const hasLineOverride = cartItems.some((item) => isItemDiscounted(item) || isItemPriceOverridden(item));
            if (!cartItems.length || (!hasLineOverride && docDiscount <= 0)) {
                hasDiscountOverrideRef.current = false;
                setHasDiscountOverride(false);
                return false;
            }
            try {
                const response = await pricingMatrixMutation.mutateAsync({
                    transactionType: 'POS',
                    ...(selectedDebtor ? { companyDebtorId: selectedDebtor.id } : {}),
                    discountAmount: cartItems.reduce((sum, item) => sum + (item.discount || 0), 0) + docDiscount,
                    items: cartItems.map((item) => ({
                        companyStockDetailId: item.id,
                        ...(item.companyStockPricingId || item.selectedPricing?.id
                            ? { companyStockPricingId: item.companyStockPricingId || item.selectedPricing?.id }
                            : {}),
                        ...(item.selectedPricing?.companyStockPricingTypeId
                            ? { companyStockPricingTypeId: item.selectedPricing.companyStockPricingTypeId }
                            : {}),
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: getAutomaticDiscountAmount(
                            item,
                            (item.unitPrice || 0) * item.quantity,
                        ),
                        ...toManualDiscountPayload(item),
                        ...(item.selectedPricing?.priceInclusive != null
                            ? { originalUnitPrice: item.selectedPricing.priceInclusive }
                            : {}),
                        isDiscountOverride: isItemDiscounted(item),
                        isPriceOverride: isItemPriceOverridden(item),
                    })),
                });
                const required = (response?.requiredActions || []).includes('POS_DISCOUNT_OVERRIDE');
                hasDiscountOverrideRef.current = required;
                setHasDiscountOverride(required);
                return required;
            } catch {
                hasDiscountOverrideRef.current = false;
                setHasDiscountOverride(false);
                return false;
            }
        },
        [
            cartItems,
            appliedPromotionDiscount,
            selectedDebtor,
            pricingMatrixMutation,
            isItemDiscounted,
            isItemPriceOverridden,
        ],
    );

    // Debounced re-resolve while the cashier edits lines — only when the cart
    // actually carries a discount or price override, so a plain cart never hits
    // the resolve endpoint.
    useEffect(() => {
        if (!cartItems.length || !hasPricingOverride) {
            hasDiscountOverrideRef.current = false;
            setHasDiscountOverride(false);
            return;
        }
        const timer = setTimeout(() => {
            void checkPricingOverride();
        }, 600);
        return () => clearTimeout(timer);
    }, [cartItems, hasPricingOverride, appliedPromotionDiscount]);

    const handleAcceptPayment = useCallback(async () => {
        if (cartItems.length === 0) {
            toast.error('Cart is empty. Please add products before accepting payment.');
            return;
        }

        // Refresh the pricing-matrix override state so the reason /
        // securityRequestReference decision in the payment payload is up to date.
        await checkPricingOverride();

        // Till session gate: checkout is blocked until the cashier has an assigned
        // till with an opened session. Offline queue/session handling is not
        // implemented as a separate flow, so the same rule applies regardless of
        // connectivity. The stored (localStorage-persisted) session is checked
        // first so an already-open session never re-prompts the Open Till dialog;
        // a fetched-but-closed session from the server falls through to the prompt.
        const storeSession = useTillSessionState.getState().tillSession;
        const sessionKnown = activeTillSessionQuery.isFetched && !activeTillSessionQuery.isError;
        const hasOpenTillSession =
            isTillSessionActive(storeSession) || (sessionKnown && isTillSessionActive(activeTillSession));
        if (!hasOpenTillSession) {
            setShowOpenTillDialog(true);
            return;
        }

        // Cash Sale payments are always collected on the till; they are never
        // routed to the Cash Office Payment Collection screen.
        setShowPaymentScreen(true);
    }, [
        cartItems.length,
        activeTillSessionQuery.isFetched,
        activeTillSessionQuery.isError,
        activeTillSession,
        checkPricingOverride,
    ]);

    const handleResetAllSaleState = useCallback(() => {
        setCartItems([]);
        nstBlocksPromotionsRef.current = false;
        setFormProduct(null);
        setSelectedDebtor(null);
        setSelectedRep(null);
        setShowPaymentScreen(false);
        setPrintData(null);
        setCustomerData(null);
        setSupervisorDetails(null);
        setAppliedPromotion(null);
        setAppliedPromotionDiscount(0);
        setBarcodeSessionActive(false);
        setFastScanMode(false);
        hasDiscountOverrideRef.current = false;
        setHasDiscountOverride(false);
        overrideReasonRef.current = null;
        clearReason();
        negativeStockOverrideRef.current = false;
        negativeStockReasonRef.current = null;
        securityRequestReferenceRef.current = null;
        nstBlocksPromotionsRef.current = false;
        setNstPickerLine(null);
        setIsSaleSubmitted(false);
    }, []);

    const getAppliedDiscountObj = (data: CashSalesDetails) => ({
        id: data.voucherId ? data.voucherId : data.couponId ? data.couponId : '',
        type: data.voucherId ? data.Voucher?.type : data.couponId ? data.Coupon?.type : '',
        value: data?.voucherId ? data.voucherAmount || 0 : data?.couponId ? data?.couponAmount || 0 : 0,
        description: data.voucherId ? data.Voucher?.description : data.couponId ? data.Coupon?.description : '',
    });

    // Recovery for the backend's discounted-stock rejections. The price-changed case
    // reloads the allocation into the basket (updated price, version, remaining) and
    // returns the cashier to the basket WITHOUT auto-retrying: the sale only goes
    // through once the cashier confirms the new total on the payment screen. Other
    // cases refresh or remove lines; a promotion-blocking rule drops the promotion.
    const handleDispositionSaleError = useCallback(
        (error: unknown) => {
            const kind = matchDispositionSaleError(error);
            if (!kind) return null;
            if (kind === 'PROMOTION') {
                setAppliedPromotion(null);
                setAppliedPromotionDiscount(0);
                toast.error('Discounted stock in this sale does not allow promotions. The promotion was removed.');
                return kind;
            }
            const refresh = async () => {
                const nstLines = cartItems.filter((item) => item.stockDispositionId);
                for (const line of nstLines) {
                    try {
                        const res = await getStockDispositionById({
                            id: line.stockDispositionId as string,
                            ...(selectedDebtor ? { companyDebtorId: selectedDebtor.id } : {}),
                        });
                        const d = res?.data;
                        if (!d) continue;
                        if (!isSellableNST(d) || (d.remainingQuantity ?? 0) <= 0) {
                            setCartItems((prev) => prev.filter((i) => i.stockDispositionId !== d.id));
                            toast.error(
                                kind === 'UNAVAILABLE'
                                    ? 'A discounted-stock item is no longer available and was removed.'
                                    : 'A discounted-stock item has changed and is no longer sellable; it was removed.',
                            );
                            continue;
                        }
                        const price = d.discountedUnitPrice ?? d.unitPrice;
                        setCartItems((prev) =>
                            prev.map((i) => {
                                if (i.stockDispositionId !== d.id) return i;
                                const qty = Math.min(i.quantity, d.remainingQuantity ?? i.quantity);
                                return {
                                    ...i,
                                    stockDispositionVersion: nstVersion(d),
                                    unitPrice: price ?? i.unitPrice,
                                    lineTotal: (price ?? i.unitPrice) * qty,
                                    quantity: qty,
                                    dispositionRemainingQuantity: d.remainingQuantity,
                                };
                            }),
                        );
                    } catch {
                        // Keep the line as-is; the next attempt re-validates.
                    }
                }
                toast.error(
                    kind === 'PRICE'
                        ? 'The discounted-stock price has changed. Review the updated total and confirm the sale again.'
                        : 'A discounted-stock item changed. Review the sale before confirming again.',
                );
            };
            void refresh();
            return kind;
        },
        [cartItems, selectedDebtor],
    );

    const handlePaymentSuccess = useCallback(
        async (
            paymentArgs: PaymentSuccessType,
            approvedTokens: CashSaleApprovalTokens = {},
            // Held across the 428 retry so the resubmitted request carries the same
            // securityRequestReference the server first saw.
            securityReferenceRef?: string,
            // The exact payload of the first attempt, replayed on retry.
            retainedPayload?: CashSaleCreateSchema,
        ) => {
            const {
                netAmountToPay,
                changeDue,
                selectedPaymentMethod,
                bankAccountNumber,
                chequeReference,
                cardNumber,
                cardExpiryDate,
                manualDiscount,
                appliedDiscount,
                loyaltyPointRes,
                isSplitPayment,
                payments,
                promotionEvaluation,
            } = paymentArgs;
            const selectedPromotion = appliedPromotion?.promotion;

            // The evaluate endpoint prices the whole basket server-side. When the payment
            // screen supplied its result, that is the promotion discount that was charged and
            // its free-item offers are the reward lines that must be recorded on the order.
            const evaluationDiscount = promotionEvaluation ? Number(promotionEvaluation.totalDiscount) || 0 : 0;
            const evaluationPromotion = promotionEvaluation?.freeItemOffers?.[0];
            const rewardLines: CashSaleCreateSchema['items'] = promotionEvaluation
                ? (promotionEvaluation.freeItemOffers ?? []).flatMap((offer) =>
                      offer.rewardItems
                          .filter((reward) => reward.isFree || (reward.freeQuantity || 0) > 0)
                          .map((reward) => ({
                              companyStockDetailId: reward.companyStockDetailId,
                              companyStockPricingId: reward.companyStockPricingId || '',
                              companyTaxRateId: reward.companyTaxRateId,
                              ...(reward.description ? { description: reward.description } : {}),
                              quantity: 0,
                              freeQuantity: reward.freeQuantity,
                              isFree: true,
                              unitPrice: reward.unitPrice,
                              discount: reward.discountAmount,
                              lineTotal: 0,
                          })),
                  )
                : [];
            const effectivePromotionDiscount = promotionEvaluation
                ? evaluationDiscount
                : Number(appliedPromotionDiscount) || 0;
            const effectivePromotionId = evaluationPromotion?.promotionId || selectedPromotion?.id;
            const effectivePromotionName =
                evaluationPromotion?.promotionName || selectedPromotion?.promotionDescription;

            // Overlay the server-evaluated price onto each cart line (matched by lineKey) so
            // every downstream value — checkout line totals, totalPrice and the printed /
            // offline lines — uses the evaluated lineTotal, discount and unit price rather
            // than the client-side estimate.
            const evaluationLineByKey = new Map((promotionEvaluation?.lines ?? []).map((line) => [line.lineKey, line]));
            const effectiveCartItems = cartItems.map((item, index) => {
                // A discounted-stock line is priced by its allocation (discountedUnitPrice),
                // not by the promotion evaluation. The evaluate endpoint is never told about
                // the NST allocation, so it returns the ORIGINAL unit price for these lines;
                // keeping the cart's discounted values here prevents the total being inflated.
                if (item.stockDispositionId) return item;
                const line = evaluationLineByKey.get(`line-${index + 1}`);
                if (!line) return item;
                const isPromotionalPrice = line.promotionTypeCode === 'SP' || line.promotionTypeCode === 'BMF';
                return {
                    ...item,
                    companyStockPricingId: line.companyStockPricingId || item.companyStockPricingId,
                    unitPrice: typeof line.unitPrice === 'number' ? line.unitPrice : item.unitPrice,
                    discount: typeof line.discountAmount === 'number' ? line.discountAmount : item.discount,
                    lineTotal: typeof line.lineTotal === 'number' ? line.lineTotal : item.lineTotal,
                    ...(isPromotionalPrice && typeof line.finalUnitPrice === 'number'
                        ? { promotionalPrice: line.finalUnitPrice }
                        : {}),
                };
            });
            // Same correction as the payment screen: replace each discounted-stock line's
            // server-evaluated (original-price) amount with its discounted amount so the sale
            // total always reflects discountedUnitPrice.
            const nstEvalCorrection = promotionEvaluation
                ? cartItems.reduce((sum, item, index) => {
                      if (!item.stockDispositionId) return sum;
                      const line = evaluationLineByKey.get(`line-${index + 1}`);
                      if (!line || typeof line.lineTotal !== 'number') return sum;
                      return sum + ((item.lineTotal || 0) - line.lineTotal);
                  }, 0)
                : 0;
            const evaluatedBasketTotal = (
                promotionEvaluation as (EvaluatePromotionData & { basketTotal?: number }) | null | undefined
            )?.basketTotal;
            const evaluatedTotalPrice =
                typeof evaluatedBasketTotal === 'number'
                    ? evaluatedBasketTotal
                    : promotionEvaluation && typeof promotionEvaluation.total === 'number'
                      ? promotionEvaluation.total + nstEvalCorrection
                      : total;

            // Refresh every selected allocation before checkout. The list data on screen
            // can be stale, so the quantity and sellability are re-read from the API and
            // the sale is blocked here if anything changed.
            const nstLines = cartItems.filter((item) => !!item.stockDispositionId);
            if (nstLines.length) {
                setIsLoading(true);
                try {
                    const checks = await verifyNSTLinesForCheckout(
                        nstLines.map((item) => ({
                            stockDispositionId: item.stockDispositionId,
                            companyDebtorId: selectedDebtor?.id,
                            productId: item.id,
                            quantity: item.quantity,
                        })),
                    );
                    const failed = checks.find((c) => !c.ok);
                    if (failed) {
                        const line = nstLines.find((i) => i.stockDispositionId === failed.id);
                        toast.error(
                            `${line?.description || 'Item'}: ${failed.message || 'Near-expiry allocation is no longer valid.'}`,
                        );
                        return;
                    }
                } finally {
                    setIsLoading(false);
                }
            }

            // Before creating the sale, re-check the pricing matrix (including any
            // payment-time / promotion / loyalty / voucher / coupon discount). When the
            // resolve flags POS_DISCOUNT_OVERRIDE the cashier must type an override
            // reason, which is sent with the create request (mirrors Account Sales).
            // This is skipped on the approval retry — the reason was already captured.
            const isApprovalRetry = Object.keys(approvedTokens).length > 0;
            if (!isApprovalRetry) {
                const documentDiscount =
                    Number(manualDiscount || 0) +
                    Number(loyaltyPointRes?.redeemableValue || 0) +
                    Number(appliedDiscount?.value || 0);
                const required = await checkPricingOverride(documentDiscount);
                if (required && !overrideReasonRef.current) {
                    const enteredReason = await askReason();
                    if (!enteredReason) {
                        toast.error('Sale cancelled: an override reason is required.');
                        return;
                    }
                    overrideReasonRef.current = enteredReason;
                }

                // Negative stock: the cart quantity is greater than the available stock.
                // The cashier decides whether to proceed. A reason is demanded only when
                // the POS_NEGATIVE_STOCK_OVERRIDE action is configured requireReason: true.
                // Skipped on an approval retry because it was already confirmed.
                const negativeStockLines = getNegativeStockLines(cartItems);
                if (negativeStockLines.length) {
                    const result = await askNegativeStockOverride(
                        negativeStockLines.map((item) => ({
                            id: item.id,
                            name: item.description || item.itemCode || 'Item',
                            quantity: item.quantity,
                            available: getCartLineStock(item),
                        })),
                        negativeStockRequireReason,
                    );

                    if (!result?.proceed) {
                        toast.error('Sale cancelled: negative stock override was not accepted.');
                        return;
                    }

                    negativeStockOverrideRef.current = true;
                    negativeStockReasonRef.current = result.reason || null;
                } else {
                    negativeStockOverrideRef.current = false;
                    negativeStockReasonRef.current = null;
                }
            }

            // Build the payload from the current cart. On a 428 retry we ignore this and
            // replay the retained first-attempt payload instead, so items, quantities,
            // terminal, store, customer, payments and securityRequestReference stay
            // byte-identical even if the cashier edits the cart behind the dialog.
            const livePayload: CashSaleCreateSchema = {
                ...(selectedDebtor ? { companyDebtorId: selectedDebtor.id } : {}),
                ...(suspendedSaleId ? { suspendedSaleId } : {}),
                totalPrice:
                    typeof evaluatedBasketTotal === 'number'
                        ? evaluatedBasketTotal
                        : promotionEvaluation?.totalAfterDiscounts || evaluatedTotalPrice,
                ...(payments && payments.length > 0
                    ? {
                          payments: payments.map((payment) => ({
                              tenderTypeId: payment.tenderTypeId,
                              tenderType: payment.tenderType,
                              amount: payment.amount,
                              remarks: payment.remarks,
                          })),
                      }
                    : {
                          tenderTypeId: selectedPaymentMethod?.id,
                          tenderType: selectedPaymentMethod?.type,
                          tenderValue: netAmountToPay,
                      }),
                ...(loyaltyPointRes
                    ? {
                          loyaltyCardNumber: loyaltyPointRes?.loyaltyCardNumber,
                          loyaltyDiscountAmount: loyaltyPointRes?.redeemableValue,
                      }
                    : {}),
                timezone: moment.tz.guess(),
                ...(manualDiscount ? { manualDiscount } : {}),
                ...(isSplitPayment
                    ? {
                          ...(changeDue ? { changeDue } : {}),
                      }
                    : selectedPaymentMethod?.type === TENDER_TYPES?.CASH
                      ? {
                            ...(changeDue ? { changeDue } : {}),
                        }
                      : selectedPaymentMethod?.type === TENDER_TYPES?.CHEQUE
                        ? {
                              bankAccountNumber,
                              reference: chequeReference,
                          }
                        : selectedPaymentMethod?.type === TENDER_TYPES?.CREDIT_CARD ||
                            selectedPaymentMethod?.type === TENDER_TYPES?.DEBIT_CARD
                          ? {
                                cardNumber,
                                cardExpiryDate,
                            }
                          : {}),
                ...(appliedDiscount?.type === TENDER_TYPES?.COUPON
                    ? {
                          couponId: appliedDiscount?.id,
                          couponAmount: appliedDiscount.value,
                      }
                    : appliedDiscount?.type === TENDER_TYPES?.VOUCHER
                      ? {
                            voucherId: appliedDiscount?.id,
                            voucherAmount: appliedDiscount.value,
                        }
                      : {}),
                items: [
                    ...effectiveCartItems.flatMap((item) => {
                        const promotionType = appliedPromotion?.promotion?.CompanyStockPromotionType?.code;

                        const baseItem = {
                            companyStockDetailId: item.id,
                            // A scanned/NST line carries its own pricing record; the normal
                            // line always has selectedPricing. Guard both so a standalone
                            // discounted-stock line never dereferences a missing picker.
                            companyStockPricingId: item.companyStockPricingId || item.selectedPricing?.id || '',
                            companyTaxRateId: item.companyTaxRateId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            ...(item.promotionalPrice ? { promotionalPrice: item.promotionalPrice } : {}),
                            lineTotal: item.unitPrice * item.quantity - item.discount,
                            // Manual discount is sent in its own fields; never fold it into
                            // the legacy discount or the backend would subtract it twice.
                            discount: getAutomaticDiscountAmount(
                                item,
                                (item.unitPrice || 0) * item.quantity,
                            ),
                            ...toManualDiscountPayload(item),
                            comment: item.comment,
                            lineComment: item.lineComment,
                            ...(item.stockDispositionId
                                ? {
                                      stockDispositionId: item.stockDispositionId,
                                      stockDispositionVersion: item.stockDispositionVersion,
                                      // A discounted-stock line must name the exact pricing type it
                                      // was allocated against, otherwise the backend re-prices it.
                                      ...(() => {
                                          const pricingTypeId = item.selectedPricing?.companyStockPricingTypeId;
                                          return pricingTypeId ? { companyStockPricingTypeId: pricingTypeId } : {};
                                      })(),
                                  }
                                : {}),
                        };

                        // The evaluate endpoint already returns the reward lines for the whole
                        // basket, so the legacy same-line B1G1 expansion is skipped when an
                        // evaluation is present to avoid double-counting the free item.
                        if (
                            !promotionEvaluation &&
                            selectedPromotion &&
                            promotionType === 'B1G1' &&
                            item.freeQuantity
                        ) {
                            return [
                                baseItem,
                                {
                                    ...baseItem,
                                    freeQuantity: item.freeQuantity,
                                    quantity: 0,
                                    isFree: true,
                                },
                            ];
                        }

                        return [baseItem];
                    }),
                    ...rewardLines,
                ],
                ...(customerData ? { customer: customerData } : {}),
                ...(selectedRep ? { representativeId: selectedRep?.id } : {}),
                ...(supervisorDetails ? { approvedById: supervisorDetails?.id } : {}),
                ...(effectivePromotionId || effectivePromotionDiscount
                    ? {
                          ...(effectivePromotionId ? { promotionId: effectivePromotionId } : {}),
                          ...(effectivePromotionName ? { promotionName: effectivePromotionName } : {}),
                          promotionDiscountAmount: effectivePromotionDiscount,
                      }
                    : {}),
            };

            // Retry replays the original request and only swaps in the granted tokens.
            const payload: CashSaleCreateSchema = {
                ...(retainedPayload || livePayload),
                ...(Object.keys(approvedTokens).length > 0
                    ? { approvalTokens: approvedTokens as CashSaleCreateSchema['approvalTokens'] }
                    : {}),
            };

            // When the pricing matrix flagged a discount / price override, send the
            // cashier's reason plus a security request reference so the server can run
            // its approval flow (returns 428 when a token is still missing). The
            // reference is generated once and reused on retry so the server can tie the
            // granted approval back to the original request.
            const resolvedSecurityReference =
                securityReferenceRef || securityRequestReferenceRef.current || generateSecurityReference();
            securityRequestReferenceRef.current = resolvedSecurityReference;

            // Discount override -> the cashier's reason + a security request reference.
            // Negative stock override -> negativeStockOverride: true, plus the reason
            // when the action is configured requireReason: true. A negative-stock
            // override is its own security action, so it also carries a reference.
            // Both can apply to one sale, so the reasons are combined rather than
            // overwriting each other.
            const overrideReasons = [
                negativeStockReasonRef.current,
                hasDiscountOverrideRef.current ? overrideReasonRef.current || 'Discount override requested' : null,
            ].filter((value): value is string => Boolean(value));

            const payloadWithOverride = {
                ...payload,
                ...(negativeStockOverrideRef.current ? { negativeStockOverride: true } : {}),
                ...(overrideReasons.length ? { reason: overrideReasons.join(' | ') } : {}),
                ...(hasDiscountOverrideRef.current || negativeStockOverrideRef.current
                    ? { securityRequestReference: resolvedSecurityReference }
                    : {}),
            };

            // The sale is being submitted: from here on the payment screen must not call the
            // promotion evaluate API again (it would otherwise re-run when the screen
            // remounts around the create request, because the cart is still populated).
            setIsSaleSubmitted(true);

            createCashSales(payloadWithOverride, {
                onSuccess: async (data) => {
                    if (data.success) {
                        if (isOnline) {
                            const resData = data.data;
                            setPrintData({
                                cashSales: resData,
                                cartItems: resData.PosCashSaleOrderItems,
                                paymentMethod: resData?.PosTenderType || '',
                                debtor: resData?.PosDebtor || null,
                                appliedDiscount: getAppliedDiscountObj(resData),
                                invoiceDate: resData?.createdAt,
                            });
                        } else {
                            setPrintData({
                                cashSales: payload,
                                debtor: selectedDebtor,
                                cartItems: effectiveCartItems.map((item) => {
                                    const {
                                        quantity,
                                        discount,
                                        unitPrice,
                                        freeQuantity,
                                        isFree,
                                        promotionalPrice,
                                        comment,
                                        lineComment,
                                        lineTotal,
                                        selectedPricing,
                                        companyStockPricingId,
                                        ...product
                                    } = item;
                                    return {
                                        quantity: quantity,
                                        companyStockPricingId,
                                        discount: discount,
                                        unitPrice: item.unitPrice,
                                        ...(selectedPromotion ? { freeQuantity, isFree, promotionalPrice } : {}),
                                        lineTotal,
                                        comment,
                                        lineComment,
                                        selectedPricing,
                                        CompanyStockDetail: product,
                                    };
                                }),
                                paymentMethod: selectedPaymentMethod,
                                appliedDiscount,
                                invoiceDate: new Date().toISOString(),
                            });

                            // Saving data to indexedDB

                            const offlineCashSalesData = (await getDBData(
                                getIDBKey(apiUrls.cashSales),
                            )) as GetCashSaleResponse;

                            const offlineCashSale: CashSalesDetails = {
                                ...payload,
                                ...(selectedDebtor ? { PosDebtor: selectedDebtor } : {}),
                                id: generateUUIDForData(),
                                PosTenderType: selectedPaymentMethod,
                                PosCashSaleOrderItems: effectiveCartItems.map((item) => {
                                    const {
                                        quantity,
                                        discount,
                                        unitPrice,
                                        comment,
                                        lineComment,
                                        lineTotal,
                                        selectedPricing,
                                        companyStockPricingId,
                                        freeQuantity,
                                        isFree,
                                        promotionalPrice,
                                        ...product
                                    } = item;
                                    return {
                                        companyStockPricingId,
                                        quantity: quantity,
                                        discount: discount,
                                        unitPrice: item.unitPrice,
                                        ...(selectedPromotion ? { freeQuantity, isFree, promotionalPrice } : {}),
                                        lineTotal,
                                        comment,
                                        lineComment,
                                        selectedPricing,
                                        CompanyStockDetail: product,
                                    };
                                }),
                                invoiceDate: new Date().toISOString(),
                                createdAt: new Date().toISOString(),
                                notSynced: true,
                                Voucher: selectedPaymentMethod,
                                Coupon: selectedPaymentMethod,
                                ...(selectedRep ? { representativeId: selectedRep?.id } : {}),
                                ...(selectedRep ? { SalesRepresentative: selectedRep } : {}),
                            };

                            const updateOfflineCashSalesData: GetCashSaleResponse = {
                                success: true,
                                message: 'Cash Sale created successfully',
                                data: {
                                    rows: [offlineCashSale, ...offlineCashSalesData.data.rows],
                                    count: offlineCashSalesData?.data?.count + 1,
                                },
                            };

                            await setDBData(getIDBKey(apiUrls.cashSales), updateOfflineCashSalesData);
                            queryClient.setQueryData([getIDBKey(apiUrls.cashSales), false], updateOfflineCashSalesData);

                            // Stock Update
                            const offlineStockDetailsData = (await getDBData(
                                getIDBKey(apiUrls.stocks),
                            )) as CompanyStockDetailsListResponse;

                            const updatedStockDetailsData: CompanyStockDetailsListResponse = {
                                ...offlineStockDetailsData,
                                data: {
                                    count: offlineStockDetailsData?.data?.count,
                                    rows: offlineStockDetailsData?.data?.rows?.map((row) => {
                                        const cartItem = payload.items.find(
                                            (item) => item.companyStockDetailId === row.id,
                                        );
                                        if (cartItem)
                                            return {
                                                ...row,
                                                stockOnHand: row.stockOnHand - cartItem.quantity,
                                                availableStock:
                                                    (row.availableStock ?? row.stockOnHand) - cartItem.quantity,
                                            };
                                        else return row;
                                    }),
                                },
                            };

                            await setDBData(getIDBKey(apiUrls.stocks), updatedStockDetailsData);
                            queryClient.setQueryData([getIDBKey(apiUrls.stocks), false], updatedStockDetailsData);
                        }

                        // NST sold stock refreshes: allocations with zero remaining drop
                        // out of the management screens, candidate lists and pickers.
                        if (isOnline && payload?.items?.some((item) => item.stockDispositionId)) {
                            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
                        }

                        toast.success('Payment confirmed! Sale successful.');

                        if (isOnline) {
                            const session = useTillSessionState.getState().tillSession;
                            if (session?.tillId) {
                                getTillBalanceStatus(session.tillId)
                                    .then((res) => {
                                        const balance = res?.data;
                                        if (balance?.isAboveThreshold) {
                                            toast.warning(
                                                `Till balance is above the safe threshold (Safe drop required). Excess: ${currencySymbol}${Number(
                                                    balance.excess || 0,
                                                ).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}`,
                                            );
                                        } else if (balance?.message) {
                                            toast.warning(balance.message);
                                        }
                                    })
                                    .catch(() => {
                                        // Balance status is a non-blocking safety check.
                                    });
                            }
                        }
                    } else {
                        // The sale was not created; allow the payment screen to evaluate again.
                        setIsSaleSubmitted(false);
                        toast.error('Cash sales creation failed');
                    }
                },
                onError: (error) => {
                    // The sale was not created (428 approval, discounted-stock rejection or
                    // any other failure); allow the payment screen to evaluate again.
                    setIsSaleSubmitted(false);

                    const dispositionHandled = handleDispositionSaleError(error);
                    if (dispositionHandled) return;

                    const approvalInfo = isApprovalRequiredError(error);
                    if (approvalInfo) {
                        // Remember the exact payload and any tokens already granted, so a
                        // second 428 (a different action) does not lose the first token and
                        // the retry always replays the identical request.
                        pendingApprovalRef.current = {
                            args: paymentArgs,
                            approvedTokens: { ...approvedTokens },
                            payload: payloadWithOverride,
                            securityReference: resolvedSecurityReference,
                        };
                        setApproval({
                            ...approvalInfo,
                            actionLabel:
                                approvalInfo.actionCode === NEGATIVE_STOCK_ACTION_CODE
                                    ? 'Negative Stock Override'
                                    : 'Create Cash Sale',
                        });
                    } else {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    }
                },
            });
        },
        [
            cartItems,
            customerData,
            appliedPromotion,
            appliedPromotionDiscount,
            total,
            selectedDebtor,
            checkPricingOverride,
            handleDispositionSaleError,
            askReason,
            askNegativeStockOverride,
            negativeStockRequireReason,
        ],
    );

    const handleCashSaleApproved = useCallback(
        (token: string, tokens?: Record<string, string>) => {
            const meta = pendingApprovalRef.current;
            if (!meta) {
                closeApproval();
                return;
            }
            closeApproval();

            // The dialog approves every approvalRequestId in the 428 and returns an
            // actionCode -> approvalToken map. Fall back to the action code the 428
            // reported, then to the single scalar token, so a token is never sent
            // under the wrong action key.
            const actionCode = approval?.actionCode;
            const nextTokens: CashSaleApprovalTokens = { ...meta.approvedTokens };

            if (tokens && Object.keys(tokens).length) {
                Object.assign(nextTokens, tokens);
            } else if (token) {
                const key =
                    actionCode === NEGATIVE_STOCK_ACTION_CODE || actionCode === DISCOUNT_OVERRIDE_ACTION_CODE
                        ? actionCode
                        : DEFAULT_APPROVAL_ACTION_CODE;
                nextTokens[key] = token;
            }

            if (!Object.keys(nextTokens).length) {
                pendingApprovalRef.current = null;
                toast.error('Approval did not return a token. Sale not completed.');
                return;
            }

            // Keep pendingApprovalRef populated so a second 428 (a different action)
            // can merge into the same token set, and replay the original payload.
            pendingApprovalRef.current = { ...meta, approvedTokens: nextTokens };
            handlePaymentSuccess(
                meta.args,
                nextTokens,
                meta.securityReference || securityRequestReferenceRef.current || undefined,
                meta.payload,
            );
        },
        [handlePaymentSuccess, closeApproval, approval],
    );

    function onCloseInvoice() {
        setPrintData(null);
        handleResetAllSaleState();
    }

    function handleBackFromPaymentScreen() {
        setShowPaymentScreen(false);
        setAppliedPromotion(null);
        setAppliedPromotionDiscount(0);
    }

    // Void Sale

    const [voidSaleReason, setVoidSaleReason] = useState('');

    const handleVoidSale = useCallback(
        (data: { reason: string; representativeId: string }) => {
            const { reason, representativeId } = data;

            const payload: VoidSaleCreateSchema = {
                timezone: moment.tz.guess(),
                reason: voidSaleReason,
                ...(selectedDebtor ? { companyDebtorId: selectedDebtor.id } : {}),
                ...(representativeId ? { representativeId } : {}),
                items: cartItems.map((item) => ({
                    companyStockDetailId: item.id,
                    companyStockPricingId: item.selectedPricing.id,
                    companyTaxRateId: item?.companyTaxRateId,
                    quantity: item.quantity,
                    representaticeId: item.representativeId,
                    unitPrice: item.unitPrice,
                    lineTotal: item.lineTotal,
                    discount: item.discount,
                    comment: item.comment,
                    lineComment: item.lineComment,
                })),
                ...(customerData ? { customer: customerData } : {}),
            };

            createVoidedSale.mutate(payload, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success(`Sale Voided Successfully!`);
                    } else {
                        toast.error('Voiding sale failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
            handleResetAllSaleState();
        },
        [cartItems, customerData, voidSaleReason],
    );

    // Cart Columns
    const deviceType = process.env.NEXT_PUBLIC_APP_TYPE;

    const cartColumns = useMemo(() => {
        const selectedPromotion = appliedPromotion?.promotion;
        const selectedPromotionType = appliedPromotion?.promotion?.CompanyStockPromotionType?.code;

        const isPromotionalPricePromotion = selectedPromotionType === 'SP' || selectedPromotionType === 'BMF';

        // NST columns only make sense once the basket actually carries a discounted-stock line.
        // A plain sale must not show them at all.
        const hasNstLine = cartItems.some((item) => !!item.stockDispositionId);

        // BIAGDPT
        const isDiscountPercent = (id: string) =>
            selectedPromotionType === 'BIAGDPT' &&
            selectedPromotion?.CompanyStockPromotionItems?.find((data) => data?.companyStockDetailId === id);
        const discountPercent = (selectedPromotion?.discountPercent || 0) / 100;

        return [
            {
                key: 'itemCode',
                label: 'Code',
                className: 'w-[80px]',
                render: (item: CashSaleCartItem) => (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="block truncate">
                                    {item.itemCode}
                                    {/* {item.selectedSerialNumber ? `(${item.selectedSerialNumber})` : ''} */}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>
                                    {item.description}{' '}
                                    {item.selectedSerialNumber ? `(Serial: ${item.selectedSerialNumber})` : ''}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ),
            },
            {
                key: 'description',
                label: 'Description',
                className: 'w-[200px]',
                render: (item: CashSaleCartItem) => (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="block truncate">{item.description}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>{item.description}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ),
            },
            // Discounted-stock columns are only rendered while the sale contains an NST line.
            ...(hasNstLine
                ? [
                      {
                          key: 'nstbadge',
                          label: 'NST',
                          className: 'w-[110px]',
                          render: (item: CashSaleCartItem) =>
                              item.stockDispositionId ? (
                                  <TooltipProvider>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                              <span className="inline-flex cursor-help items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                                                  {(item.dispositionType || 'NST').replace(/_/g, ' ')}
                                                  {item.dispositionDiscountAmount != null
                                                      ? ` -${currencySymbol}${Number(item.dispositionDiscountAmount).toFixed(2)}`
                                                      : ''}
                                              </span>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs text-xs">
                                              <div className="space-y-0.5">
                                                  {item.dispositionBatchNumber && (
                                                      <p>Batch: {item.dispositionBatchNumber}</p>
                                                  )}
                                                  {item.dispositionExpiryDate && (
                                                      <p>
                                                          Expiry:{' '}
                                                          {moment(item.dispositionExpiryDate).format('DD MMM, YY')}
                                                      </p>
                                                  )}
                                                  {item.dispositionRemainingQuantity != null && (
                                                      <p>NST remaining: {item.dispositionRemainingQuantity}</p>
                                                  )}
                                                  {item.originalUnitPrice != null && (
                                                      <p>
                                                          Price: {currencySymbol}
                                                          {Number(item.originalUnitPrice).toFixed(2)} → {currencySymbol}
                                                          {Number(item.unitPrice).toFixed(2)}
                                                      </p>
                                                  )}
                                                  {item.dispositionReason && <p>Reason: {item.dispositionReason}</p>}
                                              </div>
                                          </TooltipContent>
                                      </Tooltip>
                                  </TooltipProvider>
                              ) : null,
                      },
                      {
                          key: 'nst',
                          label: 'NST',
                          className: 'w-[90px] text-center',
                          render: (item: CashSaleCartItem) =>
                              showPaymentScreen ? null : (
                                  <Button
                                      type="button"
                                      variant={item.stockDispositionId ? 'secondary' : 'outline'}
                                      size="sm"
                                      className="h-6 px-2 text-[10px]"
                                      title={
                                          item.stockDispositionId
                                              ? 'Change or remove the near-expiry allocation'
                                              : 'Sell this line at the near-expiry price'
                                      }
                                      onClick={() => setNstPickerLine(item)}
                                  >
                                      {item.stockDispositionId ? 'Change' : 'NST'}
                                  </Button>
                              ),
                      },
                  ]
                : []),
            {
                key: 'quantity',
                label: 'Qty',
                className: 'w-[100px] text-center',
                render: (item: CashSaleCartItem) =>
                    showPaymentScreen ? (
                        <div className="font-semibold">{item.quantity}</div>
                    ) : (
                        <div className="flex items-center justify-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 bg-transparent"
                                onClick={() => handleCartQuantityChange(item.id, -1, item.selectedSerialNumber)}
                            >
                                <MinusIcon className="h-3 w-3" />
                                <span className="sr-only">Decrease quantity</span>
                            </Button>
                            <Input
                                type="number"
                                value={item.quantity}
                                readOnly
                                className="h-6 w-10 p-0 text-center text-xs"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 bg-transparent"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (
                                        getCartLineStock(item) === item.quantity &&
                                        !supervisorDetails
                                    ) {
                                        setIsInventoryZero(true);
                                        toast.error('Max limit reached');
                                    } else {
                                        handleCartQuantityChange(item.id, 1, item.selectedSerialNumber);
                                    }
                                }}
                            >
                                <PlusIcon className="h-3 w-3" />
                                <span className="sr-only">Increase quantity</span>
                            </Button>
                        </div>
                    ),
            },
            ...(showPaymentScreen && appliedPromotion
                ? [
                      {
                          key: 'freeQuantity',
                          label: 'Free',
                          className: 'w-[100px] text-center font-semibold',
                          render: (item: CashSaleCartItem) =>
                              showPaymentScreen && appliedPromotion ? (
                                  <div className="text-green-700">{item.freeQuantity || 0}</div>
                              ) : null,
                      },
                  ]
                : []),
            {
                key: 'stock',
                label: 'Stock',
                className: 'w-[60px] text-center',
                render: (item: CashSaleCartItem) => {
                    const remainingStock = getCartLineStock(item);
                    return (
                        <div className={`font-semibold ${remainingStock <= 5 ? 'text-red-600' : 'text-green-700'}`}>
                            {remainingStock}
                        </div>
                    );
                },
            },
            {
                key: 'price',
                label: 'Price',
                className: 'w-[80px] text-right',
                render: (item: CashSaleCartItem) => (
                    <>
                        {showPaymentScreen && selectedPromotion && item.promotionalPrice ? (
                            <div className="text-green-700">
                                {currencySymbol} {(item?.promotionalPrice || 0.0).toFixed(2)}
                            </div>
                        ) : null}

                        <div
                            className={`${showPaymentScreen && appliedPromotion && item.promotionalPrice ? 'text-gray-500 line-through' : ''}`}
                        >
                            {currencySymbol} {item?.unitPrice || 0.0}
                        </div>
                    </>
                ),
            },
            {
                key: 'discount',
                label: 'Disc.',
                className: 'w-[92px] text-right',
                render: (item: CashSaleCartItem) => (
                    <>
                        <ManualDiscountInput
                            mode={item.manualDiscountType ?? 'AMOUNT'}
                            amount={item.manualDiscountAmount ?? 0}
                            percentage={item.discountPercentage ?? 0}
                            grossAmount={(item.unitPrice || 0) * item.quantity}
                            currencySymbol={currencySymbol}
                            disabled={!!item.stockDispositionId || showPaymentScreen}
                            onChange={(value) =>
                                handleUpdateLineManualDiscount(item.id, value, item.selectedSerialNumber)
                            }
                        />

                        {isDiscountPercent(item.id) ? (
                            <div className="text-[9px] font-semibold text-green-800">
                                <div>+{discountPercent * 100}% off</div>
                                <div>extra</div>
                            </div>
                        ) : null}
                    </>
                ),
            },
            {
                key: 'lineTotal',
                label: 'Total',
                className: 'w-[80px] text-right font-semibold',
                render: (item: CashSaleCartItem) => (
                    <>
                        {showPaymentScreen && selectedPromotion && (
                            <>
                                {item.promotionalPrice ? (
                                    <div className="text-green-700">
                                        {currencySymbol}{' '}
                                        {(item?.promotionalPrice * item.quantity - item.discount || 0.0).toFixed(2)}
                                    </div>
                                ) : null}

                                {isDiscountPercent(item.id) ? (
                                    <div className="text-green-700">
                                        {currencySymbol} {item.lineTotal * (1 - discountPercent)}
                                    </div>
                                ) : null}
                            </>
                        )}

                        <div
                            className={`${
                                showPaymentScreen &&
                                selectedPromotion &&
                                (item.promotionalPrice || isDiscountPercent(item.id))
                                    ? 'text-gray-500 line-through'
                                    : ''
                            }`}
                        >
                            {currencySymbol} {item.lineTotal}
                        </div>
                    </>
                ),
            },
            ...(showPaymentScreen
                ? []
                : [
                      {
                          key: 'delete',
                          label: 'Delete',
                          className: 'w-[60px] text-center',
                          render: (item: CashSaleCartItem) => (
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-500 hover:text-red-700"
                                  // onClick={() => handleRemoveFromCart(item.id, item.selectedSerialNumber)}
                                  onClick={() => handleRemoveFromCart(item.id)}
                              >
                                  <Trash2Icon className="h-4 w-4" />
                                  <span className="sr-only">Remove item</span>
                              </Button>
                          ),
                      },
                  ]),
        ];
    }, [handleCartQuantityChange, handleRemoveFromCart, handleUpdateLineManualDiscount, showPaymentScreen, appliedPromotion, currencySymbol]);

    const handleCustomerInfo = (data: CashSaleCustomerSchema) => {
        setCustomerData(data);
    };

    const handleConfirmCreditCharge = (orderNumber: string) => {
        toast.success(`Credit charge Successful for ${selectedDebtor?.name}!`);
        handleResetAllSaleState();
    };

    // Suspended Sales Logic
    const [suspendedSaleId, setSuspendedSaleId] = useState('');

    const handleSuspendPayment = useCallback(
        (customer: SuspendedSaleCustomerSchema) => {
            const payload: SuspendedSaleCreateSchema = {
                timezone: moment.tz.guess(),
                ...(selectedDebtor ? { companyDebtorId: selectedDebtor.id } : {}),
                items: cartItems.map((item) => ({
                    companyStockDetailId: item.id,
                    companyStockPricingId: item.companyStockPricingId || item.selectedPricing?.id || '',
                    companyTaxRateId: item?.companyTaxRateId ?? null,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal: item.lineTotal,
                    discount: getAutomaticDiscountAmount(
                        item,
                        (item.unitPrice || 0) * item.quantity,
                    ),
                    ...toManualDiscountPayload(item),
                    comment: item.comment,
                    lineComment: item.lineComment,
                })),
                customerName: customer.customerName,
                customerPhoneNumber: customer.customerPhoneNumber,
                representativeId: customer.representativeId,
            };

            createSuspendedSale.mutate(payload, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success(`Cart Suspended Successfully for ${customer.customerName}!`);
                        handleResetAllSaleState();
                    } else {
                        toast.error('Sale suspension failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
            handleResetAllSaleState();
        },
        [cartItems],
    );

    const handleResumeSuspendedSale = (sale: SuspendedSalesDetails) => {
        sale?.PosDebtor && setSelectedDebtor(sale?.PosDebtor);
        setSuspendedSaleId(sale?.id);
        setSelectedRep(sale?.representative);

        const suspendedCart = sale?.companySuspendedSaleItems;
        console.log('suspendedcart', suspendedCart);

        setCartItems(
            suspendedCart?.map((item) => {
                console.log(`Item ${item.id} tax fields:`, {
                    companyTaxRateId: item.companyTaxRateId,
                    taxRateId: item.taxRateId,
                    CompanyStockDetail: item.CompanyStockDetail?.companyTaxRateId,
                });
                const quantity = item?.quantity || 1;
                const unitPrice = item?.unitPrice || 0;
                const hasManualMetadata =
                    item.manualDiscountAmount !== undefined || item.discountPercentage !== undefined;
                const manual = hasManualMetadata
                    ? getManualDiscountValue(item)
                    : { mode: 'AMOUNT' as const, amount: item?.discount || 0, percentage: 0 };
                const manualAmount =
                    manual.mode === 'PERCENT'
                        ? (unitPrice * quantity * manual.percentage) / 100
                        : clampDiscount(manual.amount, 0, unitPrice * quantity);
                const hasManual = manual.mode === 'PERCENT' ? manual.percentage > 0 : manualAmount > 0;
                const lineDiscount = hasManual ? manualAmount : item?.discount || 0;
                const selectedPricing =
                    item?.selectedPricing ||
                    ({
                        id: item?.companyStockPricingId || '',
                        companyStockPricingTypeId: '',
                        priceInclusive: unitPrice,
                        priceExclusive: unitPrice,
                        type: { name: '' },
                    } as CashSaleCartItem['selectedPricing']);
                return {
                    ...item.CompanyStockDetail,
                    companyStockPricingId: selectedPricing.id || item.companyStockPricingId,
                    companyTaxRateId: item.taxRateId ?? item.companyTaxRateId ?? null,
                    quantity,
                    discount: roundDiscount(lineDiscount),
                    manualDiscountType: manual.mode,
                    manualDiscountAmount:
                        manual.mode === 'PERCENT' ? 0 : roundDiscount(clampDiscount(manual.amount, 0, unitPrice * quantity)),
                    discountPercentage: manual.mode === 'PERCENT' ? roundDiscount(clampDiscount(manual.percentage, 0, 100)) : 0,
                    unitPrice,
                    lineTotal: roundDiscount(unitPrice * quantity - lineDiscount),
                    comment: item?.comment,
                    lineComment: item?.lineComment,
                    selectedPricing,
                };
            }),
        );
    };

    // Promotions

    function handleApplyPromotion(appliedPromo: AppliedPromotionDetails) {
        // Promotions can be applied even when the basket carries a discounted-stock (NST)
        // line. The NST lines themselves are skipped below so they keep their allocation
        // price; if the backend still rejects the basket, handleDispositionSaleError
        // removes the promotion at create time.
        setAppliedPromotion(appliedPromo);

        const selectedPromotion = appliedPromo?.promotion;
        const promotionType = selectedPromotion?.CompanyStockPromotionType?.code;
        const qualifyingItems = selectedPromotion?.CompanyStockPromotionItems;

        let appliedDiscountAmount = 0;
        const freeQuantity = selectedPromotion?.freeQuantity;

        const updatedItems = cartItems.map((item) => {
            // A discounted-stock line is priced by its allocation; a promotion never
            // re-prices it, adds a promotional price, or gives it a free quantity.
            if (item.stockDispositionId) return item;

            const updatedItem = { ...item };

            if (promotionType !== 'SP' && promotionType !== 'BMF') {
                delete updatedItem.promotionalPrice;
            }

            if (promotionType !== 'B1G1') {
                delete updatedItem.freeQuantity;
            }

            const promotionalItem = qualifyingItems?.find((qual) => qual?.companyStockDetailId === item.id);

            // 1) SP && 17) BMF
            if (promotionalItem && (promotionType === 'SP' || promotionType === 'BMF')) {
                const promotionalPrice = +promotionalItem.promotionalPrice || 0;
                appliedDiscountAmount += (item.unitPrice - promotionalPrice) * item.quantity;
                updatedItem.promotionalPrice = promotionalPrice;
            }

            // 2) B1G1

            if (promotionalItem && promotionType === 'B1G1') {
                updatedItem.freeQuantity = freeQuantity;
            }

            // 3) B1GDP
            // 4) B1GDV

            // 5) B1FRV
            if (promotionType === 'B1FRV') {
            }

            // 6) BIAGIB
            // 7) BAGA
            // 8) BIAGDPB

            // 9) BIAGDPT
            if (promotionalItem && promotionType === 'BIAGDPT') {
                const percent = (selectedPromotion?.discountPercent || 0) / 100;

                appliedDiscountAmount += (item.unitPrice * item.quantity - item.discount) * percent;
            }

            // 10) BIAGDVT
            if (promotionType === 'BIAGDVT') {
                appliedDiscountAmount = selectedPromotion?.discountValue || 0;
            }

            // 11) SRVGDVT
            // 12) SRVGDPT
            // 13) SRVGIA
            // 14) BGFRV
            // 15) BGGDPGI
            // 16) BGGDVGI
            // 18) BMMGGRD
            // 19) BMMGGPD
            // 20) BIAGV
            // 21) BXGCF
            // 22) BAFRV
            // 23) STVGDA
            // 24) STVGDP
            // 25) BMMGPRV
            // 26) BGGADV
            // 27) BGGAPP
            // 28) BGGAP

            return updatedItem;
        });

        setCartItems(updatedItems);
        setAppliedPromotionDiscount(appliedDiscountAmount);
    }

    useEffect(() => {
        if (!appliedPromotion) {
            setAppliedPromotionDiscount(0);
        }
    }, [appliedPromotion]);

    // Re-reads the chosen allocation before attaching it to the line. The picker list can
    // be stale, so the line always quotes the backend's latest discountedUnitPrice and
    // version, never the normal pricing-type amount.
    const handleNSTSelect = useCallback(
        async (line: CashSaleCartItem, disposition: StockDisposition) => {
            let fresh = disposition;
            try {
                const res = await getStockDispositionById({
                    id: disposition.id,
                    ...(selectedDebtor ? { companyDebtorId: selectedDebtor.id } : {}),
                });
                if (res?.data) fresh = res.data;
            } catch {
                // Keep the picked row; the pre-checkout re-check still validates it.
            }
            if (!isSellableNST(fresh) || (fresh.remainingQuantity ?? 0) <= 0) {
                toast.error(nstNotSellableReason(fresh));
                return;
            }
            const price = fresh.discountedUnitPrice ?? fresh.unitPrice;
            if (price == null || price <= 0) {
                toast.error('This discounted-stock record has no sellable price.');
                return;
            }
            applyDispositionToLine(line, fresh);
        },
        [applyDispositionToLine, selectedDebtor],
    );

    return (
        <PageLoader isLoading={isPending || isLoading}>
            {/* Loaded only on demand: stockDisposition/list is never called for a normal sale. */}
            <NSTPickerDialog
                open={!!nstPickerLine}
                productId={nstPickerLine?.id}
                productName={nstPickerLine?.description}
                itemCode={nstPickerLine?.itemCode}
                quantity={nstPickerLine?.quantity}
                selectedId={nstPickerLine?.stockDispositionId}
                inventoryScope={nstInventoryScope}
                companyDebtorId={nstCompanyDebtorId}
                onClose={() => setNstPickerLine(null)}
                onSelect={(disposition) => {
                    if (nstPickerLine) void handleNSTSelect(nstPickerLine, disposition);
                    setNstPickerLine(null);
                }}
            />
            <NSTPickerDialog
                open={nstAllOpen}
                all
                quantity={1}
                inventoryScope={nstInventoryScope}
                companyDebtorId={nstCompanyDebtorId}
                onClose={() => setNstAllOpen(false)}
                onSelect={(disposition) => {
                    setNstAllOpen(false);
                    void addScannedNSTLine(disposition.id);
                }}
            />
            <div className="flex w-full gap-4 p-2">
                <div className={`flex ${screenHeight} w-1/2 flex-col rounded-lg bg-white p-4`}>
                    <h2 className="mb-4 flex items-center justify-between text-xl font-semibold">
                        Tax Invoice (Inclusive)
                        {cartItems?.length === 0 ? (
                            <SuspendedCashSales onResumption={handleResumeSuspendedSale} />
                        ) : (
                            <div className="flex gap-2">
                                <CustomerInfo onSubmit={handleCustomerInfo} />
                                {showPaymentScreen ? null : (
                                    // <VoidSale onClick={handleVoidSale}>
                                    //     <div className="space-y-2">
                                    //         <Label>Reason for Voiding the sale:</Label>
                                    //         <Input
                                    //             placeholder="Enter Reason"
                                    //             value={voidSaleReason}
                                    //             onChange={(e) => setVoidSaleReason(e.target.value)}
                                    //         />
                                    //     </div>
                                    // </VoidSale>
                                    <VoidSale
                                        onClick={handleVoidSale}
                                        defaultRepresentativeId={selectedRep?.id || undefined}
                                    />
                                )}
                            </div>
                        )}
                    </h2>

                    <div className="flex-1 overflow-hidden">
                        <div className="h-full overflow-y-auto">
                            <ListOnlyTable
                                columns={cartColumns}
                                data={cartItems}
                                showLineComments={true}
                                lineCommentExtractor={(item) => item.lineComment}
                                showNoDataMessage="Please add items to the cart."
                                staticTable={true}
                            />
                        </div>
                    </div>

                    {hasDiscountOverride && (
                        <div className="px-4 py-2">
                            <span className="text-xs text-amber-600">
                                Approval required: a line discount or price exceeds the allowed limit
                            </span>
                        </div>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                        <div className="flex items-center gap-2">
                            {deviceType === 'WAREHOUSE-USER' && (
                                <DebtorSelection
                                    selectedDebtor={selectedDebtor}
                                    onSelectDebtor={setSelectedDebtor}
                                    isOnline={isOnline}
                                />
                            )}

                            {selectedDebtor && (
                                <CreditCharge
                                    onConfirmClick={handleConfirmCreditCharge}
                                    key={selectedDebtor.id || null}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {showPaymentScreen ? (
                    <PaymentScreen
                        cartTotal={total}
                        onBack={handleBackFromPaymentScreen}
                        onPaymentSuccess={handlePaymentSuccess}
                        screenHeight={screenHeight}
                        isOnline={isOnline}
                        cartItems={cartItems}
                        onApplyPromotion={handleApplyPromotion}
                        appliedPromotion={appliedPromotion}
                        setAppliedPromotion={setAppliedPromotion}
                        appliedPromotionDiscount={appliedPromotionDiscount}
                        companyDebtorId={selectedDebtor?.id}
                        manualDiscount={formDiscount}
                        evaluationEnabled={!isSaleSubmitted}
                    />
                ) : (
                    <div
                        className={`flex ${screenHeight} w-1/2 flex-col justify-between rounded-lg bg-white p-4 shadow-md`}
                    >
                        <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="col-span-2 flex items-center gap-2">
                                <Label htmlFor="stockCode" className="w-24 text-right">
                                    Stock Code:
                                </Label>

                                <div className="relative flex-1">
                                    <ProductSearchSelection
                                        onClose={onProductSelectionClose}
                                        onSelectProduct={(product, price, scannedBaseQuantity) => {
                                            if (scannedBarcode) {
                                                handleQuickAddFromScan(product, price, scannedBaseQuantity);
                                            } else {
                                                handleSelectProductForForm(product, price);
                                            }
                                        }}
                                        selectedProduct={formProduct}
                                        companyDebtorId={selectedDebtor?.id || null}
                                        isOnline={isOnline}
                                        scannedBarcode={scannedBarcode}
                                        warehouseId={authUser?.warehouseId}
                                        key={scannedBarcode}
                                        isEmptyStockValidation={!allowCashSaleNegativeStock}
                                        storeBilling={isCompanyDebtor}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Label htmlFor="unitPrice" className="w-24 text-right">
                                    Unit Price:
                                </Label>
                                <Input
                                    id="unitPrice"
                                    value={formPrice?.priceInclusive?.toFixed(2) || ''}
                                    readOnly
                                    className="flex-1"
                                />
                            </div>

                            {/* Quantity */}
                            <div className="flex items-center gap-2">
                                <Label htmlFor="quantity" className="w-24 text-right">
                                    {isCompanyDebtor ? 'Units:' : 'Quantity:'}
                                </Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={formQuantity}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            setFormQuantity(0);
                                        } else {
                                            const num = parseFloat(val);
                                            if (!isNaN(num)) {
                                                setFormQuantity(num);
                                            }
                                        }
                                    }}
                                    disabled={!formProduct}
                                    className="flex-1"
                                />
                            </div>

                            {formProduct && isPackSellingUnit(formProduct) && (
                                <div className="flex items-center gap-2">
                                    <span className="w-24" aria-hidden="true" />
                                    <p className="text-muted-foreground flex-1 text-xs">
                                        Each pack: {unitsPerSellingUnit(formProduct)} units · Physical quantity:{' '}
                                        {formQuantity * unitsPerSellingUnit(formProduct)} units
                                    </p>
                                </div>
                            )}

                            {/* Line Total */}
                            <div className="flex items-center gap-2">
                                <Label htmlFor="lineTotal" className="w-24 text-right">
                                    Line Total:
                                </Label>
                                <Input
                                    id="lineTotal"
                                    value={lineTotal.toFixed(2)}
                                    readOnly
                                    className="flex-1 font-bold text-green-600"
                                />
                            </div>

                            {/* Discount */}
                            <div className="flex items-center gap-2">
                                <Label htmlFor="discount" className="w-24 text-right">
                                    Discount %:
                                </Label>
                                <Input
                                    id="discount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formDiscount}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            setFormDiscount(0);
                                        } else {
                                            const num = parseFloat(val);
                                            if (!isNaN(num)) {
                                                setFormDiscount(num);
                                            }
                                        }
                                    }}
                                    disabled={!formProduct}
                                    className="flex-1"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Label htmlFor="taxRate" className="w-24 text-right">
                                    Tax Rate:
                                </Label>
                                <Input id="taxRate" value={`${formTaxRate.toFixed(2)}%`} readOnly className="flex-1" />
                            </div>

                            <RepSelection selectedRep={selectedRep} onSelectRep={setSelectedRep} isOnline={isOnline} />

                            <div className="col-span-2 flex items-center gap-2">
                                <Label htmlFor="lineComment" className="w-24 text-right">
                                    Line Comment:
                                </Label>
                                <Input
                                    id="lineComment"
                                    value={formLineComment}
                                    onChange={(e) => setFormLineComment(e.target.value.slice(0, 30))}
                                    onFocus={() => setIsCommentFieldFocused(true)}
                                    onBlur={() => setIsCommentFieldFocused(false)}
                                    autoComplete="off"
                                    disabled={!formProduct}
                                    className="flex-1"
                                    maxLength={30}
                                    placeholder="Max 30 characters"
                                />
                            </div>

                            <div className="col-span-2 flex items-center gap-2">
                                <Label htmlFor="comment" className="w-24 text-right">
                                    Comment:
                                </Label>
                                <Input
                                    id="comment"
                                    value={formComment}
                                    onChange={(e) => setFormComment(e.target.value)}
                                    onFocus={() => setIsCommentFieldFocused(true)}
                                    onBlur={() => setIsCommentFieldFocused(false)}
                                    autoComplete="off"
                                    disabled={!formProduct}
                                    className="flex-1"
                                />
                            </div>

                            <div className="col-span-2 mt-2 flex items-center justify-between">
                                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                    <span>Fast Mode:</span>
                                    <div className="flex items-center gap-1">
                                        <kbd className="bg-muted rounded border px-2 py-1 text-xs font-semibold shadow-sm">
                                            Shift
                                        </kbd>
                                        <span>+</span>
                                        <kbd className="bg-muted rounded border px-2 py-1 text-xs font-semibold shadow-sm">
                                            F
                                        </kbd>
                                    </div>
                                    <span>to enable quick barcode scanning</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={() => setNstAllOpen(true)}
                                        className="h-10"
                                    >
                                        Add Discounted Stock
                                    </Button>
                                    <Button size="lg" onClick={handleAddProductToCart} disabled={!formProduct}>
                                        <PackagePlus className="!h-5 !w-5 shrink-0" />
                                        Add to Cart
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex justify-between text-sm">
                                    <span>Sub Total:</span>
                                    <span className="font-medium">
                                        {currencySymbol} {subTotal.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Total Discount:</span>
                                    <span className="font-medium">
                                        {currencySymbol} {totalDiscount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-lg font-bold">
                                    <span>SALE TOTAL:</span>
                                    <span>
                                        {currencySymbol} {total}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <Button
                                    className="flex-1 bg-green-600 text-white hover:bg-green-700"
                                    size="lg"
                                    onClick={handleAcceptPayment}
                                >
                                    Accept
                                </Button>

                                <SuspendSale onClick={handleSuspendPayment} isCartEmpty={cartItems?.length || 0} />
                            </div>
                        </div>
                    </div>
                )}

                {isInventoryZero && !supervisorDetails && (
                    <SupervisorLogin
                        open={isInventoryZero}
                        onClose={() => setIsInventoryZero(false)}
                        onSuccess={(user) => setSupervisorDetails(user)}
                    />
                )}

                <BarcodeScanner onScan={handleScannedProduct} active={true} />

                {printData && <CashSaleInvoiceDialog printData={printData} onClose={onCloseInvoice} />}

                <OpenTillDialog
                    open={showOpenTillDialog}
                    onOpenChange={setShowOpenTillDialog}
                    onOpened={() => {
                        // The dialog is also raised proactively on POS load, so only
                        // continue a pending checkout when one is actually in progress.
                        if (cartItems.length === 0) return;
                        handleAcceptPayment();
                    }}
                />

                <TillDrawerStatus
                    tillId={openSessionForDrawer?.tillId || null}
                    tillName={openSessionForDrawer?.till?.name}
                    userId={authUser?.id}
                    companyDebtorId={isCompanyDebtor ? authUser?.companyDebtorId : undefined}
                    enabled={isOnline && !!openSessionForDrawer}
                />
            </div>

            <Dialog open={showQuickAddDialog} onOpenChange={setShowQuickAddDialog}>
                <DialogContent
                    className="overflow-hidden p-0 sm:max-w-3xl"
                    onEscapeKeyDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowQuickAddDialog(false);
                        setQuickAddProduct(null);
                        setQuickAddPrice(null);
                    }}
                >
                    {/* Header */}
                    <div className="from-primary/10 to-primary/5 border-b bg-gradient-to-r px-6 py-5">
                        <DialogHeader>
                            <DialogTitle className="text-center text-2xl font-bold">
                                {quickAddProduct?.description}
                            </DialogTitle>

                            <div className="mt-2 flex justify-center">
                                <span className="bg-background rounded-full border px-4 py-1 text-sm font-medium">
                                    Barcode: {quickAddProduct?.itemCode}
                                </span>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-6">
                        <div className="grid gap-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="quick-quantity">{isCompanyDebtor ? 'Units' : 'Quantity'}</Label>
                                    <div className="flex overflow-hidden rounded-xl border">
                                        <Button
                                            type="button"
                                            className="h-16 w-16 rounded-none bg-red-600 text-4xl font-black text-white hover:bg-red-700"
                                            onClick={() => setQuickAddQuantity((prev) => Math.max(1, prev - 1))}
                                        >
                                            −
                                        </Button>
                                        <Input
                                            id="quick-quantity"
                                            ref={quantityInputRef}
                                            type="number"
                                            value={quickAddQuantity}
                                            autoFocus
                                            onChange={(e) =>
                                                setQuickAddQuantity(Math.max(1, Number(e.target.value) || 1))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleConfirmQuickAdd();
                                                    return;
                                                }

                                                if (e.key === 'Tab') {
                                                    e.preventDefault();
                                                    priceInputRef.current?.focus();
                                                }
                                            }}
                                            className="h-16 [appearance:textfield] border-0 text-center text-3xl font-bold focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        />

                                        <Button
                                            type="button"
                                            className="h-16 w-16 rounded-none bg-blue-600 text-4xl font-black text-white hover:bg-blue-700"
                                            onClick={() => setQuickAddQuantity((prev) => prev + 1)}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="space-y-2">
                                    <Label htmlFor="quick-price">
                                        {quickAddExistingNstLine
                                            ? `Unit Price (${currencySymbol}) - NST (fixed)`
                                            : `Unit Price (${currencySymbol})`}
                                    </Label>

                                    <Input
                                        id="quick-price"
                                        ref={priceInputRef}
                                        type="number"
                                        step="0.01"
                                        disabled={!!quickAddExistingNstLine}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleConfirmQuickAdd();
                                                return;
                                            }

                                            if (e.key === 'Tab') {
                                                e.preventDefault();
                                                discountInputRef.current?.focus();
                                            }
                                        }}
                                        value={
                                            quickAddExistingNstLine?.unitPrice ?? (quickAddPrice?.priceInclusive || 0)
                                        }
                                        onChange={(e) => {
                                            if (!quickAddPrice) return;
                                            if (quickAddExistingNstLine) return;

                                            setQuickAddPrice({
                                                ...quickAddPrice,
                                                priceInclusive: Math.max(0, Number(e.target.value) || 0),
                                            });
                                        }}
                                        className="h-16 text-center text-3xl font-bold"
                                    />
                                </div>

                                {/* Discount */}
                                <div className="space-y-2">
                                    <Label htmlFor="quick-discount">
                                        {quickAddExistingNstLine
                                            ? 'Discount - NST (not allowed)'
                                            : `Discount (${currencySymbol})`}
                                    </Label>

                                    <Input
                                        id="quick-discount"
                                        ref={discountInputRef}
                                        type="number"
                                        step="0.01"
                                        disabled={!!quickAddExistingNstLine}
                                        value={quickAddExistingNstLine ? 0 : quickAddDiscount}
                                        onChange={(e) =>
                                            setQuickAddDiscount(
                                                quickAddExistingNstLine ? 0 : Math.max(0, Number(e.target.value) || 0),
                                            )
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleConfirmQuickAdd();
                                                return;
                                            }

                                            if (e.key === 'Tab') {
                                                handleConfirmQuickAdd();
                                            }
                                        }}
                                        className="h-16 text-center text-3xl font-bold text-orange-600"
                                    />
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-muted/30 rounded-xl border p-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="font-medium">
                                            {currencySymbol}
                                            {subtotal.toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-orange-600">
                                        <span>Discount</span>
                                        <span>
                                            - {currencySymbol}
                                            {(quickAddDiscount || 0).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between border-t pt-3 text-lg font-semibold">
                                        <span>Total</span>
                                        <span>
                                            {currencySymbol}
                                            {finalTotal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-5 text-center">
                                    <div className="text-muted-foreground text-xs tracking-widest uppercase">
                                        Final Amount
                                    </div>

                                    <div className="mt-2 text-6xl font-extrabold text-green-600">
                                        {currencySymbol}
                                        {finalTotal.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {/* <div className="rounded-xl border bg-muted/20 p-4">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="fast-scan-mode"
                                        checked={fastScanMode}
                                        onCheckedChange={(checked) =>
                                            setFastScanMode(!!checked)
                                        }
                                    />

                                    <Label
                                        htmlFor="fast-scan-mode"
                                        className="cursor-pointer font-medium"
                                    >
                                        Enable Fast Scan Mode
                                    </Label>
                                </div>

                                <p className="mt-2 text-sm text-muted-foreground">
                                    Future barcode scans will be added directly
                                    to the cart without showing this popup until
                                    checkout.
                                </p>
                            </div> */}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-muted/20 border-t px-6 py-4">
                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant={fastScanMode ? 'default' : 'outline'}
                                onClick={() => setFastScanMode((prev) => !prev)}
                                className="min-w-[180px]"
                            >
                                {fastScanMode ? 'Fast Scan: ON' : 'Fast Scan: OFF'}
                            </Button>
                            <Button variant="outline" size="lg" onClick={() => setShowQuickAddDialog(false)}>
                                Cancel (Esc)
                            </Button>

                            <Button size="lg" className="min-w-[180px] font-semibold" onClick={handleConfirmQuickAdd}>
                                Add to Cart
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId || undefined}
                approvals={approval?.approvals}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                onApproved={handleCashSaleApproved}
            />

            <OverrideReasonDialog
                open={overrideReasonOpen}
                onConfirm={(reason) => closeOverrideReason(reason)}
                onCancel={() => closeOverrideReason(null)}
            />

            <NegativeStockOverrideDialog
                open={negativeStockOverrideOpen}
                requireReason={negativeStockDialogRequireReason}
                lines={negativeStockLines}
                onConfirm={(result) =>
                    closeNegativeStockOverride({
                        proceed: true,
                        reason: result.reason,
                    })
                }
                onCancel={() => closeNegativeStockOverride(null)}
            />
        </PageLoader>
    );
}