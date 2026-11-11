// import { useState, useMemo, useCallback, useEffect } from 'react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Checkbox } from '@/components/ui/checkbox';
// import { toast } from 'sonner';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { CalendarIcon, Trash2Icon } from 'lucide-react';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { isValid, format } from 'date-fns';
// import { Calendar } from '@/components/ui/calendar';
// import { CouponVoucherSelection } from './coupon-voucher-selection';
// import { TenderDetails, useGetTenders, useGetTendersOffline } from '@/api-queries/point-of-sale/tenders';
// import { DISCOUNT_TYPES, TENDER_TYPES } from '@/lib/constant';
// import { PaymentSuccessType, SplitPaymentEntry } from '../..';
// import moment from 'moment';
// import { useAuthUser } from '@/stores/auth-user.store';
// import { AppliedDiscountType, CashSaleCartItem } from '@/api-queries/point-of-sale/cash-sales';
// import { LoyaltyPointRedemptionDetails } from '@/api-queries/loyalty';
// import LoyaltyPointsRedemption from '@/modules/common/hoc/loyalty-points-redemption';
// import { AppliedPromotionDetails, useAutoApplyPromotion, useValidatePromotion } from '@/api-queries/promotions';
// import { EligiblePromotionsList } from '@/modules/common/hoc/eligible-promotions';
// import { Separator } from '@/components/ui/separator';

// interface PaymentScreenProps {
//     cartTotal: number;
//     screenHeight: string;
//     onBack: () => void;
//     onApplyPromotion: (appliedPromotion: AppliedPromotionDetails) => void;
//     onPaymentSuccess: ({}: PaymentSuccessType) => void;
//     isOnline: boolean;
//     cartItems: CashSaleCartItem[];
//     appliedPromotion: AppliedPromotionDetails | null;
//     setAppliedPromotion: (val: AppliedPromotionDetails | null) => void;
//     appliedPromotionDiscount: number;
// }

// interface PaymentEntryState {
//     amount: string;
//     cardNumber: string;
//     cardExpiryInput: string;
//     cardExpiryDate: Date | undefined;
//     bankAccountNumber: string;
//     chequeReference: string;
// }

// const defaultEntry: PaymentEntryState = {
//     amount: '',
//     cardNumber: '',
//     cardExpiryInput: '',
//     cardExpiryDate: undefined,
//     bankAccountNumber: '',
//     chequeReference: '',
// };

// export default function PaymentScreen({
//     cartTotal,
//     onBack,
//     onPaymentSuccess,
//     screenHeight,
//     isOnline,
//     onApplyPromotion,
//     cartItems,
//     appliedPromotion,
//     setAppliedPromotion,
//     appliedPromotionDiscount,
// }: PaymentScreenProps) {
//     const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

//     const tenders = isOnline
//         ? useGetTenders({ isParentNull: true, isDiscountParent: false })?.data?.data?.rows
//         : useGetTendersOffline(isOnline)?.data?.data?.rows?.filter(
//               (tender) => !tender?.parentTenderId && !tender?.isDiscountParent,
//           );

//     const discounts = isOnline
//         ? useGetTenders({ isParentNull: true, isDiscountParent: true })?.data?.data?.rows
//         : useGetTendersOffline(isOnline)?.data?.data?.rows?.filter(
//               (tender) => !tender?.parentTenderId && tender?.isDiscountParent,
//           );

//     const [checkedTenderIds, setCheckedTenderIds] = useState<string[]>([]);
//     const [paymentEntries, setPaymentEntries] = useState<Record<string, PaymentEntryState>>({});

//     const isMultiPayment = checkedTenderIds.length > 1;

//     const [manualDiscount, setManualDiscount] = useState<number>(0);
//     const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedDiscountType[]>([]);

//     const [loyaltyPointRes, setLoyaltyPointRes] = useState<LoyaltyPointRedemptionDetails | null>(null);
//     const [isLoyaltyRedemptionOpen, setIsLoyaltyRedemptionOpen] = useState(false);

//     const totalAppliedDiscount = useMemo(() => {
//         const loyaltyDiscountAmount = loyaltyPointRes?.redeemableValue || 0;
//         const couponVoucherSum = appliedDiscounts.reduce((sum, d) => sum + d.value, 0);
//         return manualDiscount + couponVoucherSum + loyaltyDiscountAmount + appliedPromotionDiscount;
//     }, [
//         manualDiscount,
//         appliedDiscounts,
//         loyaltyPointRes?.redeemableValue,
//         appliedPromotion,
//         appliedPromotionDiscount,
//     ]);

//     const netAmountToPay = useMemo(() => {
//         return Math.max(0, cartTotal - totalAppliedDiscount);
//     }, [cartTotal, totalAppliedDiscount]);

//     const handleManualDiscountChange = useCallback(
//         (e: React.ChangeEvent<HTMLInputElement>) => {
//             let value = parseFloat(e.target.value);
//             if (isNaN(value) || value < 0) {
//                 value = 0;
//             }

//             const currentCouponVoucherSum = appliedDiscounts.reduce((sum, d) => sum + d.value, 0);
//             const potentialTotalDiscount = value + currentCouponVoucherSum;

//             if (potentialTotalDiscount > cartTotal) {
//                 toast.error('Total discount cannot be greater than the cart total amount.');
//                 value = cartTotal - currentCouponVoucherSum;
//                 if (value < 0) value = 0;
//             }
//             setManualDiscount(value);
//         },
//         [cartTotal, appliedDiscounts],
//     );

//     // ----- Cash-covers-full-amount guard -----
//     // Once the cash amount entered is >= netAmountToPay, no other payment
//     // method can be selected (existing unchecked ones become disabled).
//     const isCashCoveringFull = useMemo(() => {
//         const cashTender = tenders?.find((t) => t.type === TENDER_TYPES?.CASH);
//         if (!cashTender) return false;
//         if (!checkedTenderIds.includes(cashTender.id)) return false;

//         const amt = parseFloat(paymentEntries[cashTender.id]?.amount || '0');
//         if (isNaN(amt)) return false;

//         return netAmountToPay > 0 && amt >= netAmountToPay;
//     }, [tenders, checkedTenderIds, paymentEntries, netAmountToPay]);

//     const toggleTender = useCallback(
//         (tenderId: string) => {
//             const cashTender = tenders?.find((t) => t.type === TENDER_TYPES?.CASH);
//             const isTargetCash = cashTender?.id === tenderId;

//             setCheckedTenderIds((prev) => {
//                 const isCurrentlyChecked = prev.includes(tenderId);

//                 // Block selecting a new (non-cash) method while cash already
//                 // covers the full amount due.
//                 if (!isCurrentlyChecked && !isTargetCash && cashTender && prev.includes(cashTender.id)) {
//                     const cashAmt = parseFloat(paymentEntries[cashTender.id]?.amount || '0');
//                     if (!isNaN(cashAmt) && netAmountToPay > 0 && cashAmt >= netAmountToPay) {
//                         toast.error(
//                             'Cash already covers the full amount due. Reduce the cash amount to add another payment method.',
//                         );
//                         return prev;
//                     }
//                 }

//                 if (isCurrentlyChecked) {
//                     setPaymentEntries((entries) => {
//                         const next = { ...entries };
//                         delete next[tenderId];
//                         return next;
//                     });
//                     return prev.filter((id) => id !== tenderId);
//                 }

//                 setPaymentEntries((entries) => ({
//                     ...entries,
//                     [tenderId]: { ...defaultEntry },
//                 }));
//                 return [...prev, tenderId];
//             });
//         },
//         [tenders, paymentEntries, netAmountToPay],
//     );

//     const handleEntryChange = useCallback(
//         (tenderId: string, field: keyof PaymentEntryState, value: string | Date | undefined) => {
//             setPaymentEntries((prev) => ({
//                 ...prev,
//                 [tenderId]: {
//                     ...defaultEntry,
//                     ...prev[tenderId],
//                     [field]: value,
//                 },
//             }));
//         },
//         [],
//     );

//     const handleExpiryInputChange = (tenderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
//         let value = e.target.value.replace(/\D/g, '');

//         if (value.length > 8) value = value.slice(0, 8);

//         let formatted = '';
//         if (value.length > 0) {
//             formatted = value.slice(0, 2);
//             if (value.length >= 3) {
//                 formatted += '/' + value.slice(2, 4);
//             }
//             if (value.length >= 5) {
//                 formatted += '/' + value.slice(4, 8);
//             }
//         }

//         handleEntryChange(tenderId, 'cardExpiryInput', formatted);

//         if (value.length === 8) {
//             const day = parseInt(value.slice(0, 2), 10);
//             const month = parseInt(value.slice(2, 4), 10);
//             const year = parseInt(value.slice(4, 8), 10);

//             const parsedDate = new Date(year, month - 1, day);

//             if (isValid(parsedDate) && parsedDate.getFullYear() === year) {
//                 handleEntryChange(tenderId, 'cardExpiryDate', parsedDate);
//             } else {
//                 handleEntryChange(tenderId, 'cardExpiryDate', undefined);
//             }
//         } else {
//             handleEntryChange(tenderId, 'cardExpiryDate', undefined);
//         }
//     };

//     function handleApplyPromotion(appliedPromo: AppliedPromotionDetails) {
//         onApplyPromotion(appliedPromo);
//     }

//     // ----- Live payment breakdown across all checked methods -----
//     // Rule: only cash is allowed to exceed the remaining balance (excess becomes change).
//     // Non-cash methods are always capped to the remaining balance.
//     // With exactly one non-cash method selected and amount left empty, it auto-applies the full remaining balance.
//     const paymentBreakdown = useMemo(() => {
//         let remaining = netAmountToPay;
//         let totalApplied = 0;
//         let totalChangeDue = 0;
//         const details: Record<string, { appliedAmount: number; changeGiven: number; rawAmount: number }> = {};

//         checkedTenderIds.forEach((id) => {
//             const tender = tenders?.find((t) => t.id === id);
//             const entry = paymentEntries[id];
//             if (!tender) return;

//             const isCash = tender.type === TENDER_TYPES?.CASH;
//             const isSingle = checkedTenderIds.length === 1;

//             let rawAmount: number;
//             if (isSingle && !isCash) {
//                 // Auto-fill full remaining when single non-cash and amount not entered
//                 const typed = parseFloat(entry?.amount || '0');
//                 rawAmount = isNaN(typed) || typed <= 0 ? remaining : typed;
//             } else {
//                 rawAmount = parseFloat(entry?.amount || '0');
//                 if (isNaN(rawAmount) || rawAmount < 0) rawAmount = 0;
//             }

//             let appliedAmount = rawAmount;
//             let changeGiven = 0;

//             if (rawAmount > remaining) {
//                 if (isCash) {
//                     changeGiven = Math.round((rawAmount - remaining) * 100) / 100;
//                     appliedAmount = remaining;
//                 } else {
//                     // Non-cash cannot exceed remaining – cap it
//                     appliedAmount = remaining;
//                 }
//             }

//             appliedAmount = Math.round(appliedAmount * 100) / 100;
//             remaining = Math.max(0, Math.round((remaining - appliedAmount) * 100) / 100);
//             totalApplied = Math.round((totalApplied + appliedAmount) * 100) / 100;
//             totalChangeDue = Math.round((totalChangeDue + changeGiven) * 100) / 100;

//             details[id] = { appliedAmount, changeGiven, rawAmount };
//         });

//         return {
//             details,
//             totalApplied,
//             remainingBalance: Math.max(0, Math.round((netAmountToPay - totalApplied) * 100) / 100),
//             totalChangeDue,
//         };
//     }, [checkedTenderIds, paymentEntries, netAmountToPay, tenders]);

//     const [isCouponSelectionModalOpen, setIsCouponSelectionModalOpen] = useState(false);

//     const handleSelectCoupon = useCallback(
//         (item: TenderDetails) => {
//             let value = 0;
//             let { id, type, fixedDiscountType, fixedDiscountValue, description } = item;

//             setAppliedDiscounts([]);

//             if (fixedDiscountType === DISCOUNT_TYPES?.PERCENTAGE) {
//                 value = (parseFloat(fixedDiscountValue) / 100) * cartTotal;
//             } else {
//                 value = parseFloat(fixedDiscountValue);
//             }

//             if (value < 0) value = 0;

//             setAppliedDiscounts([{ id, type, description, value }]);
//             setIsCouponSelectionModalOpen(false);

//             toast.success(`${item.description} applied!`);
//         },
//         [cartTotal],
//     );

//     const { mutate: autoApplyPromotions, isPending: isApplyPromotionPending } = useAutoApplyPromotion();
//     const { mutate: validatePromotion, isPending: isValidatePromotionPending } = useValidatePromotion();

//     useEffect(() => {
//         setAppliedDiscounts([]);
//         setManualDiscount(0);

//         if (isOnline) {
//             autoApplyPromotions(
//                 {
//                     items: cartItems?.map((item) => ({
//                         companyStockDetailId: item?.id,
//                         quantity: item.quantity,
//                     })),
//                     basketTotal: cartTotal,
//                 },
//                 {
//                     onSuccess: (data) => {
//                         const promotion = data?.data?.rows?.filter((promo) => promo.isAutoApplied)?.[0];

//                         if (promotion) {
//                             validatePromotion(
//                                 {
//                                     items: cartItems?.map((item) => ({
//                                         companyStockDetailId: item?.id,
//                                         quantity: item.quantity,
//                                     })),
//                                     promotionId: promotion?.id,
//                                 },
//                                 {
//                                     onSuccess: (data) => {
//                                         onApplyPromotion(data.data);
//                                         toast.success(`"${promotion?.promotionDescription}" applied successfully`);
//                                     },
//                                     onError: (error) => {
//                                         // @ts-ignore
//                                         toast.error(error?.response.data.message || 'Internal Server Error!');
//                                     },
//                                 },
//                             );
//                         }
//                     },
//                     onError: (error) => {
//                         // @ts-ignore
//                         toast.error(error?.response.data.message || 'Internal Server Error!');
//                     },
//                 },
//             );
//         }
//     }, [cartTotal, isOnline]);

//     const handleRemoveApplied = useCallback((idToRemove: string) => {
//         setAppliedDiscounts((prev) => prev.filter((discount) => discount.id !== idToRemove));
//         toast.info('Discount removed.');
//     }, []);

//     const handleCheckout = useCallback(() => {
//         if (checkedTenderIds.length === 0) {
//             toast.error('Please select a payment method.');
//             return;
//         }

//         for (const id of checkedTenderIds) {
//             const tender = tenders?.find((t) => t.id === id);
//             const entry = paymentEntries[id];
//             if (!tender) continue;

//             const isCash = tender.type === TENDER_TYPES?.CASH;
//             const isCard = tender.type === TENDER_TYPES?.CREDIT_CARD || tender.type === TENDER_TYPES?.DEBIT_CARD;
//             const isCheque = tender.type === TENDER_TYPES?.CHEQUE;

//             if (isCheque) {
//                 if (!entry?.bankAccountNumber?.trim() || !entry?.chequeReference?.trim()) {
//                     toast.error(`Please enter Bank Account Number and Reference for ${tender.description}.`);
//                     return;
//                 }
//             } else if (isCard) {
//                 if (!entry?.cardNumber?.trim()) {
//                     toast.error(`Please enter Card Number for ${tender.description}.`);
//                     return;
//                 }
//                 if (!entry?.cardExpiryDate) {
//                     toast.error(`Please enter Card Expiry Date for ${tender.description}.`);
//                     return;
//                 }
//             }

//             const detail = paymentBreakdown.details[id];
//             const rawAmount = detail?.rawAmount ?? 0;

//             // Require a positive amount for cash always, and for multi-payment methods
//             if (isCash || isMultiPayment) {
//                 if (!rawAmount || rawAmount <= 0) {
//                     toast.error(`Please enter a valid amount for ${tender.description}.`);
//                     return;
//                 }
//             }

//             // Non-cash methods can NEVER exceed the remaining balance (single or multi)
//             if (!isCash && detail && detail.rawAmount > detail.appliedAmount + 0.001) {
//                 toast.error(`Amount for ${tender.description} cannot exceed the remaining balance.`);
//                 return;
//             }
//         }

//         if (paymentBreakdown.remainingBalance > 0) {
//             toast.error(
//                 `Remaining amount of ${currencySymbol} ${paymentBreakdown.remainingBalance.toFixed(2)} is still due.`,
//             );
//             return;
//         }

//         const payments: SplitPaymentEntry[] = checkedTenderIds.map((id) => {
//             const tender = tenders?.find((t) => t.id === id) as TenderDetails;
//             const detail = paymentBreakdown.details[id];
//             return {
//                 tenderTypeId: tender.id,
//                 tenderType: tender.type,
//                 description: tender.description,
//                 amount: detail?.appliedAmount || 0,
//                 remarks: `${tender.description} payment`,
//                 //@ts-ignore
//                 changeGiven: detail?.changeGiven || 0,
//             };
//         });

//         const primaryTenderId = checkedTenderIds[0];
//         const primaryTender = tenders?.find((t) => t.id === primaryTenderId) as TenderDetails;

//         const chequeMatch = checkedTenderIds
//             .map((id) => ({ id, tender: tenders?.find((t) => t.id === id) }))
//             .find((x) => x.tender?.type === TENDER_TYPES.CHEQUE);
//         const cardMatch = checkedTenderIds
//             .map((id) => ({ id, tender: tenders?.find((t) => t.id === id) }))
//             .find((x) => x.tender?.type === TENDER_TYPES.CREDIT_CARD || x.tender?.type === TENDER_TYPES.DEBIT_CARD);

//         const chequeData = chequeMatch ? paymentEntries[chequeMatch.id] : undefined;
//         const cardData = cardMatch ? paymentEntries[cardMatch.id] : undefined;

//         const formattedExpiryDate = cardData?.cardExpiryDate ? moment(cardData.cardExpiryDate).format('DD/MM/YYYY') : null;

//         onPaymentSuccess({
//             netAmountToPay,
//             selectedPaymentMethod: primaryTender,
//             bankAccountNumber: chequeData?.bankAccountNumber?.trim() || '',
//             chequeReference: chequeData?.chequeReference?.trim() || '',
//             cardNumber: cardData?.cardNumber?.trim() || '',
//             cardExpiryDate: formattedExpiryDate || '',
//             changeDue: paymentBreakdown.totalChangeDue,
//             manualDiscount,
//             appliedDiscount: appliedDiscounts?.[0] || null,
//             ...(loyaltyPointRes ? { loyaltyPointRes } : {}),
//             isSplitPayment: isMultiPayment,
//             payments,
//         });
//     }, [
//         checkedTenderIds,
//         paymentEntries,
//         paymentBreakdown,
//         tenders,
//         currencySymbol,
//         netAmountToPay,
//         manualDiscount,
//         appliedDiscounts,
//         loyaltyPointRes,
//         isMultiPayment,
//         onPaymentSuccess,
//     ]);

//     return (
//         <div className={`flex ${screenHeight} w-full flex-col rounded-lg bg-white shadow-md`}>
//             <div className="flex h-[calc(100%-73px)] min-h-0 flex-1">
//                 <div className="flex w-1/2 min-h-0 flex-col overflow-y-auto border-r p-4 pb-0">
//                     <div className="border-b pb-4">
//                         <h2 className="text-xl font-semibold">
//                             Payment Method{checkedTenderIds.length > 1 ? 's' : ''}
//                         </h2>

//                         <ScrollArea className="h-72 w-full pr-2">
//                             <div className="grid gap-4 py-4">
//                                 {tenders
//                                     ?.filter((t) => t.status === 'ACTIVE')
//                                     .map((tender) => {
//                                         const isChecked = checkedTenderIds.includes(tender.id);
//                                         const entry = paymentEntries[tender.id];
//                                         const isCash = tender.type === TENDER_TYPES?.CASH;
//                                         const isCard =
//                                             tender.type === TENDER_TYPES?.CREDIT_CARD ||
//                                             tender.type === TENDER_TYPES?.DEBIT_CARD;
//                                         const isCheque = tender.type === TENDER_TYPES?.CHEQUE;

//                                         // Disable selecting any other (unchecked) method
//                                         // once cash already covers the full amount due.
//                                         const isDisabledByCash = isCashCoveringFull && !isChecked && !isCash;

//                                         return (
//                                             <div key={tender.id} className={isDisabledByCash ? 'opacity-50' : ''}>
//                                                 <div className="flex items-center space-x-2">
//                                                     <Checkbox
//                                                         id={tender.id}
//                                                         checked={isChecked}
//                                                         disabled={isDisabledByCash}
//                                                         onCheckedChange={() => toggleTender(tender.id)}
//                                                     />
//                                                     <Label htmlFor={tender.id}>{tender.description}</Label>
//                                                 </div>

//                                                 {isChecked && (
//                                                     <div className="mt-2 grid gap-2 pl-6">
//                                                         {isCash && (
//                                                             <>
//                                                                 <Label htmlFor={`cashAmount-${tender.id}`} className="sr-only">
//                                                                     Cash Amount
//                                                                 </Label>
//                                                                 <Input
//                                                                     id={`cashAmount-${tender.id}`}
//                                                                     type="number"
//                                                                     placeholder="Enter cash amount tendered"
//                                                                     value={entry?.amount || ''}
//                                                                     onChange={(e) =>
//                                                                         handleEntryChange(tender.id, 'amount', e.target.value)
//                                                                     }
//                                                                     className="h-12 p-3 text-xl"
//                                                                 />
//                                                                 {/* {isCashCoveringFull && (
//                                                                     <p className="text-xs font-medium text-amber-600">
//                                                                         Cash covers the full amount due. Other payment
//                                                                         methods are disabled.
//                                                                     </p>
//                                                                 )} */}
//                                                             </>
//                                                         )}

//                                                         {isCard && (
//                                                             <>
//                                                                 <Label htmlFor={`cardNumber-${tender.id}`} className="sr-only">
//                                                                     Card Number
//                                                                 </Label>
//                                                                 <Input
//                                                                     id={`cardNumber-${tender.id}`}
//                                                                     placeholder="Card Number"
//                                                                     value={entry?.cardNumber || ''}
//                                                                     onChange={(e) =>
//                                                                         handleEntryChange(tender.id, 'cardNumber', e.target.value)
//                                                                     }
//                                                                     className="h-8 text-base"
//                                                                 />

//                                                                 <Label htmlFor={`cardExpiry-${tender.id}`} className="sr-only">
//                                                                     Expiry Date
//                                                                 </Label>
//                                                                 <div className="flex gap-2">
//                                                                     <Input
//                                                                         id={`cardExpiry-${tender.id}`}
//                                                                         placeholder="DD/MM/YYYY"
//                                                                         value={entry?.cardExpiryInput || ''}
//                                                                         onChange={(e) => handleExpiryInputChange(tender.id, e)}
//                                                                         maxLength={10}
//                                                                         className="h-8 text-base"
//                                                                     />

//                                                                     <Popover>
//                                                                         <PopoverTrigger asChild>
//                                                                             <Button variant="outline" size="icon" className="h-8 w-8">
//                                                                                 <CalendarIcon className="h-4 w-4" />
//                                                                             </Button>
//                                                                         </PopoverTrigger>
//                                                                         <PopoverContent className="w-auto p-0">
//                                                                             <Calendar
//                                                                                 mode="single"
//                                                                                 selected={entry?.cardExpiryDate}
//                                                                                 onSelect={(date) => {
//                                                                                     handleEntryChange(tender.id, 'cardExpiryDate', date);
//                                                                                     if (date) {
//                                                                                         handleEntryChange(
//                                                                                             tender.id,
//                                                                                             'cardExpiryInput',
//                                                                                             format(date, 'dd/MM/yyyy'),
//                                                                                         );
//                                                                                     }
//                                                                                 }}
//                                                                                 disabled={(date) =>
//                                                                                     date < new Date(new Date().setHours(0, 0, 0, 0))
//                                                                                 }
//                                                                             />
//                                                                         </PopoverContent>
//                                                                     </Popover>
//                                                                 </div>

//                                                                 {/* Amount field always visible for card */}
//                                                                 <Label htmlFor={`cardAmount-${tender.id}`} className="sr-only">
//                                                                     Amount
//                                                                 </Label>
//                                                                 <Input
//                                                                     id={`cardAmount-${tender.id}`}
//                                                                     type="number"
//                                                                     placeholder="Amount for this card"
//                                                                     value={entry?.amount || ''}
//                                                                     onChange={(e) =>
//                                                                         handleEntryChange(tender.id, 'amount', e.target.value)
//                                                                     }
//                                                                     className="h-8 text-base"
//                                                                 />
//                                                             </>
//                                                         )}

//                                                         {isCheque && (
//                                                             <>
//                                                                 <Label htmlFor={`bankAccountNumber-${tender.id}`} className="sr-only">
//                                                                     Bank Account Number
//                                                                 </Label>
//                                                                 <Input
//                                                                     id={`bankAccountNumber-${tender.id}`}
//                                                                     placeholder="Bank Account Number"
//                                                                     value={entry?.bankAccountNumber || ''}
//                                                                     onChange={(e) =>
//                                                                         handleEntryChange(tender.id, 'bankAccountNumber', e.target.value)
//                                                                     }
//                                                                     className="h-8 text-base"
//                                                                 />
//                                                                 <Label htmlFor={`chequeReference-${tender.id}`} className="sr-only">
//                                                                     Reference
//                                                                 </Label>
//                                                                 <Input
//                                                                     id={`chequeReference-${tender.id}`}
//                                                                     placeholder="Reference"
//                                                                     value={entry?.chequeReference || ''}
//                                                                     onChange={(e) =>
//                                                                         handleEntryChange(tender.id, 'chequeReference', e.target.value)
//                                                                     }
//                                                                     className="h-8 text-base"
//                                                                 />

//                                                                 {/* Amount field always visible for cheque */}
//                                                                 <Label htmlFor={`chequeAmount-${tender.id}`} className="sr-only">
//                                                                     Amount
//                                                                 </Label>
//                                                                 <Input
//                                                                     id={`chequeAmount-${tender.id}`}
//                                                                     type="number"
//                                                                     placeholder="Amount for this cheque"
//                                                                     value={entry?.amount || ''}
//                                                                     onChange={(e) =>
//                                                                         handleEntryChange(tender.id, 'amount', e.target.value)
//                                                                     }
//                                                                     className="h-8 text-base"
//                                                                 />
//                                                             </>
//                                                         )}
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         );
//                                     })}
//                             </div>
//                         </ScrollArea>

//                         {isMultiPayment && (
//                             <div className="mt-2 space-y-1 text-sm font-medium">
//                                 <div className="flex items-center justify-between">
//                                     <span>Total Applied:</span>
//                                     <span>
//                                         {currencySymbol} {paymentBreakdown.totalApplied.toFixed(2)}
//                                     </span>
//                                 </div>
//                                 <div className="flex items-center justify-between">
//                                     <span>Remaining Balance:</span>
//                                     <span>
//                                         {currencySymbol} {paymentBreakdown.remainingBalance.toFixed(2)}
//                                     </span>
//                                 </div>
//                             </div>
//                         )}
//                     </div>

//                     <div className="pt-2">
//                         {isOnline && netAmountToPay !== 0 && (
//                             <div className="flex w-full flex-wrap items-center justify-end gap-2">
//                                 <Button type="button" variant="link" className="!m-0 !h-max !p-0 text-xs" onClick={() => setIsCouponSelectionModalOpen(true)}>
//                                     Select Coupon / Voucher
//                                 </Button>
//                                 <Separator orientation="vertical" className="!h-4 bg-blue-500" />
//                                 <Button type="button" variant="link" className="!m-0 !h-max !p-0 text-xs" onClick={() => setIsLoyaltyRedemptionOpen(true)}>
//                                     Redeem Loyalty Points?
//                                 </Button>
//                             </div>
//                         )}
//                     </div>

//                     {isOnline && (
//                         <>
//                             <Separator className="my-2" />
//                             <div className="flex min-h-[200px] flex-1 flex-col">
//                                 {netAmountToPay !== 0 && cartItems?.length !== 0 && (
//                                     <EligiblePromotionsList
//                                         onApplyPromotion={handleApplyPromotion}
//                                         cartItems={cartItems?.map((item) => ({
//                                             companyStockDetailId: item.id,
//                                             quantity: item.quantity,
//                                         }))}
//                                         basketTotal={cartTotal}
//                                         appliedPromotionId={appliedPromotion?.promotion?.id || ''}
//                                         removePromotion={() => setAppliedPromotion(null)}
//                                         isParentLoading={isValidatePromotionPending || isApplyPromotionPending}
//                                     />
//                                 )}
//                             </div>
//                         </>
//                     )}
//                 </div>

//                 <div className="flex w-1/2 min-h-0 flex-col overflow-y-auto p-4">
//                     <div className="grid flex-none gap-2">
//                         <div className="space-y-1">
//                             <Label htmlFor="amountToPay" className="text-lg font-medium">Amount to Pay</Label>
//                             <Input
//                                 id="amountToPay"
//                                 value={`${currencySymbol} ${netAmountToPay.toFixed(2)}`}
//                                 readOnly
//                                 className="h-auto p-2 text-right text-2xl font-bold"
//                             />
//                         </div>
//                         <div className="space-y-1">
//                             <Label htmlFor="changeDue" className="text-lg font-medium">Change Due</Label>
//                             <Input
//                                 id="changeDue"
//                                 value={`${currencySymbol} ${paymentBreakdown.totalChangeDue.toFixed(2)}`}
//                                 readOnly
//                                 className="h-auto p-2 text-right text-2xl font-bold"
//                             />
//                         </div>

//                         <div className="space-y-1">
//                             <Label htmlFor="manualDiscountInput" className="text-lg font-medium">Add Discount</Label>
//                             <Input
//                                 id="manualDiscountInput"
//                                 type="number"
//                                 placeholder="Enter discount amount"
//                                 value={manualDiscount === 0 ? '' : manualDiscount}
//                                 onChange={handleManualDiscountChange}
//                                 className="h-auto p-2 text-right text-2xl font-bold placeholder:font-normal"
//                                 min="0"
//                             />
//                         </div>
//                     </div>

//                     <div className="mt-4 flex flex-1 flex-col">
//                         <h3 className="mb-2 flex-none text-lg font-semibold">Applied Discounts</h3>
//                         <ScrollArea className="h-27 w-full rounded-md border p-2">
//                             {totalAppliedDiscount === 0 ? (
//                                 <p className="text-muted-foreground text-sm">No discounts applied yet.</p>
//                             ) : (
//                                 <ul className="space-y-1">
//                                     {manualDiscount > 0 && (
//                                         <li className="flex items-center justify-between text-xs">
//                                             <span className="max-w-[65%] font-semibold whitespace-normal">
//                                                 Manual Discount
//                                             </span>
//                                             <span className="flex items-center gap-1">
//                                                 -{currencySymbol} {manualDiscount.toFixed(2)}
//                                                 <Button
//                                                     variant="ghost"
//                                                     size="icon"
//                                                     className="h-6 w-6 text-red-500 hover:text-red-700"
//                                                     onClick={() => setManualDiscount(0)}
//                                                 >
//                                                     <Trash2Icon className="h-3 w-3" />
//                                                 </Button>
//                                             </span>
//                                         </li>
//                                     )}

//                                     {appliedDiscounts.map((d) => (
//                                         <li key={d.id} className="flex items-center justify-between text-xs">
//                                             <span className="max-w-[65%] font-semibold whitespace-normal">
//                                                 {d.description}
//                                             </span>
//                                             <span className="flex items-center gap-1">
//                                                 -{currencySymbol} {d.value.toFixed(2)}
//                                                 <Button
//                                                     variant="ghost"
//                                                     size="icon"
//                                                     className="h-6 w-6 text-red-500 hover:text-red-700"
//                                                     onClick={() => handleRemoveApplied(d.id)}
//                                                 >
//                                                     <Trash2Icon className="h-3 w-3" />
//                                                 </Button>
//                                             </span>
//                                         </li>
//                                     ))}

//                                     {appliedPromotion && appliedPromotionDiscount > 0 && (
//                                         <li className="flex items-center justify-between text-xs">
//                                             <span className="max-w-[65%] font-semibold whitespace-normal">
//                                                 {appliedPromotion?.promotion?.promotionDescription} (
//                                                 {appliedPromotion?.promotion?.promotionBatchCode})
//                                             </span>
//                                             <span className="flex items-center gap-1">
//                                                 -{currencySymbol} {(+appliedPromotionDiscount).toFixed(2)}
//                                                 <Button
//                                                     variant="ghost"
//                                                     size="icon"
//                                                     className="h-6 w-6 text-red-500 hover:text-red-700"
//                                                     onClick={() => setAppliedPromotion(null)}
//                                                 >
//                                                     <Trash2Icon className="h-3 w-3" />
//                                                 </Button>
//                                             </span>
//                                         </li>
//                                     )}

//                                     {loyaltyPointRes?.redeemableValue && (
//                                         <li className="flex items-center justify-between text-sm">
//                                             <span className="max-w-[65%] font-semibold whitespace-normal">
//                                                 {loyaltyPointRes?.redeemPointsApplied} point
//                                                 {loyaltyPointRes?.redeemPointsApplied <= 1 ? '' : 's'} redeemed
//                                             </span>
//                                             <span className="flex items-center gap-1">
//                                                 -{currencySymbol} {loyaltyPointRes?.redeemableValue.toFixed(2)}
//                                                 <Button
//                                                     variant="ghost"
//                                                     size="icon"
//                                                     className="h-6 w-6 text-red-500 hover:text-red-700"
//                                                     onClick={() => setLoyaltyPointRes(null)}
//                                                 >
//                                                     <Trash2Icon className="h-3 w-3" />
//                                                 </Button>
//                                             </span>
//                                         </li>
//                                     )}
//                                 </ul>
//                             )}
//                         </ScrollArea>
//                     </div>
//                 </div>
//             </div>

//             <div className="flex h-[73px] w-full flex-none gap-2 border-t p-4">
//                 <Button className="flex-1" size="lg" onClick={handleCheckout}>
//                     Checkout
//                 </Button>
//                 <Button variant="outline" className="flex-1" size="lg" onClick={onBack}>
//                     Back
//                 </Button>
//             </div>

//             {discounts && isCouponSelectionModalOpen && (
//                 <CouponVoucherSelection
//                     isOpen={isCouponSelectionModalOpen}
//                     onClose={() => setIsCouponSelectionModalOpen(false)}
//                     onSelectCoupon={handleSelectCoupon}
//                     discounts={discounts}
//                     isOnline={isOnline}
//                 />
//             )}

//             {isLoyaltyRedemptionOpen && netAmountToPay !== 0 && (
//                 <LoyaltyPointsRedemption
//                     open={isLoyaltyRedemptionOpen}
//                     onClose={() => setIsLoyaltyRedemptionOpen(false)}
//                     totalAmount={netAmountToPay}
//                     onApply={(val) => setLoyaltyPointRes(val)}
//                     saleType="CASH_SALE"
//                 />
//             )}
//         </div>
//     );
// }
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2Icon } from 'lucide-react';
import { CouponVoucherSelection } from './coupon-voucher-selection';
import { TenderDetails, useGetTenders, useGetTendersOffline } from '@/api-queries/point-of-sale/tenders';
import { DISCOUNT_TYPES, TENDER_TYPES } from '@/lib/constant';
import { PaymentSuccessType, SplitPaymentEntry } from '../..';
import { useAuthUser } from '@/stores/auth-user.store';
import { AppliedDiscountType, CashSaleCartItem } from '@/api-queries/point-of-sale/cash-sales';
import { LoyaltyPointRedemptionDetails } from '@/api-queries/loyalty';
import LoyaltyPointsRedemption from '@/modules/common/hoc/loyalty-points-redemption';
import { AppliedPromotionDetails, EvaluatePromotionData, useEvaluatePromotion } from '@/api-queries/promotions';
import { EligiblePromotionsList } from '@/modules/common/hoc/eligible-promotions';
import { Separator } from '@/components/ui/separator';
import { getAutomaticDiscountAmount, toManualDiscountPayload } from '@/lib/manual-discount';

interface PaymentScreenProps {
    cartTotal: number;
    screenHeight: string;
    onBack: () => void;
    onApplyPromotion: (appliedPromotion: AppliedPromotionDetails) => void;
    onPaymentSuccess: ({}: PaymentSuccessType) => void;
    isOnline: boolean;
    cartItems: CashSaleCartItem[];
    appliedPromotion: AppliedPromotionDetails | null;
    setAppliedPromotion: (val: AppliedPromotionDetails | null) => void;
    appliedPromotionDiscount: number;
    companyDebtorId?: string;
    manualDiscount?: number;
    // When false (the sale has been submitted) the promotion-evaluate API must not be
    // called again; the last evaluation is kept as is.
    evaluationEnabled?: boolean;
}

interface PaymentEntryState {
    amount: string;
    bankAccountNumber: string;
    chequeReference: string;
}

const defaultEntry: PaymentEntryState = {
    amount: '',
    bankAccountNumber: '',
    chequeReference: '',
};

export default function PaymentScreen({
    cartTotal,
    onBack,
    onPaymentSuccess,
    screenHeight,
    isOnline,
    onApplyPromotion,
    cartItems,
    appliedPromotion,
    setAppliedPromotion,
    appliedPromotionDiscount,
    companyDebtorId,
    evaluationEnabled = true,
}: PaymentScreenProps) {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const tenders = isOnline
        ? useGetTenders({ isParentNull: true, isDiscountParent: false })?.data?.data?.rows
        : useGetTendersOffline(isOnline)?.data?.data?.rows?.filter(
              (tender) => !tender?.parentTenderId && !tender?.isDiscountParent,
          );

    const discounts = isOnline
        ? useGetTenders({ isParentNull: true, isDiscountParent: true })?.data?.data?.rows
        : useGetTendersOffline(isOnline)?.data?.data?.rows?.filter(
              (tender) => !tender?.parentTenderId && tender?.isDiscountParent,
          );

    const [checkedTenderIds, setCheckedTenderIds] = useState<string[]>([]);
    const [paymentEntries, setPaymentEntries] = useState<Record<string, PaymentEntryState>>({});

    const isMultiPayment = checkedTenderIds.length > 1;

    const [manualDiscount, setManualDiscount] = useState<number>(0);
    const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedDiscountType[]>([]);

    const [loyaltyPointRes, setLoyaltyPointRes] = useState<LoyaltyPointRedemptionDetails | null>(null);
    const [isLoyaltyRedemptionOpen, setIsLoyaltyRedemptionOpen] = useState(false);

    // Result of the server-side promotion evaluation for the whole cart. When present it is
    // the source of truth for the promotion discount and the free-item offers.
    const [evaluateData, setEvaluateData] = useState<EvaluatePromotionData | null>(null);
    const [skippedLines, setSkippedLines] = useState<Array<{ lineKey: string; reason: string; stockDispositionId?: string }>>(
        [],
    );
    // Once the cashier removes an evaluated promotion or applies one manually, the
    // server evaluation must not re-apply a promotion behind their back. The manual
    // selection is then the single source of truth until the payment screen closes.
    const [promotionsSuppressed, setPromotionsSuppressed] = useState(false);
    const promotionsSuppressedRef = useRef(false);

    const clearPromotionEvaluation = useCallback(() => {
        promotionsSuppressedRef.current = true;
        setPromotionsSuppressed(true);
        setEvaluateData(null);
        setSkippedLines([]);
    }, []);

    const promotionDiscount = useMemo(() => {
        if (evaluateData) return Number(evaluateData.totalDiscount) || 0;
        return Number(appliedPromotionDiscount) || 0;
    }, [evaluateData, appliedPromotionDiscount]);

    const appliedPromotionIds = useMemo(() => {
        const ids = new Set<string>();
        for (const application of evaluateData?.applications ?? []) {
            if (application.promotionId) ids.add(application.promotionId);
        }
        for (const offer of evaluateData?.freeItemOffers ?? []) {
            if (offer.promotionId) ids.add(offer.promotionId);
        }
        if (appliedPromotion?.promotion?.id) ids.add(appliedPromotion.promotion.id);
        return Array.from(ids);
    }, [evaluateData, appliedPromotion]);

    const appliedPromotionName = useMemo(
        () =>
            evaluateData?.applications?.find((application) => application.promotionId)?.promotionName ||
            evaluateData?.freeItemOffers?.[0]?.promotionName ||
            appliedPromotion?.promotion?.promotionDescription ||
            'Promotion Discount',
        [evaluateData, appliedPromotion],
    );

    // The promotion-evaluate endpoint prices each line from its normal pricing type and is
    // never told which lines are near-expiry (NST) allocations, so it echoes their ORIGINAL
    // unit price. A discounted-stock line must always be charged at its allocation's
    // discountedUnitPrice, which the cart already holds in `lineTotal`. This is the sum of
    // (discounted lineTotal - evaluated lineTotal) across NST lines and is added to the
    // evaluated total. It is 0 when the server already priced those lines correctly.
    const nstEvalCorrection = useMemo(() => {
        if (!evaluateData?.lines?.length) return 0;
        const lineByKey = new Map(evaluateData.lines.map((line) => [line.lineKey, line]));
        return cartItems.reduce((sum, item, index) => {
            if (!item.stockDispositionId) return sum;
            const line = lineByKey.get(`line-${index + 1}`);
            if (!line || typeof line.lineTotal !== 'number') return sum;
            return sum + ((item.lineTotal || 0) - line.lineTotal);
        }, 0);
    }, [evaluateData, cartItems]);

    const evaluatedBasketTotal = useMemo(() => {
        const value = (evaluateData as (EvaluatePromotionData & { basketTotal?: number }) | null)?.basketTotal;
        return typeof value === 'number' ? value : undefined;
    }, [evaluateData]);

    const totalAppliedDiscount = useMemo(() => {
        const loyaltyDiscountAmount = loyaltyPointRes?.redeemableValue || 0;
        const couponVoucherSum = appliedDiscounts.reduce((sum, d) => sum + d.value, 0);
        return manualDiscount + couponVoucherSum + loyaltyDiscountAmount + promotionDiscount;
    }, [manualDiscount, appliedDiscounts, loyaltyPointRes?.redeemableValue, promotionDiscount]);

    const netAmountToPay = useMemo(() => {
        // When the server has evaluated the basket, the payable base is its computed total
        // (sum of the evaluated lineTotals), corrected so every discounted-stock line is
        // charged at its discounted price. Payment-level discounts are then applied on top.
        if (evaluateData && typeof evaluateData.total === 'number') {
            const couponVoucherSum = appliedDiscounts.reduce((sum, d) => sum + d.value, 0);
            const loyaltyDiscountAmount = loyaltyPointRes?.redeemableValue || 0;
            // Use totalAfterDiscounts which already includes manual discount and promotion discounts
            // Then subtract payment-level discounts (coupons, loyalty) on top
            const evaluatedAfterDiscounts =
                typeof evaluatedBasketTotal === 'number'
                    ? evaluatedBasketTotal
                    : typeof evaluateData.totalAfterDiscounts === 'number'
                      ? evaluateData.totalAfterDiscounts
                      : evaluateData.total;
            // totalAfterDiscounts already includes line-level manual discounts and the
            // promotion result. The payment-screen manual discount is header-level and is
            // not part of the evaluate request, so subtract it here as well.
            return Math.max(
                0,
                evaluatedAfterDiscounts -
                    couponVoucherSum -
                    loyaltyDiscountAmount -
                    Number(manualDiscount || 0),
            );
        }
        return Math.max(0, cartTotal - totalAppliedDiscount);
    }, [
        evaluateData,
        evaluatedBasketTotal,
        nstEvalCorrection,
        cartTotal,
        totalAppliedDiscount,
        appliedDiscounts,
        loyaltyPointRes?.redeemableValue,
        manualDiscount,
    ]);

    const handleManualDiscountChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            let value = parseFloat(e.target.value);
            if (isNaN(value) || value < 0) {
                value = 0;
            }

            const currentCouponVoucherSum = appliedDiscounts.reduce((sum, d) => sum + d.value, 0);
            const potentialTotalDiscount = value + currentCouponVoucherSum;

            if (potentialTotalDiscount > cartTotal) {
                toast.error('Total discount cannot be greater than the cart total amount.');
                value = cartTotal - currentCouponVoucherSum;
                if (value < 0) value = 0;
            }
            setManualDiscount(value);
        },
        [cartTotal, appliedDiscounts],
    );

    const isCashCoveringFull = useMemo(() => {
        const cashTender = tenders?.find((t) => t.type === TENDER_TYPES?.CASH);
        if (!cashTender) return false;
        if (!checkedTenderIds.includes(cashTender.id)) return false;

        const amt = parseFloat(paymentEntries[cashTender.id]?.amount || '0');
        if (isNaN(amt)) return false;

        return netAmountToPay > 0 && amt >= netAmountToPay;
    }, [tenders, checkedTenderIds, paymentEntries, netAmountToPay]);

    const paymentBreakdown = useMemo(() => {
        let remaining = netAmountToPay;
        let totalApplied = 0;
        let totalChangeDue = 0;
        const details: Record<string, { appliedAmount: number; changeGiven: number; rawAmount: number }> = {};

        checkedTenderIds.forEach((id) => {
            const tender = tenders?.find((t) => t.id === id);
            const entry = paymentEntries[id];
            if (!tender) return;

            const isCash = tender.type === TENDER_TYPES?.CASH;
            const isSingle = checkedTenderIds.length === 1;

            let rawAmount: number;
            if (isSingle && !isCash) {
                const typed = parseFloat(entry?.amount || '0');
                rawAmount = isNaN(typed) || typed <= 0 ? remaining : typed;
            } else {
                rawAmount = parseFloat(entry?.amount || '0');
                if (isNaN(rawAmount) || rawAmount < 0) rawAmount = 0;
            }

            let appliedAmount = rawAmount;
            let changeGiven = 0;

            if (rawAmount > remaining) {
                if (isCash) {
                    changeGiven = Math.round((rawAmount - remaining) * 100) / 100;
                    appliedAmount = remaining;
                } else {
                    appliedAmount = remaining;
                }
            }

            appliedAmount = Math.round(appliedAmount * 100) / 100;
            remaining = Math.max(0, Math.round((remaining - appliedAmount) * 100) / 100);
            totalApplied = Math.round((totalApplied + appliedAmount) * 100) / 100;
            totalChangeDue = Math.round((totalChangeDue + changeGiven) * 100) / 100;

            details[id] = { appliedAmount, changeGiven, rawAmount };
        });

        return {
            details,
            totalApplied,
            remainingBalance: Math.max(0, Math.round((netAmountToPay - totalApplied) * 100) / 100),
            totalChangeDue,
        };
    }, [checkedTenderIds, paymentEntries, netAmountToPay, tenders]);

    const toggleTender = useCallback(
        (tenderId: string) => {
            const cashTender = tenders?.find((t) => t.type === TENDER_TYPES?.CASH);
            const isTargetCash = cashTender?.id === tenderId;

            const targetTender = tenders?.find((t) => t.id === tenderId);
            const isTargetCard =
                targetTender?.type === TENDER_TYPES?.CREDIT_CARD || targetTender?.type === TENDER_TYPES?.DEBIT_CARD;

            setCheckedTenderIds((prev) => {
                const isCurrentlyChecked = prev.includes(tenderId);

                if (!isCurrentlyChecked && !isTargetCash && cashTender && prev.includes(cashTender.id)) {
                    const cashAmt = parseFloat(paymentEntries[cashTender.id]?.amount || '0');
                    if (!isNaN(cashAmt) && netAmountToPay > 0 && cashAmt >= netAmountToPay) {
                        toast.error(
                            'Cash already covers the full amount due. Reduce the cash amount to add another payment method.',
                        );
                        return prev;
                    }
                }

                if (isCurrentlyChecked) {
                    setPaymentEntries((entries) => {
                        const next = { ...entries };
                        delete next[tenderId];
                        return next;
                    });
                    return prev.filter((id) => id !== tenderId);
                }

                setPaymentEntries((entries) => ({
                    ...entries,
                    [tenderId]: {
                        ...defaultEntry,
                        amount: isTargetCard
                            ? paymentBreakdown.remainingBalance > 0
                                ? paymentBreakdown.remainingBalance.toFixed(2)
                                : ''
                            : '',
                    },
                }));
                return [...prev, tenderId];
            });
        },
        [tenders, paymentEntries, netAmountToPay, paymentBreakdown],
    );

    const handleEntryChange = useCallback(
        (tenderId: string, field: keyof PaymentEntryState, value: string | Date | undefined) => {
            setPaymentEntries((prev) => ({
                ...prev,
                [tenderId]: {
                    ...defaultEntry,
                    ...prev[tenderId],
                    [field]: value,
                },
            }));
        },
        [],
    );

    function handleApplyPromotion(appliedPromo: AppliedPromotionDetails) {
        clearPromotionEvaluation();
        onApplyPromotion(appliedPromo);
    }

    function handleRemovePromotion() {
        setAppliedPromotion(null);
        clearPromotionEvaluation();
        toast.info('Promotion removed. You can apply another eligible promotion.');
    }

    useEffect(() => {
        if (!tenders || tenders.length === 0) return;
        if (checkedTenderIds.length > 0) return;

        const cashTender = tenders.find((t) => t.type === TENDER_TYPES?.CASH && t.status === 'ACTIVE');
        if (!cashTender) return;

        setCheckedTenderIds([cashTender.id]);
        setPaymentEntries((prev) => ({
            ...prev,
            [cashTender.id]: {
                ...defaultEntry,
                amount: netAmountToPay > 0 ? netAmountToPay.toFixed(2) : '',
            },
        }));
    }, [tenders]);

    useEffect(() => {
        const cashTender = tenders?.find((t) => t.type === TENDER_TYPES?.CASH);
        if (!cashTender) return;
        if (checkedTenderIds.length !== 1 || checkedTenderIds[0] !== cashTender.id) return;

        setPaymentEntries((prev) => {
            const current = prev[cashTender.id];
            if (!current) return prev;
            return {
                ...prev,
                [cashTender.id]: {
                    ...current,
                    amount: netAmountToPay > 0 ? netAmountToPay.toFixed(2) : '',
                },
            };
        });
    }, [netAmountToPay]);

    const [isCouponSelectionModalOpen, setIsCouponSelectionModalOpen] = useState(false);

    const handleSelectCoupon = useCallback(
        (item: TenderDetails) => {
            let value = 0;
            let { id, type, fixedDiscountType, fixedDiscountValue, description } = item;

            setAppliedDiscounts([]);

            if (fixedDiscountType === DISCOUNT_TYPES?.PERCENTAGE) {
                value = (parseFloat(fixedDiscountValue) / 100) * cartTotal;
            } else {
                value = parseFloat(fixedDiscountValue);
            }

            if (value < 0) value = 0;

            setAppliedDiscounts([{ id, type, description, value }]);
            setIsCouponSelectionModalOpen(false);

            toast.success(`${item.description} applied!`);
        },
        [cartTotal],
    );

    const { mutate: evaluatePromotions, isPending: isEvaluatePromotionPending } = useEvaluatePromotion();

    // Every cart row is sent under a stable lineKey so the server's evaluated lines and
    // free-item offers can be mapped back onto the cart.
    const evaluateItems = useMemo(
        () =>
            cartItems?.map((item, index) => ({
                lineKey: `line-${index + 1}`,
                companyStockDetailId: item.id,
                quantity: item.quantity,
                ...(item.companyStockPricingId || item.selectedPricing?.id
                    ? { companyStockPricingId: item.companyStockPricingId || item.selectedPricing?.id }
                    : {}),
                ...(item.selectedPricing?.companyStockPricingTypeId
                    ? { companyStockPricingTypeId: item.selectedPricing.companyStockPricingTypeId }
                    : {}),
                ...(item.stockDispositionId
                    ? {
                        stockDispositionId: item.stockDispositionId,
                        stockDispositionVersion: item.stockDispositionVersion,
                      }
                    : {}),
                discount: getAutomaticDiscountAmount(item, (item.unitPrice || 0) * item.quantity),
                ...toManualDiscountPayload(item),
            })) ?? [],
        [cartItems],
    );

    // Manual line values are part of the evaluate request but not part of the basket
    // composition. Only a real basket change should clear the header-level manual discount.
    const evaluateCompositionKey = useMemo(
        () =>
            JSON.stringify(
                cartItems?.map((item) => ({
                    id: item.id,
                    quantity: item.quantity,
                    companyStockPricingId: item.companyStockPricingId || item.selectedPricing?.id,
                    companyStockPricingTypeId: item.selectedPricing?.companyStockPricingTypeId,
                    stockDispositionId: item.stockDispositionId,
                    stockDispositionVersion: item.stockDispositionVersion,
                })) ?? [],
            ),
        [cartItems],
    );
    const evaluateItemsKey = useMemo(() => JSON.stringify(evaluateItems), [evaluateItems]);
    const loyaltyCardNumber = loyaltyPointRes?.loyaltyCardNumber || '';

    // Discounted-stock (NST) lines are already priced by their allocation and must never be
    // sent to the promotion eligibility / validation call. Only normal lines go through it.
    const promotionEligibleCartItems = useMemo(
        () => cartItems?.filter((item) => !item.stockDispositionId) ?? [],
        [cartItems],
    );
    // The basket total sent for validation likewise excludes the discounted-stock lines.
    const promotionEligibleBasketTotal = useMemo(
        () => promotionEligibleCartItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0),
        [promotionEligibleCartItems],
    );

    // A change to the cart composition invalidates any coupon/manual discount that was
    // entered against the previous basket.
    useEffect(() => {
        setAppliedDiscounts([]);
        setManualDiscount(0);
    }, [evaluateCompositionKey]);

    useEffect(() => {
        // The sale has already been submitted: keep the last evaluation as is and do not
        // call the evaluate API again (the cart is still populated until the invoice closes).
        if (!evaluationEnabled) return;

        if (!isOnline || promotionsSuppressed || evaluateItems.length === 0) {
            setEvaluateData(null);
            return;
        }

        evaluatePromotions(
            {
                transactionType: 'POS',
                ...(companyDebtorId ? { companyDebtorId } : {}),
                ...(loyaltyCardNumber ? { loyaltyCardNumber } : {}),
                items: evaluateItems,
            },
            {
                onSuccess: (data) => {
                    if (promotionsSuppressedRef.current) return;
                    setEvaluateData(data?.data ?? null);
                    if (data?.data?.skippedLines) {
                        setSkippedLines(data.data.skippedLines);
                    }
                },
                onError: () => {
                    if (promotionsSuppressedRef.current) return;
                    setEvaluateData(null);
                },
            },
        );
    }, [evaluateItemsKey, loyaltyCardNumber, companyDebtorId, isOnline, promotionsSuppressed, evaluationEnabled]);

    const handleRemoveApplied = useCallback((idToRemove: string) => {
        setAppliedDiscounts((prev) => prev.filter((discount) => discount.id !== idToRemove));
        toast.info('Discount removed.');
    }, []);

    const handleCheckout = useCallback(() => {
        if (checkedTenderIds.length === 0) {
            toast.error('Please select a payment method.');
            return;
        }

        for (const id of checkedTenderIds) {
            const tender = tenders?.find((t) => t.id === id);
            const entry = paymentEntries[id];
            if (!tender) continue;

            const isCash = tender.type === TENDER_TYPES?.CASH;
            const isCheque = tender.type === TENDER_TYPES?.CHEQUE;

            if (isCheque) {
                if (!entry?.bankAccountNumber?.trim() || !entry?.chequeReference?.trim()) {
                    toast.error(`Please enter Bank Account Number and Reference for ${tender.description}.`);
                    return;
                }
            }

            const detail = paymentBreakdown.details[id];
            const rawAmount = detail?.rawAmount ?? 0;

            // Require a positive amount for cash always, and for multi-payment methods
            if (isCash || isMultiPayment) {
                if (!rawAmount || rawAmount <= 0) {
                    toast.error(`Please enter a valid amount for ${tender.description}.`);
                    return;
                }
            }

            // Non-cash methods can NEVER exceed the remaining balance (single or multi)
            if (!isCash && detail && detail.rawAmount > detail.appliedAmount + 0.001) {
                toast.error(`Amount for ${tender.description} cannot exceed the remaining balance.`);
                return;
            }
        }

        if (paymentBreakdown.remainingBalance > 0) {
            toast.error(
                `Remaining amount of ${currencySymbol} ${paymentBreakdown.remainingBalance.toFixed(2)} is still due.`,
            );
            return;
        }

        const payments: SplitPaymentEntry[] = checkedTenderIds.map((id) => {
            const tender = tenders?.find((t) => t.id === id) as TenderDetails;
            const detail = paymentBreakdown.details[id];
            return {
                tenderTypeId: tender.id,
                tenderType: tender.type,
                description: tender.description,
                amount: detail?.appliedAmount || 0,
                remarks: `${tender.description} payment`,
                //@ts-ignore
                changeGiven: detail?.changeGiven || 0,
            };
        });

        const primaryTenderId = checkedTenderIds[0];
        const primaryTender = tenders?.find((t) => t.id === primaryTenderId) as TenderDetails;

        const chequeMatch = checkedTenderIds
            .map((id) => ({ id, tender: tenders?.find((t) => t.id === id) }))
            .find((x) => x.tender?.type === TENDER_TYPES.CHEQUE);

        const chequeData = chequeMatch ? paymentEntries[chequeMatch.id] : undefined;

        onPaymentSuccess({
            netAmountToPay,
            selectedPaymentMethod: primaryTender,
            bankAccountNumber: chequeData?.bankAccountNumber?.trim() || '',
            chequeReference: chequeData?.chequeReference?.trim() || '',
            cardNumber: '',
            cardExpiryDate: '',
            changeDue: paymentBreakdown.totalChangeDue,
            manualDiscount,
            appliedDiscount: appliedDiscounts?.[0] || null,
            ...(loyaltyPointRes ? { loyaltyPointRes } : {}),
            promotionEvaluation: evaluateData,
            isSplitPayment: isMultiPayment,
            payments,
        });
    }, [
        checkedTenderIds,
        paymentEntries,
        paymentBreakdown,
        tenders,
        currencySymbol,
        netAmountToPay,
        manualDiscount,
        appliedDiscounts,
        loyaltyPointRes,
        evaluateData,
        isMultiPayment,
        onPaymentSuccess,
    ]);

    const paymentFieldsContainerRef = useRef<HTMLDivElement>(null);

    const handleFieldKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();

            const container = paymentFieldsContainerRef.current;
            if (!container) return;

            const isCashInput = e.currentTarget.id.startsWith('cashAmount');
            const isCardInput = e.currentTarget.id.startsWith('cardAmount');

            if (isCashInput) {
                const cardInput = container.querySelector<HTMLInputElement>('input[id^="cardAmount-"]');
                if (cardInput) {
                    cardInput.focus();
                    cardInput.select?.();
                    return;
                }
                if (checkedTenderIds.length > 0 && paymentBreakdown.remainingBalance <= 0) {
                    handleCheckout();
                }
                return;
            }

            if (isCardInput) {
                if (checkedTenderIds.length > 0 && paymentBreakdown.remainingBalance <= 0) {
                    handleCheckout();
                }
                return;
            }

            if (checkedTenderIds.length > 0 && paymentBreakdown.remainingBalance <= 0) {
                handleCheckout();
                return;
            }

            const fields = Array.from(container.querySelectorAll<HTMLInputElement>('[data-payment-field="true"]'));
            const currentIndex = fields.indexOf(e.currentTarget);
            if (currentIndex === -1) return;

            const nextField = fields[currentIndex + 1];
            if (nextField) {
                nextField.focus();
                nextField.select?.();
            }
        },
        [checkedTenderIds, paymentBreakdown, handleCheckout],
    );

    useEffect(() => {
        const handleGlobalEnter = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            const target = e.target as HTMLElement;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLButtonElement ||
                target.closest('button')
            ) {
                return;
            }
            const container = paymentFieldsContainerRef.current;
            if (!container) return;
            const cashInput = container.querySelector<HTMLInputElement>('input[id^="cashAmount-"]');
            if (cashInput) {
                e.preventDefault();
                cashInput.focus();
                cashInput.select?.();
            }
        };
        window.addEventListener('keydown', handleGlobalEnter);
        return () => window.removeEventListener('keydown', handleGlobalEnter);
    }, []);

    return (
        <div className={`flex ${screenHeight} w-full flex-col rounded-lg bg-white shadow-md`}>
            <div className="flex h-[calc(100%-73px)] min-h-0 flex-1">
                <div className="flex min-h-0 w-1/2 flex-col overflow-y-auto border-r p-4 pb-0">
                    <div className="border-b pb-4">
                        <h2 className="text-xl font-semibold">
                            Payment Method{checkedTenderIds.length > 1 ? 's' : ''}
                        </h2>

                        <ScrollArea className="h-72 w-full pr-2">
                            <div className="grid gap-4 py-4" ref={paymentFieldsContainerRef}>
                                {tenders
                                    ?.filter((t) => t.status === 'ACTIVE' && t.type !== TENDER_TYPES?.CHEQUE)
                                    .map((tender) => {
                                        const isChecked = checkedTenderIds.includes(tender.id);
                                        const entry = paymentEntries[tender.id];
                                        const isCash = tender.type === TENDER_TYPES?.CASH;
                                        const isCard =
                                            tender.type === TENDER_TYPES?.CREDIT_CARD ||
                                            tender.type === TENDER_TYPES?.DEBIT_CARD;
                                        const isCheque = tender.type === TENDER_TYPES?.CHEQUE;

                                        // Disable selecting any other (unchecked) method
                                        // once cash already covers the full amount due.
                                        const isDisabledByCash = isCashCoveringFull && !isChecked && !isCash;

                                        return (
                                            <div key={tender.id} className={isDisabledByCash ? 'opacity-50' : ''}>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={tender.id}
                                                        checked={isChecked}
                                                        disabled={isDisabledByCash}
                                                        onCheckedChange={() => toggleTender(tender.id)}
                                                    />
                                                    <Label htmlFor={tender.id}>{tender.description}</Label>
                                                </div>

                                                {isChecked && (
                                                    <div className="mt-2 grid gap-2 pl-6">
                                                        {isCash && (
                                                            <>
                                                                <Label
                                                                    htmlFor={`cashAmount-${tender.id}`}
                                                                    className="sr-only"
                                                                >
                                                                    Cash Amount
                                                                </Label>
                                                                <Input
                                                                    id={`cashAmount-${tender.id}`}
                                                                    type="number"
                                                                    placeholder="Enter cash amount tendered"
                                                                    value={entry?.amount || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(
                                                                            tender.id,
                                                                            'amount',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    onKeyDown={handleFieldKeyDown}
                                                                    data-payment-field="true"
                                                                    className="h-12 p-3 text-xl"
                                                                />
                                                                {/* {isCashCoveringFull && (
                                                                    <p className="text-xs font-medium text-amber-600">
                                                                        Cash covers the full amount due. Other payment
                                                                        methods are disabled.
                                                                    </p>
                                                                )} */}
                                                            </>
                                                        )}

                                                        {isCard && (
                                                            <>
                                                                <Label
                                                                    htmlFor={`cardAmount-${tender.id}`}
                                                                    className="sr-only"
                                                                >
                                                                    Amount
                                                                </Label>
                                                                <Input
                                                                    id={`cardAmount-${tender.id}`}
                                                                    type="number"
                                                                    placeholder="Amount for this card"
                                                                    value={entry?.amount || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(
                                                                            tender.id,
                                                                            'amount',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    onKeyDown={handleFieldKeyDown}
                                                                    data-payment-field="true"
                                                                    className="h-8 text-base"
                                                                />
                                                            </>
                                                        )}

                                                        {isCheque && (
                                                            <>
                                                                <Label
                                                                    htmlFor={`bankAccountNumber-${tender.id}`}
                                                                    className="sr-only"
                                                                >
                                                                    Bank Account Number
                                                                </Label>
                                                                <Input
                                                                    id={`bankAccountNumber-${tender.id}`}
                                                                    placeholder="Bank Account Number"
                                                                    value={entry?.bankAccountNumber || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(
                                                                            tender.id,
                                                                            'bankAccountNumber',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    onKeyDown={handleFieldKeyDown}
                                                                    data-payment-field="true"
                                                                    className="h-8 text-base"
                                                                />
                                                                <Label
                                                                    htmlFor={`chequeReference-${tender.id}`}
                                                                    className="sr-only"
                                                                >
                                                                    Reference
                                                                </Label>
                                                                <Input
                                                                    id={`chequeReference-${tender.id}`}
                                                                    placeholder="Reference"
                                                                    value={entry?.chequeReference || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(
                                                                            tender.id,
                                                                            'chequeReference',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    onKeyDown={handleFieldKeyDown}
                                                                    data-payment-field="true"
                                                                    className="h-8 text-base"
                                                                />

                                                                {/* Amount field always visible for cheque */}
                                                                <Label
                                                                    htmlFor={`chequeAmount-${tender.id}`}
                                                                    className="sr-only"
                                                                >
                                                                    Amount
                                                                </Label>
                                                                <Input
                                                                    id={`chequeAmount-${tender.id}`}
                                                                    type="number"
                                                                    placeholder="Amount for this cheque"
                                                                    value={entry?.amount || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(
                                                                            tender.id,
                                                                            'amount',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    onKeyDown={handleFieldKeyDown}
                                                                    data-payment-field="true"
                                                                    className="h-8 text-base"
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </ScrollArea>

                        {isMultiPayment && (
                            <div className="mt-2 space-y-1 text-sm font-medium">
                                <div className="flex items-center justify-between">
                                    <span>Total Applied:</span>
                                    <span>
                                        {currencySymbol} {paymentBreakdown.totalApplied.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Remaining Balance:</span>
                                    <span>
                                        {currencySymbol} {paymentBreakdown.remainingBalance.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        {isOnline && netAmountToPay !== 0 && (
                            <div className="flex w-full flex-wrap items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="link"
                                    className="!m-0 !h-max !p-0 text-xs"
                                    onClick={() => setIsCouponSelectionModalOpen(true)}
                                >
                                    Select Coupon / Voucher
                                </Button>
                                <Separator orientation="vertical" className="!h-4 bg-blue-500" />
                                <Button
                                    type="button"
                                    variant="link"
                                    className="!m-0 !h-max !p-0 text-xs"
                                    onClick={() => setIsLoyaltyRedemptionOpen(true)}
                                >
                                    Redeem Loyalty Points?
                                </Button>
                            </div>
                        )}
                    </div>

                    {isOnline && (
                        <>
                            <Separator className="my-2" />
                            <div className="flex min-h-[200px] flex-1 flex-col">
                                {netAmountToPay !== 0 && cartItems?.length !== 0 && (
                                    <EligiblePromotionsList
                                        onApplyPromotion={handleApplyPromotion}
                                        cartItems={promotionEligibleCartItems.map((item) => ({
                                            companyStockDetailId: item.id,
                                            quantity: item.quantity,
                                        }))}
                                        basketTotal={promotionEligibleBasketTotal}
                                        appliedPromotionIds={appliedPromotionIds}
                                        removePromotion={handleRemovePromotion}
                                        isParentLoading={isEvaluatePromotionPending && !promotionsSuppressed}
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex min-h-0 w-1/2 flex-col overflow-y-auto p-4">
                    <div className="grid flex-none gap-2">
                        <div className="space-y-1">
                            <Label htmlFor="amountToPay" className="text-lg font-medium">
                                Amount to Pay
                            </Label>
                            <Input
                                id="amountToPay"
                                value={`${currencySymbol} ${netAmountToPay.toFixed(2)}`}
                                readOnly
                                className="h-auto p-2 text-right text-2xl font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="changeDue" className="text-lg font-medium">
                                Change Due
                            </Label>
                            <Input
                                id="changeDue"
                                value={`${currencySymbol} ${paymentBreakdown.totalChangeDue.toFixed(2)}`}
                                readOnly
                                className="h-auto p-2 text-right text-2xl font-bold"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="manualDiscountInput" className="text-lg font-medium">
                                Add Discount
                            </Label>
                            <Input
                                id="manualDiscountInput"
                                type="number"
                                placeholder="Enter discount amount"
                                value={manualDiscount === 0 ? '' : manualDiscount}
                                onChange={handleManualDiscountChange}
                                className="h-auto p-2 text-right text-2xl font-bold placeholder:font-normal"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-1 flex-col">
                        <h3 className="mb-2 flex-none text-lg font-semibold">Applied Discounts</h3>
                        <ScrollArea className="h-27 w-full rounded-md border p-2">
                            {totalAppliedDiscount === 0 ? (
                                <p className="text-muted-foreground text-sm">No discounts applied yet.</p>
                            ) : (
                                <ul className="space-y-1">
                                    {manualDiscount > 0 && (
                                        <li className="flex items-center justify-between text-xs">
                                            <span className="max-w-[65%] font-semibold whitespace-normal">
                                                Manual Discount
                                            </span>
                                            <span className="flex items-center gap-1">
                                                -{currencySymbol} {manualDiscount.toFixed(2)}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-red-500 hover:text-red-700"
                                                    onClick={() => setManualDiscount(0)}
                                                >
                                                    <Trash2Icon className="h-3 w-3" />
                                                </Button>
                                            </span>
                                        </li>
                                    )}

                                    {appliedDiscounts.map((d) => (
                                        <li key={d.id} className="flex items-center justify-between text-xs">
                                            <span className="max-w-[65%] font-semibold whitespace-normal">
                                                {d.description}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                -{currencySymbol} {d.value.toFixed(2)}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-red-500 hover:text-red-700"
                                                    onClick={() => handleRemoveApplied(d.id)}
                                                >
                                                    <Trash2Icon className="h-3 w-3" />
                                                </Button>
                                            </span>
                                        </li>
                                    ))}

                                    {evaluateData && promotionDiscount > 0 && (
                                        <li className="flex items-center justify-between text-xs">
                                            <span className="max-w-[65%] font-semibold whitespace-normal">
                                                {appliedPromotionName}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                -{currencySymbol} {promotionDiscount.toFixed(2)}
                                            </span>
                                        </li>
                                    )}

                                    {evaluateData?.freeItemOffers?.flatMap((offer) =>
                                        offer.rewardItems
                                            .filter((reward) => reward.isFree || (reward.freeQuantity || 0) > 0)
                                            .map((reward, index) => (
                                                <li
                                                    key={`${offer.promotionId}-${reward.companyStockDetailId}-${index}`}
                                                    className="flex items-center justify-between text-xs"
                                                >
                                                    <span className="max-w-[65%] font-semibold whitespace-normal">
                                                        Free: {reward.description || 'Reward item'} x
                                                        {reward.freeQuantity}
                                                    </span>
                                                    <span className="font-semibold text-green-700">FREE</span>
                                                </li>
                                            )),
                                    )}

                                    {!evaluateData && appliedPromotion && appliedPromotionDiscount > 0 && (
                                        <li className="flex items-center justify-between text-xs">
                                            <span className="max-w-[65%] font-semibold whitespace-normal">
                                                {appliedPromotion?.promotion?.promotionDescription} (
                                                {appliedPromotion?.promotion?.promotionBatchCode})
                                            </span>
                                            <span className="flex items-center gap-1">
                                                -{currencySymbol} {(+appliedPromotionDiscount).toFixed(2)}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-red-500 hover:text-red-700"
                                                    onClick={() => setAppliedPromotion(null)}
                                                >
                                                    <Trash2Icon className="h-3 w-3" />
                                                </Button>
                                            </span>
                                        </li>
                                    )}

                                    {loyaltyPointRes?.redeemableValue && (
                                        <li className="flex items-center justify-between text-sm">
                                            <span className="max-w-[65%] font-semibold whitespace-normal">
                                                {loyaltyPointRes?.redeemPointsApplied} point
                                                {loyaltyPointRes?.redeemPointsApplied <= 1 ? '' : 's'} redeemed
                                            </span>
                                            <span className="flex items-center gap-1">
                                                -{currencySymbol} {loyaltyPointRes?.redeemableValue.toFixed(2)}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-red-500 hover:text-red-700"
                                                    onClick={() => setLoyaltyPointRes(null)}
                                                >
                                                    <Trash2Icon className="h-3 w-3" />
                                                </Button>
                                            </span>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </div>

            <div className="flex h-[73px] w-full flex-none gap-2 border-t p-4">
                <Button className="flex-1" size="lg" onClick={handleCheckout}>
                    Checkout
                </Button>
                <Button variant="outline" className="flex-1" size="lg" onClick={onBack}>
                    Back
                </Button>
            </div>

            {discounts && isCouponSelectionModalOpen && (
                <CouponVoucherSelection
                    isOpen={isCouponSelectionModalOpen}
                    onClose={() => setIsCouponSelectionModalOpen(false)}
                    onSelectCoupon={handleSelectCoupon}
                    discounts={discounts}
                    isOnline={isOnline}
                />
            )}

            {isLoyaltyRedemptionOpen && netAmountToPay !== 0 && (
                <LoyaltyPointsRedemption
                    open={isLoyaltyRedemptionOpen}
                    onClose={() => setIsLoyaltyRedemptionOpen(false)}
                    totalAmount={netAmountToPay}
                    onApply={(val) => setLoyaltyPointRes(val)}
                    saleType="CASH_SALE"
                />
            )}
        </div>
    );
}