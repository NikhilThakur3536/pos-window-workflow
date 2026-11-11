// import React, { useState, useMemo, useEffect } from 'react';
// import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
// import InvoiceDetailsForm from './invoice-details-form';
// import { useForm, UseFormReturn } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { ListOnlyTable } from '@/components/list-only-table';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Form, FormField } from '@/components/ui/form';
// import { ChevronDown, Loader2, MinusIcon, PlusIcon, Trash2Icon, X } from 'lucide-react';
// import { ProductSelection } from '../../hoc/product-selection';
// // import { SerialNumber } from '../cash-sales/cash-sales-types';
// import { PriceLevelDialog } from '../../hoc/price-level-dialog';
// import { toast } from 'sonner';
// import moment from 'moment-timezone';
// import SupervisorLogin from '../../hoc/supervisor-login';
// import BarcodeScanner from '../../hoc/bar-code-scanner';
// import LoyaltyPointsRedemption from '../../hoc/loyalty-points-redemption';
// import { PageLoader } from '@/components/custom-components/PageLoader';
// import { Badge } from '@/components/ui/badge';

// // API & Responses
// import {
//     AccountSaleCartItem,
//     useCreateAccountSale,
//     CartItemReponse,
//     AccountSalesDetails,
//     GetAccountSaleResponse,
//     AccountSaleCreateSchema,
// } from '@/api-queries/point-of-sale/account-sales/account-sales';
// import { SaleOrderCreateSchema, useCreateSaleOrder } from '@/api-queries/point-of-sale/account-sales/sale-order';
// import { QuotationCreateSchema, useCreateQuotation } from '@/api-queries/point-of-sale/account-sales/quotations';
// import { CompanyStockDetailsListResponse, StockDetails } from '@/api-queries/company/stock-details';
// import { CartItemPricingType } from '@/api-queries/point-of-sale';
// import AccountSalesInvoiceDialog from './invoice/invoice-dialog';
// import { useAuthUser } from '@/stores/auth-user.store';
// import { useNetworkStore } from '@/stores/network.store';
// import { useInvoiceCountState } from '@/stores/invoice-count.store';
// import { getDBData, setDBData } from '@/offline/db';
// import { calculateTaxDetails, cleanDataPayload, generateUUIDForData, getIDBKey } from '@/utils/helpers';
// import { apiUrls } from '@/api-queries';
// import { CompanyCreditor } from '@/types';
// import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
// import { useQueryClient } from '@tanstack/react-query';
// import {
//     AccountSaleSchemaByType,
//     accountSaleSchemaMap,
//     AccountSalesType,
//     AnyAccountSale,
//     AnyInvoiceType,
// } from '@/api-queries/point-of-sale/account-sales/types';
// import { UserDetails } from '@/api-queries/user';
// import { LoyaltyPointRedemptionDetails } from '@/api-queries/loyalty';
// import { AppliedPromotionDetails, EvaluatePromotionData, useEvaluatePromotion, EvaluatePromotionFreeItemOffer, useAutoApplyPromotion, useValidatePromotion } from '@/api-queries/promotions';
// import { PromotionDialog } from '../../hoc/promotion-dialog';
// import { getApplicableDiscount } from '@/api-queries/quantity-wise-discount';
// import { COLOR_CODES_FOR_INVOICE_FORMS } from '@/lib/constant';

// const AccountSales = () => {
//     const [asType, setASType] = useState<AccountSalesType>('INVOICE');
//     const queryClient = useQueryClient();
//     const [isLoading, setIsLoading] = useState(false);

//     const isOnline = useNetworkStore((state) => state?.online);
//     const { asInvoiceCount, setASInvoiceCount } = useInvoiceCountState();
//     const [loadingRowId, setLoadingRowId] = useState<string | null>(null);

//     const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

//     const { mutate: createAccountSale, isPending: isAccountSalePending } = useCreateAccountSale(isOnline);
//     const { mutate: createSaleOrder, isPending: isSaleOrderPending } = useCreateSaleOrder(isOnline);
//     const { mutate: createQuotation, isPending: isQuotationPending } = useCreateQuotation(isOnline);
//     const [isScanning, setIsScanning] = useState(false);

//     function useDocumentForm(asType: keyof typeof accountSaleSchemaMap) {
//         const schema = accountSaleSchemaMap[asType];

//         // Build defaults based on type
//         const defaultValues: Record<string, any> = {
//             companyDebtorId: '',
//             name: '',
//             address: '',
//             telephone: '',
//             email: '',
//             taxNumber: 0,
//             documentGpPercentage: 0,
//             goodsTotal: 0,
//             discountAmount: 0,
//             taxAmount: 0,
//             totalQuantity: 0,
//             totalFreeQuantity: 0,
//             timezone: moment.tz.guess(),
//             items: [],
//         };

//         if (asType === 'INVOICE') {
//             Object.assign(defaultValues, {
//                 invoiceDiscountPercentage: 0,
//                 invoiceDate: new Date().toISOString().split('T')[0],
//                 invoiceNumber: '',
//                 invoiceInclusive: 'Yes',
//             });
//         }

//         if (asType === 'SALES_ORDER') {
//             Object.assign(defaultValues, {
//                 salesOrderDate: new Date().toISOString().split('T')[0],
//                 salesOrderNumber: '',
//                 salesOrderInclusive: 'Yes',
//                 salesOrderEstimatedDate: '',
//             });
//         }

//         if (asType === 'QUOTATION') {
//             Object.assign(defaultValues, {
//                 quotationDate: new Date().toISOString().split('T')[0],
//                 quotationNumber: '',
//                 quotationInclusive: 'Yes',
//             });
//         }

//         const form = useForm<AccountSaleSchemaByType<typeof asType>>({
//             resolver: zodResolver(schema),
//             defaultValues,
//         });

//         return form;
//     }

//     const form = useDocumentForm(asType);

//     const {
//         handleSubmit,
//         control,
//         setValue,
//         watch,
//         formState: { errors },
//     } = form;

//     const [cartItems, setCartItems] = useState<AccountSaleCartItem[]>([]);
//     console.log("cartitems",cartItems)

//     // Promotions Variables

//     const [isApplyPromotionOpen, setIsApplyPromotionOpen] = useState(false);
//     const [appliedPromotion, setAppliedPromotion] = useState<AppliedPromotionDetails | null>(null);
//     const [appliedPromotionDiscount, setAppliedPromotionDiscount] = useState<number | 0>(0);

    // Promotion evaluation state

// const [promotionEvaluation, setPromotionEvaluation] = useState<EvaluatePromotionData | null>(null);
// const [isPromotionEvaluating, setIsPromotionEvaluating] = useState(false);
// const [freeRewardSelected, setFreeRewardSelected] = useState<EvaluatePromotionFreeItemOffer | null>(null);


//     // ----------------- Modals Start -----------------

//     const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
//     console.log('isProductSelectionOpen out',isProductSelectionOpen)
//     const [isSerialNumberModalOpen, setIsSerialNumberModalOpen] = useState(false);

//     const [selectedDebtor, setSelectedDebtor] = useState<CompanyCreditor | null>(null);
//     const [selectedRep, setSelectedRep] = useState<SalesRepresentativeDetails | null>(null);
//     const [isDebtorSelected, setIsDebtorSelected] = useState(false);
//     const [isPriceLevelSelectionOpen, setIsPriceLevelSelectionOpen] = useState(false);

//     const [isInventoryZero, setIsInventoryZero] = useState(false);
//     const [supervisorDetails, setSupervisorDetails] = useState<UserDetails | null>(null);

//     const [loyaltyPointRes, setLoyaltyPointRes] = useState<LoyaltyPointRedemptionDetails | null>(null);
//     const [isLoyaltyRedemptionOpen, setIsLoyaltyRedemptionOpen] = useState(false);

//     const [printData, setPrintData] = useState<AnyInvoiceType | null>(null);

//     // ----------------- Modals End -----------------

//     const companyDebtorId = watch('companyDebtorId');

//     useEffect(() => {
//         setIsDebtorSelected(!!companyDebtorId);
//     }, [companyDebtorId]);

//     const [editingPriceLevelItem, setEditingPriceLevelItem] = useState<string>('');

//     useEffect(() => {
//         const formattedCartItems: CartItemReponse[] = cartItems.map((item) => ({
//             companyStockDetailId: item.id,
//             companyStockPricingId: item?.companyStockPricingId || '',
//             companyStockPricingTypeId: item?.companyStockPricingTypeId || '',
//             companyTaxRateId: item?.companyTaxRateId || '',
//             quantity: item.quantity,
//             discount: item.discount,
//             unitPrice: item.unitPrice,
//             lineTotal: item.lineTotal,
//         }));

//         setValue('items', formattedCartItems);
//         console.log("formatted items",formattedCartItems)
//     }, [cartItems, setValue, editingPriceLevelItem]);

//     const calculateLineTotal = (item: AccountSaleCartItem) => {
//         return item.unitPrice * item.quantity - item.discount;
//     };

//     const isInclusivePrice =
//         asType === 'SALES_ORDER'
//             ? watch('salesOrderInclusive') === 'Yes'
//             : asType === 'QUOTATION'
//               ? watch('quotationInclusive') === 'Yes'
//               : watch('invoiceInclusive') === 'Yes';

//     const { mutate: autoApplyPromotions, isPending: isApplyPromotionPending } = useAutoApplyPromotion();

    const { mutate: evaluatePromotion, isPending: isEvaluatingPromotion } = useEvaluatePromotion();

//     const { mutate: validatePromotion, isPending: isValidatePromotionPending } = useValidatePromotion();

//     const handleSelectProduct = async (product: StockDetails, companyStockPrice: CartItemPricingType | null) => {
//         // if (product.hasSerialNumber) {
//         //     setIsSerialNumberModalOpen(true);
//         // } else {
//         if (!companyStockPrice) {
//             toast.error('Invalid pricing! Please choose another product.');
//             setIsScanning(false);
//             return;
//         }
//         setIsProductSelectionOpen(false);
//         setScannedBarcode('');
//         setIsScanning(false);

//         const existingItem = cartItems.find((item) => item.id === product.id && !item.selectedSerialNumber);

//         const existingItemIndex = cartItems.findIndex(
//             (item) => item.id === product.id && !item.selectedSerialNumber

//         );

//         // if (existingItem) {
//         //     toast.error('This item is already in the cart!!');
//         //     return cartItems;
//         // }

//         if (existingItemIndex !== -1) {
//             // Increase quantity of existing item
//             const existingItem = cartItems[existingItemIndex];
//             // setIsScanning(true);
//             handleCartQuantityChange(existingItem.id, 1, existingItem.selectedSerialNumber);
//             // setIsProductSelectionOpen(false);
//             console.log('isProductSelectionOpen inside existing items',isProductSelectionOpen)
//             // setScannedBarcode('');
//             // setIsScanning(false);
//             return;
//         }

//         const inclusiveUnitPrice = companyStockPrice?.priceInclusive || 0;

//         const companyDebtorId = form.getValues('companyDebtorId') || '';

//         let discountPercentage = 0;

//         if (companyDebtorId && isOnline) {
//             const result = await getApplicableDiscount({
//                 companyDebtorId,
//                 companyStockDetailId: product.id,
//                 quantity: 1,
//             });

//             discountPercentage = result?.data?.discountPercent || 0;
//         }

//         const discountAmount = inclusiveUnitPrice * (discountPercentage / 100);
//         const lineTotal = inclusiveUnitPrice * 1 - discountAmount;

//         if (discountAmount) {
//             toast.success(
//                 `A discount of ${currencySymbol} ${discountAmount?.toFixed(2)} has been applied to ${product.description}.`,
//                 { position: 'top-right' },
//             );
//         }

//         const newCartItem: AccountSaleCartItem = {
//             ...product,
//             quantity: 1,
//             discount: discountAmount || 0,
//             unitPrice: inclusiveUnitPrice,
//             lineTotal,
//             companyStockPricingId: companyStockPrice?.id,
//             companyStockPricingTypeId: companyStockPrice?.companyStockPricingTypeId,
//             type: companyStockPrice?.type,
//             selectedPricing: companyStockPrice,
//         };

//         const updatedCartItems = [...cartItems, newCartItem];

//         // setCartItems(updatedCartItems);
//         setCartItems((prevItems) => {
//         // Double-check item wasn't added while we were awaiting
//         const alreadyExists = prevItems.find((item) => item.id === product.id && !item.selectedSerialNumber);
//         if (alreadyExists) return prevItems;
//         return [...prevItems, newCartItem];
//     });
//         // setIsProductSelectionOpen(false);
//         console.log('isProductSelectionOpen after cart',isProductSelectionOpen)
//         setScannedBarcode('');

//         if (!discountAmount && isOnline) {

//             autoApplyPromotions(
//                 {
//                     items: updatedCartItems.map((item) => ({
//                         companyStockDetailId: item?.id,
//                         quantity: item.quantity,
//                     })),
//                     basketTotal: goodsTotal,
//                 },
//                 {
//                     onSuccess: (data) => {
//                         const promotion = data?.data?.rows?.filter((promo) => promo.isAutoApplied)?.[0];

//                         if (promotion) {
//                             validatePromotion(
//                                 {
//                                     items: updatedCartItems.map((item) => ({
//                                         companyStockDetailId: item?.id,
//                                         quantity: item.quantity,
//                                     })),
//                                     promotionId: promotion?.id,
//                                 },
//                                 {
//                                     onSuccess: (data) => {
//                                         handleApplyPromotion(data.data, updatedCartItems);
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
//                         toast.error(error?.response?.data?.message || 'Internal Server Error!');
//                     },
//                 },
//             );
//         }

//         // }
//     };

//     // Barcode Scan

//     const [scannedBarcode, setScannedBarcode] = useState<string>('');

//     const handleScannedProduct = (barcode: string) => {
//        if (!selectedDebtor) {
//             toast.error('Please select a debtor/customer first before scanning!');
//             return;
//         }

//         const trimmedBarcode = String(barcode).trim();

//         const existingItemIndex = cartItems.findIndex(
//             (item) => item.barcode?.toLowerCase() === trimmedBarcode.toLowerCase() && !item.selectedSerialNumber
//         );

//         if (existingItemIndex !== -1) {
//             const item = cartItems[existingItemIndex];
//             // setIsScanning(true);
//             handleCartQuantityChange(item.id, 1, item.selectedSerialNumber);
//             setScannedBarcode('');
//             // setIsScanning(false);
//             return;
//         }
//         // setIsProductSelectionOpen(false);

//         setScannedBarcode(trimmedBarcode);
//         // setIsProductSelectionOpen(true);
//     };

//     function onProductSelectionClose() {
//         setIsProductSelectionOpen(false);
//         setScannedBarcode('');
//         setIsScanning(false);
//     }

//     // const handleSelectSerialNumber = useCallback(
//     //     (serialNumber: SerialNumber, selectedProductForSerialNumber: StockDetails) => {
//     //         if (selectedProductForSerialNumber) {
//     //             const newCartItem: AccountSaleCartItem = {
//     //                 ...selectedProductForSerialNumber,
//     //                 quantity: 1,
//     //                 selectedSerialNumber: serialNumber.serial,
//     //                 discount: 0,
//     //                 lineTotal: selectedProductForSerialNumber.unitPrice - 0,
//     //                 companyStockPricingId: '',
//     //             };
//     //             setCartItems((prevItems) => [...prevItems, newCartItem]);
//     //         }
//     //     },
//     //     [],
//     // );

//     // Price Level

//     const handleSelectPriceLevel = (priceType: CartItemPricingType) => {
//         if (editingPriceLevelItem) {
//             setCartItems((prevItems) =>
//                 prevItems.map((item) => {
//                     if (item.id === editingPriceLevelItem) {
//                         const newUnitPrice = priceType.priceInclusive || 0;
//                         return {
//                             ...item,
//                             companyStockPricingId: priceType.id,
//                             selectedPricing: priceType,
//                             unitPrice: newUnitPrice,
//                             lineTotal: calculateLineTotal({
//                                 ...item,
//                                 unitPrice: newUnitPrice,
//                                 quantity: item.quantity,
//                                 discount: item.discount,
//                             }),
//                             type: priceType.type,
//                         };
//                     }
//                     return item;
//                 }),
//             );
//         }
//         setEditingPriceLevelItem('');
//         setIsPriceLevelSelectionOpen(false);
//     };

//     // Cart and Discounts

//     function nullifyPromotionDiscount() {
//         setAppliedPromotionDiscount(0);
//         setAppliedPromotion(null);
//     }

//     const handleCartQuantityChange = async (
//         companyStockDetailId: string,
//         delta: number,
//         selectedSerialNumber?: string,
//     ) => {
//         setLoadingRowId(companyStockDetailId);
//         nullifyPromotionDiscount();

//         const companyDebtorId = form.getValues('companyDebtorId') || '';

//         const item = cartItems.find(
//             (i) => i.id === companyStockDetailId && i.selectedSerialNumber === selectedSerialNumber,
//         );

//         if (!item) return;

//         const newQuantity = Math.max(1, item.quantity + delta);
//         let discountAmount = item.discount || 0;

//         const updatedCartItems = cartItems.map((cartItem) => {
//             if (cartItem.id === companyStockDetailId && cartItem.selectedSerialNumber === selectedSerialNumber) {
//                 return {
//                     ...cartItem,
//                     quantity: newQuantity,
//                     discount: discountAmount,
//                     lineTotal: calculateLineTotal({
//                         ...cartItem,
//                         quantity: newQuantity,
//                         unitPrice: cartItem.unitPrice || 0,
//                         discount: discountAmount,
//                     }),
//                 };
//             }
//             return cartItem;
//         });

//         if (companyDebtorId && isOnline) {
//             try {
//                 setIsLoading(true);

//                 const result = await getApplicableDiscount({
//                     companyDebtorId,
//                     companyStockDetailId: item.id,
//                     quantity: newQuantity,
//                 });

//                 const discountPercent = result?.data?.discountPercent || 0;
//                 const baseAmount = (item.unitPrice || 0) * newQuantity;
//                 discountAmount = baseAmount * (discountPercent / 100);

//                 if (discountAmount) {
//                     toast.success(
//                         `A discount of ${currencySymbol} ${discountAmount.toFixed(2)} has been applied to ${item.description}.`,
//                         { position: 'top-right' },
//                     );

//                     // Re-build with the now-known discountAmount
//                     const updatedCartItemsWithDiscount = cartItems.map((cartItem) => {
//                         if (
//                             cartItem.id === companyStockDetailId &&
//                             cartItem.selectedSerialNumber === selectedSerialNumber
//                         ) {
//                             return {
//                                 ...cartItem,
//                                 quantity: newQuantity,
//                                 discount: discountAmount,
//                                 lineTotal: calculateLineTotal({
//                                     ...cartItem,
//                                     quantity: newQuantity,
//                                     unitPrice: cartItem.unitPrice || 0,
//                                     discount: discountAmount,
//                                 }),
//                             };
//                         }
//                         return cartItem;
//                     });

//                     setCartItems(updatedCartItemsWithDiscount);
//                 } else if (isOnline) {
//                     setCartItems(updatedCartItems);

//                     autoApplyPromotions(
//                         {
//                             items: updatedCartItems.map((cartItem) => ({
//                                 companyStockDetailId: cartItem.id,
//                                 quantity: cartItem.quantity,
//                             })),
//                             basketTotal: goodsTotal,
//                         },
//                         {
//                             onSuccess: (data) => {
//                                 const promotion = data?.data?.rows?.filter((promo) => promo.isAutoApplied)?.[0];

//                                 if (promotion) {
//                                     validatePromotion(
//                                         {
//                                             items: updatedCartItems.map((item) => ({
//                                                 companyStockDetailId: item?.id,
//                                                 quantity: item.quantity,
//                                             })),
//                                             promotionId: promotion?.id,
//                                         },
//                                         {
//                                             onSuccess: (data) => {
//                                                 handleApplyPromotion(data.data, updatedCartItems);
//                                                 toast.success(
//                                                     `"${promotion?.promotionDescription}" applied successfully`,
//                                                 );
//                                             },
//                                             onError: (error) => {
//                                                 // @ts-ignore
//                                                 toast.error(error?.response.data.message || 'Internal Server Error!');
//                                             },
//                                         },
//                                     );
//                                 }
//                             },
//                             onError: (error) => {
//                                 // @ts-ignore
//                                 toast.error(error?.response?.data?.message || 'Internal Server Error!');
//                             },
//                         },
//                     );
//                 }
//             } finally {
//                 setIsLoading(false);
//                 setLoadingRowId(null);
//             }
//         } else {
//             setCartItems(updatedCartItems);
//         }
//     };

//     const handleUpdateLineDiscount = (
//         companyStockDetailId: string,
//         newDiscount: number,
//         selectedSerialNumber?: string,
//     ) => {
//         nullifyPromotionDiscount();

//         setCartItems((prevItems) =>
//             prevItems.map((item) => {
//                 if (item.id === companyStockDetailId && item.selectedSerialNumber === selectedSerialNumber) {
//                     const discount = Math.max(0, newDiscount);
//                     return {
//                         ...item,
//                         discount: discount,
//                         lineTotal: calculateLineTotal({
//                             ...item,
//                             discount: discount,
//                             quantity: item.quantity,
//                             unitPrice: item.unitPrice || 0,
//                         }),
//                     };
//                 }
//                 return item;
//             }),
//         );
//     };

//     const handleUpdatePriceLevel = (code: string) => {
//         nullifyPromotionDiscount();
//         setIsPriceLevelSelectionOpen(true);
//     };

//     const handleRemoveFromCart = (companyStockDetailId: string, selectedSerialNumber?: string) => {
//         nullifyPromotionDiscount();

//         setCartItems((prevItems) =>
//             prevItems.filter(
//                 (item) => !(item.id === companyStockDetailId && item.selectedSerialNumber === selectedSerialNumber),
//             ),
//         );
//     };

//     const goodsTotal = useMemo(
//         () => cartItems.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0),
//         [cartItems],
//     );
//     const discountAmount = useMemo(() => cartItems.reduce((sum, item) => sum + item.discount, 0), [cartItems]);

//     const taxAmount = useMemo(
//         () =>
//             cartItems.reduce(
//                 (sum, item) =>
//                     sum +
//                     +calculateTaxDetails(
//                         (item.unitPrice || 0) * item.quantity || 0,
//                         +item?.subCategory?.taxRate?.taxRatePercent || 0,
//                     ).taxAmount.toFixed(2),
//                 0,
//             ),
//         [cartItems],
//     );

//     const totalQuantity = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

//     const totalFreeQuantity = useMemo(
//         () => cartItems.reduce((sum, item) => sum + (item?.freeQuantity || 0), 0),
//         [cartItems, appliedPromotion],
//     );

//     useEffect(() => {
//         const loyaltyDiscountAmount = loyaltyPointRes?.redeemableValue || 0;
//         setValue(
//             'goodsTotal',
//             +(goodsTotal - discountAmount - loyaltyDiscountAmount - appliedPromotionDiscount).toFixed(2),
//         );
//         setValue('discountAmount', discountAmount);
//         setValue('loyaltyDiscountAmount', loyaltyDiscountAmount);
//         setValue('taxAmount', taxAmount);
//         setValue('totalQuantity', totalQuantity);
//         setValue('totalFreeQuantity', totalFreeQuantity);
//     }, [
//         goodsTotal,
//         discountAmount,
//         taxAmount,
//         loyaltyPointRes?.redeemableValue,
//         totalQuantity,
//         totalFreeQuantity,
//         setValue,
//         appliedPromotionDiscount,
//     ]);

//     useEffect(() => {
//         setValue('promotionDiscountAmount', appliedPromotionDiscount);
//     }, [appliedPromotionDiscount]);

//     const cartColumns = useMemo(() => {
//         const selectedPromotion = appliedPromotion?.promotion;
//         const selectedPromotionType = appliedPromotion?.promotion?.CompanyStockPromotionType?.code;

//         const isDiscountAmount = selectedPromotion && appliedPromotionDiscount;

//         // BIAGDPT
//         const isDiscountPercent = (id: string) =>
//             selectedPromotionType === 'BIAGDPT' &&
//             selectedPromotion?.CompanyStockPromotionItems?.find((data) => data?.companyStockDetailId === id);
//         const discountPercent = (selectedPromotion?.discountPercent || 0) / 100;

//         return [
//             {
//                 key: 'itemCode',
//                 label: 'Code',
//                 className: 'w-[120px]',
//                 render: (item: AccountSaleCartItem) => {
//                     if (item.isNewRow) {
//                         return (
//                             <Button
//                                 variant="ghost"
//                                 size="sm"
//                                 className="h-6 w-full justify-start px-2 text-xs"
//                                 onClick={(e) => {
//                                     e.preventDefault();
//                                     setIsProductSelectionOpen(true);
//                                 }}
//                             >
//                                 <PlusIcon /> Select Product
//                             </Button>
//                         );
//                     }
//                     return (
//                         <span className="block truncate">
//                             {item.itemCode} {item.selectedSerialNumber ? `(${item.selectedSerialNumber})` : ''}
//                         </span>
//                     );
//                 },
//             },
//             {
//                 key: 'description',
//                 label: 'Description',
//                 className: 'max-w-[200px] truncate',
//                 render: (item: AccountSaleCartItem) => item.description,
//             },
//             {
//                 key: 'stock',
//                 label: 'Stock',
//                 className: 'w-[60px] text-center',
//                 render: (item: AccountSaleCartItem) => {
//                     const remainingStock =
//                         +item?.stockOnHand - item?.quantity - (appliedPromotion ? item?.freeQuantity || 0 : 0);
//                     return item.isNewRow ? null : (
//                         <div className={`font-semibold ${remainingStock <= 5 ? 'text-red-600' : 'text-green-700'}`}>
//                             {remainingStock}
//                         </div>
//                     );
//                 },
//             },
//             {
//                 key: 'companyStockPricingId',
//                 label: 'Price Type',
//                 className: 'w-[100px] text-right',
//                 render: (item: AccountSaleCartItem) =>
//                     item.isNewRow ? null : (
//                         <>
//                             <div className="relative flex-grow">
//                                 <Input
//                                     value={
//                                         cartItems.find((cartItem) => cartItem.id === item.id)?.companyStockPricingId
//                                             ? cartItems.find((cartItem) => cartItem.id === item.id)?.type?.name ||
//                                               'Unknown'
//                                             : item.type?.name || 'No Price Type'
//                                     }
//                                     className="border-input h-7 w-full cursor-pointer rounded-md border bg-white px-2 py-1 pr-8 text-xs"
//                                     readOnly
//                                     onClick={() => {
//                                         setEditingPriceLevelItem(item.id);
//                                         setIsPriceLevelSelectionOpen(true);
//                                     }}
//                                 />
//                                 <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
//                             </div>
//                         </>
//                     ),
//             },
//             {
//                 key: 'quantity',
//                 label: 'Qty',
//                 className: 'w-[100px] text-center',
//                 render: (item: AccountSaleCartItem) =>
//                     item.isNewRow ? (
//                         <span className="h-6 w-full text-sm font-semibold">{watch('totalQuantity')}</span>
//                     ) : (
//                         <div className="flex items-center justify-center gap-1">
//                                     <Button
//                                         variant="outline"
//                                         size="icon"
//                                         className="h-6 w-6 bg-transparent"
//                                         onClick={(e) => {
//                                             e.preventDefault();
//                                             handleCartQuantityChange(item.id, -1, item.selectedSerialNumber);
//                                         }}
//                                     >
//                                         <MinusIcon className="h-3 w-3" />
//                                         <span className="sr-only">Decrease quantity</span>
//                                     </Button>
//                                     <Input
//                                         type="number"
//                                         value={item.quantity}
//                                         readOnly
//                                         className="h-6 w-10 p-0 text-center text-xs"
//                                     />
//                                     <Button
//                                         variant="outline"
//                                         size="icon"
//                                         className="h-6 w-6 bg-transparent"
//                                         onClick={(e) => {
//                                             e.preventDefault();
//                                             if (item.stockOnHand === item.quantity && !supervisorDetails) {
//                                                 setIsInventoryZero(true);
//                                                 toast.error('Max limit reached');
//                                             } else {
//                                                 handleCartQuantityChange(item.id, 1, item.selectedSerialNumber);
//                                             }
//                                         }}
//                                     >
//                                         <PlusIcon className="h-3 w-3" />
//                                         <span className="sr-only">Increase quantity</span>
//                                     </Button>

//                         </div>
//                     ),
//             },
//             ...(appliedPromotion
//                 ? [
//                       {
//                           key: 'freeQuantity',
//                           label: 'Free',
//                           className: 'w-[100px] text-center',
//                           render: (item: AccountSaleCartItem) =>
//                               appliedPromotion ? (
//                                   item.isNewRow ? (
//                                       <div className="font-bold text-green-700">{watch('totalFreeQuantity')}</div>
//                                   ) : (
//                                       <div className="font-bold text-green-700">{item.freeQuantity || 0}</div>
//                                   )
//                               ) : null,
//                       },
//                   ]
//                 : []),
//             {
//                 key: 'unitPrice',
//                 label: 'Product Price (incl.)',
//                 className: 'w-[80px] text-right',
//                 render: (item: AccountSaleCartItem) =>
//                     item.isNewRow ? null : (
//                         <>
//                             <Input
//                                 type="number"
//                                 value={item?.promotionalPrice || item?.unitPrice}
//                                 readOnly
//                                 className="h-6 w-full p-0 text-right text-xs"
//                             />

//                             {selectedPromotion && item.promotionalPrice ? (
//                                 <div
//                                     className={`${appliedPromotion && item.promotionalPrice ? 'mt-1 w-full text-right text-xs text-gray-500 line-through' : ''}`}
//                                 >
//                                     {currencySymbol} {(item?.unitPrice || 0.0).toFixed(2)}
//                                 </div>
//                             ) : null}
//                         </>
//                     ),
//             },
//             {
//                 key: 'discount',
//                 label: 'Disc.',
//                 className: 'w-[80px] text-right',
//                 render: (item: AccountSaleCartItem) => {
//                     if (item.isNewRow)
//                         return (
//                             <span className="h-6 w-full justify-end text-sm font-semibold">
//                                 {currencySymbol} {discountAmount.toFixed()}
//                             </span>
//                         );

//                     return (
//                         <>
//                             <Input
//                                 type="number"
//                                 defaultValue={item.discount.toFixed(2)}
//                                 onKeyDown={(e) => {
//                                     if (e.key === 'Enter') {
//                                         e.preventDefault();
//                                         const parsed = parseFloat(e.currentTarget.value);
//                                         if (!isNaN(parsed)) {
//                                             handleUpdateLineDiscount(item.id, parsed, item.selectedSerialNumber);
//                                             e.currentTarget.blur();
//                                         }
//                                     }
//                                 }}
//                                 onBlur={(e) => {
//                                     const parsed = parseFloat(e.target.value);
//                                     if (!isNaN(parsed)) {
//                                         handleUpdateLineDiscount(item.id, parsed, item.selectedSerialNumber);
//                                     }
//                                 }}
//                                 step="0.01"
//                                 className="h-6 w-full p-0 text-right text-xs"
//                             />

//                             {isDiscountPercent(item.id) ? (
//                                 <div className="mt-1 w-full text-right text-[9px] font-semibold text-green-800">
//                                     +{discountPercent * 100}% extra off
//                                 </div>
//                             ) : null}
//                         </>
//                     );
//                 },
//             },
//             {
//                 key: 'lineTotal',
//                 label: 'Total',
//                 className: 'w-[80px] text-right font-semibold',
//                 render: (item: AccountSaleCartItem) =>
//                     item.isNewRow ? (
//                         <>
//                             <div className={`h-6 w-full justify-end text-sm font-semibold`}>
//                                 {currencySymbol} {watch('goodsTotal')}
//                             </div>
//                             {appliedPromotion && appliedPromotionDiscount ? (
//                                 <div className={`h-6 w-full justify-end text-xs text-gray-500 line-through`}>
//                                     {currencySymbol} {watch('goodsTotal') + appliedPromotionDiscount}
//                                 </div>
//                             ) : null}
//                         </>
//                     ) : (
//                         <>
//                             {selectedPromotion ? (
//                                 <>
//                                     {item.promotionalPrice ? (
//                                         <div className="text-green-700">
//                                             {currencySymbol}{' '}
//                                             {(item?.promotionalPrice * item.quantity - item.discount || 0.0).toFixed(2)}
//                                         </div>
//                                     ) : null}

//                                     {isDiscountPercent(item.id) ? (
//                                         <div className="text-green-700">
//                                             {currencySymbol} {item.lineTotal * (1 - discountPercent)}
//                                         </div>
//                                     ) : null}
//                                 </>
//                             ) : null}

//                             <div
//                                 className={`${
//                                     selectedPromotion && (item.promotionalPrice || isDiscountPercent(item.id))
//                                         ? 'text-xs text-gray-500 line-through'
//                                         : ''
//                                 }`}
//                             >
//                                 {currencySymbol} {item.lineTotal?.toFixed()}
//                             </div>
//                         </>
//                     ),
//             },
//             {
//                 key: 'delete',
//                 label: 'Delete',
//                 className: 'w-[60px] text-center',
//                 render: (item: AccountSaleCartItem) =>
//                     item.isNewRow ? null : (
//                         <Button
//                             variant="ghost"
//                             size="icon"
//                             className="h-6 w-6 text-red-500 hover:text-red-700"
//                             onClick={(e) => {
//                                 e.preventDefault();
//                                 handleRemoveFromCart(item.id, item.selectedSerialNumber);
//                             }}
//                         >
//                             <Trash2Icon className="h-4 w-4" />
//                             <span className="sr-only">Remove item</span>
//                         </Button>
//                     ),
//             },
//         ];
//     }, [
//         handleCartQuantityChange,
//         handleRemoveFromCart,
//         handleUpdateLineManualDiscount,
//         handleUpdatePriceLevel,
//         watch,
//         discountAmount,
//         appliedPromotion,
//         appliedPromotionDiscount,
//     ]);

//     const displayCartItems = useMemo(() => {
//         if (isDebtorSelected) {
//             return [
//                 ...cartItems,
//                 {
//                     id: '',
//                     description: '',
//                     barcode: '',
//                     supplierCode: '',
//                     onhand: 0,
//                     unitPrice: 0,
//                     hasSerialNumber: false,
//                     quantity: 0,
//                     discount: 0,
//                     lineTotal: 0,
//                     isNewRow: true,
//                 },
//             ];
//         }
//         return cartItems;
//     }, [cartItems, isDebtorSelected]);

//     const resetFormAndStatesAfterSubmission = (form: UseFormReturn<AnyAccountSale>) => {
//         form.reset();
//         setIsDebtorSelected(false);
//         setSelectedDebtor(null);
//         setCartItems([]);
//         setSelectedRep(null);
//         setASInvoiceCount(asInvoiceCount + 1);
//         setSupervisorDetails(null);
//         setLoyaltyPointRes(null);
//         setAppliedPromotion(null);
//         setAppliedPromotionDiscount(0);
//     };

//     function onSubmit(values: AnyAccountSale) {
//         if (!selectedDebtor) return;

//         const cleanedPayload: Partial<AnyAccountSale> = cleanDataPayload(values);
//         console.log("clean payload",cleanedPayload)
//         const selectedPromotion = appliedPromotion?.promotion;

//         const selectedPromotionPayload = selectedPromotion
//             ? {
//                   promotionId: selectedPromotion?.id,
//                   promotionName: selectedPromotion?.promotionDescription,
//                   promotionDiscountAmount: appliedPromotionDiscount || 0,
//               }
//             : {};

//         function cartItemsWithFreeQuantity() {
//             console.log("values.item",values.items)
//             return values.items.flatMap((item) => {
//                 const promotionType = appliedPromotion?.promotion?.CompanyStockPromotionType?.code;
//                 const cartItem = cartItems.find((data) => data?.id === item.companyStockDetailId);

//                 const isPromotionalPricePromotion = promotionType === 'SP' || promotionType === 'BMF';

//                 const baseItem = {
//                     ...item,
//                     companyTaxRateId: cartItem?.companyTaxRateId || '',
//                     ...(isPromotionalPricePromotion && item.promotionalPrice
//                         ? { promotionalPrice: item.promotionalPrice }
//                         : {}),
//                 };

//                 if (selectedPromotion && promotionType === 'B1G1' && cartItem && cartItem.freeQuantity) {
//                     return [
//                         baseItem,
//                         {
//                             ...baseItem,
//                             freeQuantity: cartItem.freeQuantity,
//                             quantity: 0,
//                             isFree: true,
//                         },
//                     ];
//                 }

//                 return [baseItem];
//             });
//         }

//         if ('invoiceDate' in values) {
//             const asValues = cleanedPayload as AccountSaleCreateSchema;

//             createAccountSale(
//                 {
//                     ...asValues,
//                     items: cartItemsWithFreeQuantity(),
//                     ...(loyaltyPointRes?.loyaltyCardNumber
//                         ? { loyaltyCardNumber: loyaltyPointRes?.loyaltyCardNumber }
//                         : {}),
//                     ...(loyaltyPointRes ? { loyaltyDiscountAmount: loyaltyPointRes?.redeemableValue } : {}),
//                     ...(supervisorDetails ? { approvedById: supervisorDetails?.id } : {}),
//                     ...selectedPromotionPayload,
//                 },
//                 {
//                     onSuccess: async (data) => {
//                         if (data.success) {
//                             toast.success('Account Sale created successfully');
//                             if (isOnline) {
//                                 setPrintData({
//                                     accountSales: data.data,
//                                     cartItems: data.data.DebtorInvoicingOrderItems,
//                                     accountNumber: data.data.CompanyDebtor.accountNumber,
//                                 });
//                             } else {
//                                 // Offline Print data

//                                 setPrintData({
//                                     accountSales: asValues,
//                                     cartItems: cartItems.map((item) => {
//                                         const {
//                                             quantity,
//                                             discount,
//                                             unitPrice,
//                                             freeQuantity,
//                                             isFree,
//                                             promotionalPrice,
//                                             companyStockPricingId,
//                                             type,
//                                             selectedPricing,
//                                             ...product
//                                         } = item;
//                                         return {
//                                             quantity,
//                                             discount,
//                                             unitPrice,
//                                             ...(selectedPromotion ? { freeQuantity, isFree, promotionalPrice } : {}),
//                                             lineTotal: item?.unitPrice * item.quantity - item.discount || 0,
//                                             companyStockPricingId,
//                                             type: item?.type,
//                                             selectedPricing,
//                                             CompanyStockDetail: product,
//                                         };
//                                     }),
//                                     accountNumber: selectedDebtor?.accountNumber,
//                                 });

//                                 // Saving data to indexedDB

//                                 const offlineAccountSalesData = (await getDBData(
//                                     getIDBKey(apiUrls.accountSales),
//                                 )) as GetAccountSaleResponse;

//                                 const offlineAccountSale: AccountSalesDetails = {
//                                     ...(cleanedPayload as AccountSaleCreateSchema),
//                                     CompanyDebtor: selectedDebtor,
//                                     outstandingAmount: values.goodsTotal,
//                                     id: generateUUIDForData(),
//                                     DebtorInvoicingOrderItems: cartItems.map((item) => {
//                                         const {
//                                             quantity,
//                                             discount,
//                                             unitPrice,
//                                             freeQuantity,
//                                             isFree,
//                                             promotionalPrice,
//                                             companyStockPricingId,
//                                             type,
//                                             selectedPricing,
//                                             ...product
//                                         } = item;
//                                         return {
//                                             quantity,
//                                             discount,
//                                             unitPrice,
//                                             ...(selectedPromotion ? { freeQuantity, isFree, promotionalPrice } : {}),
//                                             lineTotal: item?.unitPrice * item.quantity - item.discount || 0,
//                                             companyStockPricingId,
//                                             type: item?.type,
//                                             selectedPricing,
//                                             CompanyStockDetail: product,
//                                         };
//                                     }),
//                                     createdAt: asValues.invoiceDate,
//                                     notSynced: true,
//                                     ...(selectedRep ? { representativeId: selectedRep.id } : {}),
//                                     ...(selectedRep ? { SalesRepresentative: selectedRep } : {}),
//                                 };

//                                 const updateOfflineAccountSalesData: GetAccountSaleResponse = {
//                                     success: true,
//                                     message: 'Account Sale created successfully',
//                                     data: {
//                                         rows: [offlineAccountSale, ...offlineAccountSalesData.data.rows],
//                                         count: offlineAccountSalesData?.data?.count + 1,
//                                     },
//                                 };

//                                 await setDBData(getIDBKey(apiUrls.accountSales), updateOfflineAccountSalesData);
//                                 queryClient.setQueryData(
//                                     [getIDBKey(apiUrls.accountSales), false],
//                                     updateOfflineAccountSalesData,
//                                 );

//                                 // Stock Update
//                                 const offlineStockDetailsData = (await getDBData(
//                                     getIDBKey(apiUrls.stocks),
//                                 )) as CompanyStockDetailsListResponse;

//                                 const updatedStockDetailsData: CompanyStockDetailsListResponse = {
//                                     ...offlineStockDetailsData,
//                                     data: {
//                                         count: offlineStockDetailsData?.data?.count,
//                                         rows: offlineStockDetailsData?.data?.rows?.map((row) => {
//                                             const cartItem = (cleanedPayload as AccountSaleCreateSchema).items.find(
//                                                 (item) => item.companyStockDetailId === row.id,
//                                             );
//                                             if (cartItem)
//                                                 return {
//                                                     ...row,
//                                                     stockOnHand: row.stockOnHand - cartItem.quantity,
//                                                 };
//                                             else return row;
//                                         }),
//                                     },
//                                 };

//                                 await setDBData(getIDBKey(apiUrls.stocks), updatedStockDetailsData);
//                                 queryClient.setQueryData([getIDBKey(apiUrls.stocks), false], updatedStockDetailsData);
//                             }
//                             resetFormAndStatesAfterSubmission(form);
//                         } else {
//                             toast.error('Account Sales creation failed');
//                         }
//                     },
//                     onError: (error) => {
//                         // @ts-ignore
//                         toast.error(error?.response?.data?.message || 'Internal Server Error!');
//                     },
//                 },
//             );
//         }

//         if ('salesOrderDate' in values) {
//             const soValues = cleanedPayload as SaleOrderCreateSchema;
//             createSaleOrder(
//                 {
//                     ...soValues,
//                     ...(supervisorDetails ? { approvedById: supervisorDetails?.id } : {}),
//                     ...selectedPromotionPayload,
//                     items: cartItemsWithFreeQuantity(),
//                 },
//                 {
//                     onSuccess: async (data) => {
//                         if (data.success) {
//                             toast.success('Sale order created successfully');
//                             setPrintData({
//                                 accountSales: data.data,
//                                 cartItems: data.data.salesOrderItems,
//                                 accountNumber: data.data.CompanyDebtor.accountNumber,
//                             });
//                             resetFormAndStatesAfterSubmission(form);
//                         } else {
//                             toast.error('Sale order creation failed');
//                         }
//                     },
//                     onError: (error) => {
//                         // @ts-ignore
//                         toast.error(error?.response?.data?.message || 'Internal Server Error!');
//                     },
//                 },
//             );
//         }

//         if ('quotationDate' in values) {
//             const pqValues = cleanedPayload as QuotationCreateSchema;
//             createQuotation(
//                 {
//                     ...pqValues,
//                     ...(supervisorDetails ? { approvedById: supervisorDetails?.id } : {}),
//                     ...selectedPromotionPayload,
//                     items: cartItemsWithFreeQuantity(),
//                 } as QuotationCreateSchema,
//                 {
//                     onSuccess: async (data) => {
//                         if (data.success) {
//                             toast.success('Price Quotations created successfully');
//                             setPrintData({
//                                 accountSales: data.data,
//                                 cartItems: data.data.priceQuotationItems,
//                                 accountNumber: data.data.CompanyDebtor.accountNumber,
//                             });
//                             resetFormAndStatesAfterSubmission(form);
//                         } else {
//                             toast.error('Price Quotations creation failed');
//                         }
//                     },
//                     onError: (error) => {
//                         // @ts-ignore
//                         toast.error(error?.response?.data?.message || 'Internal Server Error!');
//                     },
//                 },
//             );
//         }
//     }

//     const handleShowHints = () => {
//         console.log('Show Hints clicked for account sales');
//     };

//     const handleAccept = () => {
//         handleSubmit(onSubmit)();
//     };

//     // Promotions

//     function handleApplyPromotion(appliedPromo: AppliedPromotionDetails, currentCartItems?: AccountSaleCartItem[]) {
//         setAppliedPromotion(appliedPromo);

//         const itemsToUse = currentCartItems ?? cartItems;

//         const selectedPromotion = appliedPromo?.promotion;
//         const promotionType = selectedPromotion?.CompanyStockPromotionType?.code;
//         const qualifyingItems = selectedPromotion?.CompanyStockPromotionItems;

//         let appliedDiscountAmount = 0;
//         const freeQuantity = selectedPromotion?.freeQuantity;

//         const updatedItems = itemsToUse.map((item) => {
//             let updatedItem = { ...item };

//             if (promotionType !== 'SP' && promotionType !== 'BMF') {
//                 delete updatedItem.promotionalPrice;
//             }

//             if (promotionType !== 'B1G1') {
//                 delete updatedItem.freeQuantity;
//             }

//             const promotionalItem = qualifyingItems?.find((qual) => qual?.companyStockDetailId === item.id);

//             // 1) SP && 17) BMF
//             if (promotionalItem && (promotionType === 'SP' || promotionType === 'BMF')) {
//                 const promotionalPrice = +promotionalItem.promotionalPrice || 0;
//                 appliedDiscountAmount += (item.unitPrice - promotionalPrice) * item.quantity;
//                 updatedItem.promotionalPrice = promotionalPrice;
//             }

//             // 2) B1G1
//             if (promotionalItem && promotionType === 'B1G1') {
//                 updatedItem.freeQuantity = freeQuantity;
//             }

//             // 3) B1GDP
//             // 4) B1GDV

//             // 5) B1FRV
//             if (promotionType === 'B1FRV') {
//             }

//             // 6) BIAGIB
//             // 7) BAGA
//             // 8) BIAGDPB

//             // 9) BIAGDPT
//             if (promotionalItem && promotionType === 'BIAGDPT') {
//                 const percent = (selectedPromotion?.discountPercent || 0) / 100;

//                 appliedDiscountAmount += (item.unitPrice * item.quantity - item.discount) * percent;
//             }

//             // 10) BIAGDVT
//             if (promotionType === 'BIAGDVT') {
//                 appliedDiscountAmount = selectedPromotion?.discountValue || 0;
//             }

//             // 11) SRVGDVT
//             // 12) SRVGDPT
//             // 13) SRVGIA
//             // 14) BGFRV
//             // 15) BGGDPGI
//             // 16) BGGDVGI
//             // 18) BMMGGRD
//             // 19) BMMGGPD
//             // 20) BIAGV
//             // 21) BXGCF
//             // 22) BAFRV
//             // 23) STVGDA
//             // 24) STVGDP
//             // 25) BMMGPRV
//             // 26) BGGADV
//             // 27) BGGAPP
//             // 28) BGGAP

//             return updatedItem;
//         });

//         setCartItems(updatedItems);
//         setAppliedPromotionDiscount(appliedDiscountAmount);
//     }

//     useEffect(() => {
//         if (!appliedPromotion) {
//             setAppliedPromotionDiscount(0);
//         }
//     }, [appliedPromotion]);

//     return (
//         <PageLoader
//             isLoading={
//                 isAccountSalePending ||
//                 isQuotationPending ||
//                 isSaleOrderPending
//                 // isApplyPromotionPending
//                 // isValidatePromotionPending
//             }
//         >
//             <div
//                 className={`flex flex-col ${
//                     asType === 'SALES_ORDER'
//                         ? COLOR_CODES_FOR_INVOICE_FORMS?.SALE_ORDER
//                         : asType === 'QUOTATION'
//                           ? COLOR_CODES_FOR_INVOICE_FORMS?.QUOTATION
//                           : COLOR_CODES_FOR_INVOICE_FORMS?.INVOICE
//                 }`}
//             >
//                 <h1 className="px-4 py-2 text-2xl font-bold capitalize">
//                     {asType?.toLowerCase()?.replaceAll('_', ' ')}
//                 </h1>
//                 <Form {...form}>
//                     <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
//                         <InvoiceDetailsForm
//                             control={control}
//                             setValue={setValue}
//                             selectedDebtor={selectedDebtor}
//                             setSelectedDebtor={setSelectedDebtor}
//                             isOnline={isOnline}
//                             onSelectRep={(rep) => setSelectedRep(rep)}
//                             selectedRep={selectedRep}
//                             asType={asType}
//                             setASType={setASType}
//                             isEmptyCart={cartItems.length !== 0}
//                             isInclusivePrice={isInclusivePrice}
//                             appliedPromotionDiscount={appliedPromotionDiscount}
//                         >
//                             {selectedDebtor && isOnline && goodsTotal !== 0 && (
//                                 <div className="flex flex-col items-end">
//                                     {asType === 'INVOICE' && loyaltyPointRes ? (
//                                         <div className="flex !h-max items-center gap-2">
//                                             <div className="w-28 shrink-0 text-xs"></div>

//                                             <div className="mt-2 flex w-full items-center justify-end">
//                                                 <Badge className="gap-2 bg-green-600 text-xs">
//                                                     {loyaltyPointRes?.redeemPointsApplied} point
//                                                     {loyaltyPointRes?.redeemPointsApplied <= 1 ? '' : 's'} redeemed
//                                                     <Button
//                                                         variant="ghost"
//                                                         size="icon"
//                                                         onClick={() => setLoyaltyPointRes(null)}
//                                                         className="h-max w-max !p-0 text-red-700 hover:bg-transparent"
//                                                     >
//                                                         <X size="sm" />
//                                                     </Button>
//                                                 </Badge>
//                                             </div>
//                                         </div>
//                                     ) : (
//                                         <Button
//                                             type="button"
//                                             variant="link"
//                                             className="!px-0 text-xs"
//                                             onClick={(e) => setIsLoyaltyRedemptionOpen(true)}
//                                         >
//                                             Redeem Loyalty Points?
//                                         </Button>
//                                     )}

//                                     {appliedPromotion ? (
//                                         <div className="flex !h-max items-center gap-2">
//                                             <div className="w-28 shrink-0 text-xs"></div>

//                                             <div className="mt-2 flex w-full items-center justify-end">
//                                                 <Badge className="gap-2 bg-green-600 text-xs">
//                                                     {appliedPromotion?.promotion?.promotionDescription} (
//                                                     {appliedPromotion?.promotion?.promotionBatchCode})
//                                                     <Button
//                                                         variant="ghost"
//                                                         size="icon"
//                                                         onClick={() => setAppliedPromotion(null)}
//                                                         className="h-max w-max !p-0 text-red-700 hover:bg-transparent"
//                                                     >
//                                                         <X size="sm" />
//                                                     </Button>
//                                                 </Badge>
//                                             </div>
//                                         </div>
//                                     ) : (
//                                         <Button
//                                             type="button"
//                                             variant="link"
//                                             className="!px-0 text-xs"
//                                             onClick={(e) => setIsApplyPromotionOpen(true)}
//                                         >
//                                             Apply Promotion
//                                         </Button>
//                                     )}
//                                 </div>
//                             )}
//                         </InvoiceDetailsForm>

//                         <div className="mt-4 flex-1 overflow-hidden">
//                             <div className="h-full overflow-y-auto">
//                                 <FormField
//                                     control={form.control}
//                                     name="items"
//                                     render={({ fieldState }) => {
//                                         const itemError =
//                                             fieldState.error && Array.isArray(fieldState.error)
//                                                 ? fieldState.error
//                                                 : null;

//                                         return (
//                                             <ListOnlyTable
//                                                 columns={cartColumns}
//                                                 data={displayCartItems}
//                                                 staticTable={true}
//                                                 itemError={itemError}
//                                             />
//                                         );
//                                     }}
//                                 />
//                             </div>

//                             {/* Display cart items validation error */}
//                             {errors.items && (
//                                 <div className="px-4 py-2">
//                                     <p className="text-xs text-red-500">{errors.items.message}</p>
//                                 </div>
//                             )}
//                         </div>

//                         <AcceptHintActions onShowHints={handleShowHints} onAccept={handleAccept} />
//                     </form>
//                 </Form>

//                 {(isProductSelectionOpen || scannedBarcode) && (
//                     <ProductSelection
//                         isOpen={isProductSelectionOpen}
//                         onClose={onProductSelectionClose}
//                         onSelectProduct={handleSelectProduct}
//                         companyDebtorId={companyDebtorId}
//                         key={companyDebtorId }
//                         isOnline={isOnline}
//                         isEmptyStockValidation={true}
//                         autoSelectWithPrice =  {true}
//                         scannedBarcode={scannedBarcode}
//                         setScannedBarcode={setScannedBarcode}
//                         // onSelectSerialNumber={handleSelectSerialNumber}
//                         // isSerialNumberOpen={isSerialNumberModalOpen}
//                         // setIsSerialNumberOpen={setIsSerialNumberModalOpen}
//                     />
//                 )}

//                 {printData && <AccountSalesInvoiceDialog printData={printData} onClose={() => setPrintData(null)} />}

//                 {isPriceLevelSelectionOpen && editingPriceLevelItem && (
//                     <PriceLevelDialog
//                         isOpen={isPriceLevelSelectionOpen}
//                         onClose={() => {
//                             setIsPriceLevelSelectionOpen(false);
//                             setEditingPriceLevelItem('');
//                         }}
//                         onSelectPriceLevel={handleSelectPriceLevel}
//                         companyStockDetailId={editingPriceLevelItem}
//                         isOnline={isOnline}
//                     />
//                 )}

//                 {isInventoryZero && !supervisorDetails && (
//                     <SupervisorLogin
//                         open={isInventoryZero}
//                         onClose={() => setIsInventoryZero(false)}
//                         onSuccess={(user) => setSupervisorDetails(user)}
//                     />
//                 )}

//                 <BarcodeScanner onScan={handleScannedProduct} active={true} />

//                 {isLoyaltyRedemptionOpen && asType === 'INVOICE' && selectedDebtor && goodsTotal !== 0 && (
//                     <LoyaltyPointsRedemption
//                         open={isLoyaltyRedemptionOpen}
//                         onClose={() => setIsLoyaltyRedemptionOpen(false)}
//                         debtorId={selectedDebtor?.id}
//                         totalAmount={watch('goodsTotal')}
//                         onApply={(val) => setLoyaltyPointRes(val)}
//                         saleType="ACCOUNT_SALE"
//                     />
//                 )}

//                 {isApplyPromotionOpen && goodsTotal !== 0 && cartItems?.length !== 0 && (
//                     <PromotionDialog
//                         isOpen={isApplyPromotionOpen}
//                         onClose={() => setIsApplyPromotionOpen(false)}
//                         onApplyPromotion={handleApplyPromotion}
//                         cartItems={cartItems?.map((item) => ({
//                             companyStockDetailId: item.id,
//                             quantity: item.quantity,
//                         }))}
//                     />
//                 )}
//             </div>
//         </PageLoader>
//     );
// };

// export default AccountSales;
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import InvoiceDetailsForm from './invoice-details-form';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { ListOnlyTable } from '@/components/list-only-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField } from '@/components/ui/form';
import { ChevronDown, CreditCard, Loader2, MinusIcon, PlusIcon, Trash2Icon, X } from 'lucide-react';
import { ProductSelection } from '../../hoc/product-selection';
import { PriceLevelDialog } from '../../hoc/price-level-dialog';
import { toast } from 'sonner';
import moment from 'moment-timezone';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SupervisorLogin from '../../hoc/supervisor-login';
import BarcodeScanner from '../../hoc/bar-code-scanner';
import LoyaltyPointsRedemption from '../../hoc/loyalty-points-redemption';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// ADDED: needed to render the COD tender-type popup that now lives in this component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TenderDetails, useGetTenders, useGetTendersOffline } from '@/api-queries/point-of-sale/tenders';
import { TENDER_TYPES } from '@/lib/constant';

import {
    AccountSaleCartItem,
    useCreateAccountSale,
    CartItemReponse,
    AccountSalesDetails,
    GetAccountSaleResponse,
    AccountSaleCreateSchema,
    useQuantityRecommendation,
    type QuantityRecommendationItem,
    type AccountSaleApprovalTokens,
} from '@/api-queries/point-of-sale/account-sales/account-sales';
import { useResolvePricingMatrix } from '@/api-queries/pricing-policy';
import {
    SaleOrderCreateSchema,
    useCreateSaleOrder,
    useGetSaleOrderById,
    type SaleOrdersDetails,
} from '@/api-queries/point-of-sale/account-sales/sale-order';
import { QuotationCreateSchema, useCreateQuotation } from '@/api-queries/point-of-sale/account-sales/quotations';
import { CompanyStockDetailsListResponse, StockDetails } from '@/api-queries/company/stock-details';
import { CartItemPricingType } from '@/api-queries/point-of-sale';
import AccountSalesInvoiceDialog from './invoice/invoice-dialog';
import { useAuthUser } from '@/stores/auth-user.store';
import { useNetworkStore } from '@/stores/network.store';
import { useInvoiceCountState } from '@/stores/invoice-count.store';
import { getDBData, setDBData } from '@/offline/db';
import { calculateTaxDetails, cleanDataPayload, generateUUIDForData, getApiKey, getIDBKey } from '@/utils/helpers';
import { apiUrls } from '@/api-queries';
import { CompanyCreditor } from '@/types';
import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
import { useQueryClient } from '@tanstack/react-query';
import {
    AccountSaleSchemaByType,
    accountSaleSchemaMap,
    AccountSalesType,
    AnyAccountSale,
    AnyInvoiceType,
} from '@/api-queries/point-of-sale/account-sales/types';
import { UserDetails } from '@/api-queries/user';
import { LoyaltyPointRedemptionDetails } from '@/api-queries/loyalty';
import {
    getStockDispositionById,
    isSellableNST,
    matchDispositionSaleError,
    nstAllowsPromotionStacking,
    nstNotSellableReason,
    nstVersion,
    parseNSTLabelScan,
    verifyNSTLinesForCheckout,
    type StockDisposition,
} from '@/api-queries/nst';
import NSTPickerDialog from '@/modules/common/nst/nst-picker-dialog';
import { PromotionDialog } from '../../hoc/promotion-dialog';
import { getApplicableDiscount } from '@/api-queries/quantity-wise-discount';
import { COLOR_CODES_FOR_INVOICE_FORMS } from '@/lib/constant';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import OverrideReasonDialog from '@/components/approval/override-reason-dialog';
import { useOverrideReason } from '@/hooks/use-override-reason';
import { useCheckCashOfficePaymentRouting, CashOfficePaymentRoutingResult } from '@/api-queries/cash-office';
import { useRouter } from 'next/router';
import { ManualDiscountInput } from '@/components/custom-components/manual-discount-input';
import {
    getAutomaticDiscountAmount,
    getManualDiscountAmount,
    getManualDiscountValue,
    hasManualDiscount,
    toManualDiscountPayload,
    withManualDiscount,
} from '@/lib/manual-discount';

import {
    AppliedPromotionDetails,
    EvaluatePromotionData,
    EvaluatePromotionLine,
    useEvaluatePromotion,
} from '@/api-queries/promotions';

// ADDED: mirrors the shape used by the (now removed) inline COD block in InvoiceDetailsForm
interface PaymentSplitRow {
    rowId: string;
    tenderTypeId: string;
    tenderType: string;
    description: string;
    amount: string;
    remarks: string;
}

// A cart row enriched with the server-evaluated values used for display only.
type AccountSaleDisplayItem = AccountSaleCartItem & {
    evaluationLine?: EvaluatePromotionLine;
    evaluatedPromotionalPrice?: number;
    evaluatedLineTotal?: number;
    evaluatedDiscount?: number;
    evaluatedFreeQuantity?: number;
    // Display-only rows for free promotion rewards. They are never added to the
    // cart state; the submit payload builds its own reward lines from the offer.
    isFreeRewardRow?: boolean;
};

const AccountSales = () => {
    const router = useRouter();
    const [asType, setASType] = useState<AccountSalesType>('INVOICE');
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);

    const isOnline = useNetworkStore((state) => state?.online);
    const { asInvoiceCount, setASInvoiceCount } = useInvoiceCountState();
    const [loadingRowId, setLoadingRowId] = useState<string | null>(null);

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const terminalId = useAuthUser((state) => (state as any)?.terminalId);

    const authUser = useAuthUser((state) => state.user);

    const { mutate: createAccountSale, isPending: isAccountSalePending } = useCreateAccountSale(isOnline);
    const { mutate: createSaleOrder, isPending: isSaleOrderPending } = useCreateSaleOrder(isOnline);
    const { mutate: createQuotation, isPending: isQuotationPending } = useCreateQuotation(isOnline);
    const { mutate: checkCashOfficePaymentRouting } = useCheckCashOfficePaymentRouting();

    // Quantity Override state
    const recommendationMutation = useQuantityRecommendation();
    const pricingMatrixMutation = useResolvePricingMatrix();
    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const { overrideReasonOpen, askReason, closeOverrideReason, clearReason } = useOverrideReason();
    const overrideReasonRef = useRef<string | null>(null);
    const [recommendedItems, setRecommendedItems] = useState<Map<string, QuantityRecommendationItem>>(new Map());
    const [hasDiscountOverride, setHasDiscountOverride] = useState(false);
    const hasDiscountOverrideRef = useRef(false);
    const pendingApprovalRef = useRef<{
        payload: AccountSaleCreateSchema;
        approvedTokens: AccountSaleApprovalTokens;
        isOnline: boolean;
    } | null>(null);

    const cartItemsRef = useRef<AccountSaleCartItem[]>([]);

    // Server-side promotion evaluation. The backend prices the whole basket and returns the
    // applicable promotions, discounts and free-item offers; the client only maps them onto
    // the cart and forwards them on create. A monotonically increasing id discards responses
    // from a superseded request so a slow reply can never overwrite a newer cart state.
    const { mutate: evaluatePromotions } = useEvaluatePromotion();
    const evaluateRequestIdRef = useRef(0);
    const [evaluation, setEvaluation] = useState<EvaluatePromotionData | null>(null);
    const [skippedLines, setSkippedLines] = useState<Array<{ lineKey: string; reason: string; stockDispositionId?: string }>>(
        [],
    );

    function useDocumentForm(asType: keyof typeof accountSaleSchemaMap) {
        const schema = accountSaleSchemaMap[asType];

        const defaultValues: Record<string, any> = {
            companyDebtorId: '',
            name: '',
            address: '',
            telephone: '',
            email: '',
            taxNumber: 0,
            documentGpPercentage: 0,
            goodsTotal: 0,
            discountAmount: 0,
            taxAmount: 0,
            totalQuantity: 0,
            totalFreeQuantity: 0,
            timezone: moment.tz.guess(),
            items: [],
            payments: [],
        };

        if (asType === 'INVOICE') {
            Object.assign(defaultValues, {
                invoiceDiscountPercentage: 0,
                invoiceDate: new Date().toISOString().split('T')[0],
                invoiceNumber: '',
                invoiceInclusive: 'Yes',
            });
        }

        if (asType === 'SALES_ORDER') {
            Object.assign(defaultValues, {
                salesOrderDate: new Date().toISOString().split('T')[0],
                salesOrderNumber: '',
                salesOrderInclusive: 'Yes',
                salesOrderEstimatedDate: '',
            });
        }

        if (asType === 'QUOTATION') {
            Object.assign(defaultValues, {
                quotationDate: new Date().toISOString().split('T')[0],
                quotationNumber: '',
                quotationInclusive: 'Yes',
            });
        }

        const form = useForm<AccountSaleSchemaByType<typeof asType>>({
            resolver: zodResolver(schema),
            defaultValues,
        });

        return form;
    }

    const form = useDocumentForm(asType);

    const {
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors },
    } = form;

    const [cartItems, setCartItems] = useState<AccountSaleCartItem[]>([]);

    const setCartItemsAndRef = (
        updater: AccountSaleCartItem[] | ((prev: AccountSaleCartItem[]) => AccountSaleCartItem[]),
    ) => {
        if (typeof updater === 'function') {
            setCartItems((prev) => {
                const next = updater(prev);
                cartItemsRef.current = next;
                return next;
            });
        } else {
            cartItemsRef.current = updater;
            setCartItems(updater);
        }
    };

    const [isApplyPromotionOpen, setIsApplyPromotionOpen] = useState(false);
    const [appliedPromotion, setAppliedPromotion] = useState<AppliedPromotionDetails | null>(null);
    const [appliedPromotionDiscount, setAppliedPromotionDiscount] = useState<number | 0>(0);

    const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
    console.log('product selection dialog', isProductSelectionOpen);
    const [isSerialNumberModalOpen, setIsSerialNumberModalOpen] = useState(false);

    const [selectedDebtor, setSelectedDebtor] = useState<CompanyCreditor | null>(null);
    const [selectedRep, setSelectedRep] = useState<SalesRepresentativeDetails | null>(null);
    const [isDebtorSelected, setIsDebtorSelected] = useState(false);
    const [isPriceLevelSelectionOpen, setIsPriceLevelSelectionOpen] = useState(false);

    const [isInventoryZero, setIsInventoryZero] = useState(false);
    const [supervisorDetails, setSupervisorDetails] = useState<UserDetails | null>(null);

    const [loyaltyPointRes, setLoyaltyPointRes] = useState<LoyaltyPointRedemptionDetails | null>(null);
    const [isLoyaltyRedemptionOpen, setIsLoyaltyRedemptionOpen] = useState(false);

    const [printData, setPrintData] = useState<AnyInvoiceType | null>(null);
    const [pendingPrintData, setPendingPrintData] = useState<AnyInvoiceType | null>(null);
    const [showPrintPrompt, setShowPrintPrompt] = useState(false);

    // ADDED: controls the new "COD Payment" popup that intercepts submission for COD debtors
    const [isCodPaymentDialogOpen, setIsCodPaymentDialogOpen] = useState(false);
    // Payment routing: when the created invoice's outstanding amount exceeds the Cash Office
    // threshold, the payment must be collected at the Cash Office, not at the POS.
    const [cashOfficeRouting, setCashOfficeRouting] = useState<{
        result: CashOfficePaymentRoutingResult;
        invoice: AccountSalesDetails;
    } | null>(null);
    // ----------------- Modals End -----------------

    const companyDebtorId = watch('companyDebtorId');

    useEffect(() => {
        setIsDebtorSelected(!!companyDebtorId);
    }, [companyDebtorId]);

    // --------------------------------------- SERVER PROMOTION EVALUATION ---------------------------------------
    // Each cart row is sent under a stable lineKey so the evaluated lines, applications and
    // free-item offers can be mapped back onto the matching cart row. Only the composition
    // (id, quantity, pricing type) is part of the key, so overlaying evaluated display values
    // onto the cart never re-triggers the request.
    const evaluateItems = useMemo(
        () =>
            cartItems.map((item, index) => ({
                lineKey: `line-${index + 1}`,
                companyStockDetailId: item.id,
                quantity: item.quantity,
                ...(item.companyStockPricingId || item.selectedPricing?.id
                    ? { companyStockPricingId: item.companyStockPricingId || item.selectedPricing?.id }
                    : {}),
                ...(item.companyStockPricingTypeId
                    ? { companyStockPricingTypeId: item.companyStockPricingTypeId }
                    : {}),
                ...(item.stockDispositionId
                    ? {
                        stockDispositionId: item.stockDispositionId,
                        stockDispositionVersion: item.stockDispositionVersion ?? 1,
                      }
                    : {}),
                ...toManualDiscountPayload(item),
            })),
        [cartItems],
    );
    const evaluateItemsKey = useMemo(() => JSON.stringify(evaluateItems), [evaluateItems]);
    const loyaltyCardNumber = loyaltyPointRes?.loyaltyCardNumber || '';

    useEffect(() => {
        if (!isOnline || !companyDebtorId || evaluateItems.length === 0) {
            setEvaluation(null);
            return;
        }

        const requestId = ++evaluateRequestIdRef.current;
        const timer = setTimeout(() => {
            evaluatePromotions(
                {
                    transactionType: 'ACCOUNT_SALE',
                    companyDebtorId,
                    ...(authUser?.warehouseId ? { companyWarehouseId: authUser.warehouseId } : {}),
                    ...(loyaltyCardNumber ? { loyaltyCardNumber } : {}),
                    items: evaluateItems,
                },
                {
                    onSuccess: (data: any) => {
                        if (requestId !== evaluateRequestIdRef.current) return;
                        setEvaluation(data?.data ?? null);
                        if (data?.data?.skippedLines) {
                            setSkippedLines(data.data.skippedLines);
                        }
                    },
                    onError: () => {
                        if (requestId !== evaluateRequestIdRef.current) return;
                        setEvaluation(null);
                    },
                },
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [evaluateItemsKey, companyDebtorId, loyaltyCardNumber, isOnline, authUser?.warehouseId]);

    const evaluationLineByKey = useMemo(
        () => new Map((evaluation?.lines ?? []).map((line) => [line.lineKey, line])),
        [evaluation],
    );
    const evaluationDiscount = evaluation ? Number(evaluation.totalDiscount) || 0 : 0;
    const evaluationApplications = evaluation?.applications ?? [];
    const evaluationOffer = evaluation?.freeItemOffers?.[0];
    const evaluationPromotionId = evaluationOffer?.promotionId || evaluationApplications[0]?.promotionId;
    const evaluationPromotionName = evaluationOffer?.promotionName || evaluationApplications[0]?.promotionName;
    const hasFreeRewards = (evaluation?.freeItemOffers?.length ?? 0) > 0;

    // The server's total discount is authoritative; the manual dialog no longer feeds totals.
    useEffect(() => {
        setAppliedPromotionDiscount(evaluationDiscount);
    }, [evaluationDiscount]);

    // Display-only overlay: evaluated prices/totals are shown without mutating the cart,
    // so the manual discount input and the evaluate request keep using the base values.
    const cartItemsForDisplay = useMemo(
        () =>
            cartItems.map((item, index) => {
                const line = evaluationLineByKey.get(`line-${index + 1}`);
                const isPromoPrice = line?.promotionTypeCode === 'SP' || line?.promotionTypeCode === 'BMF';
                return {
                    ...item,
                    evaluationLine: line,
                    evaluatedPromotionalPrice: isPromoPrice ? (line?.finalUnitPrice ?? undefined) : undefined,
                    evaluatedLineTotal: line?.lineTotalAfterDiscounts ?? line?.lineTotal ?? item.lineTotal,
                    evaluatedDiscount: line?.discountAmount ?? item.discount,
                };
            }),
        [cartItems, evaluationLineByKey],
    );

    // Free reward rows from the evaluated offers. Rendered as their own lines so the
    // free item and its quantity are always visible, even when the reward product is
    // not already in the paid cart (buy A get B free). Percentage offers (BIAGDPB) are
    // NOT free: their reward items stay normal cart lines priced by /promotions/evaluate.
    const freeRewardDisplayItems = useMemo<AccountSaleDisplayItem[]>(
        () =>
            (evaluation?.freeItemOffers ?? []).flatMap((offer) =>
                (offer.rewardItems ?? [])
                    .filter((reward) => reward.isFree || (reward.freeQuantity || 0) > 0)
                    .map(
                        (reward, index) =>
                            ({
                                id: `free-${offer.promotionId}-${reward.companyStockDetailId}-${index}`,
                                itemCode: reward.itemCode || '',
                                description: reward.description || '',
                                barcode: '',
                                supplierCode: '',
                                packSize: undefined,
                                onhand: 0,
                                stockOnHand: 0,
                                hasSerialNumber: false,
                                quantity: reward.freeQuantity || 0,
                                freeQuantity: reward.freeQuantity || 0,
                                isFree: true,
                                isFreeRewardRow: true,
                                unitPrice: reward.unitPrice || 0,
                                discount: reward.discountAmount || 0,
                                lineTotal: 0,
                                companyStockPricingId: reward.companyStockPricingId || '',
                                companyStockPricingTypeId: reward.companyStockPricingTypeId || '',
                                companyTaxRateId: reward.companyTaxRateId || '',
                                type: { name: 'Promotion' },
                                selectedPricing: {
                                    id: reward.companyStockPricingId || '',
                                    companyStockPricingTypeId: reward.companyStockPricingTypeId || '',
                                    priceInclusive: reward.unitPrice || 0,
                                    priceExclusive: reward.unitPrice || 0,
                                    type: { name: 'Promotion' },
                                },
                                evaluatedFreeQuantity: reward.freeQuantity || 0,
                            }) as unknown as AccountSaleDisplayItem,
                    ),
            ),
        [evaluation],
    );
    // --------------------------------------- END SERVER PROMOTION EVALUATION ---------------------------------------

    // --------------------------------------- CREATE INVOICE FROM SALE ORDER ---------------------------------------
    // When routed here from a POS sale order ("Create Invoice"), the order id arrives as a
    // query param. The order is loaded once and its debtor and lines are prefilled; each line
    // keeps its own salesOrderItemId so the backend links the invoiced line back to the order
    // (and marks it invoiced) instead of using a separate update call.
    const sourceSaleOrderId = typeof router.query.saleOrderId === 'string' ? router.query.saleOrderId : '';
    const prefilledSaleOrderRef = useRef<string | null>(null);
    const { data: sourceSaleOrderRes } = useGetSaleOrderById(sourceSaleOrderId);

    useEffect(() => {
        const order: SaleOrdersDetails | undefined = sourceSaleOrderRes?.data;
        if (!sourceSaleOrderId || !order || prefilledSaleOrderRef.current === sourceSaleOrderId) return;
        prefilledSaleOrderRef.current = sourceSaleOrderId;

        if (order.CompanyDebtor) {
            const debtor = order.CompanyDebtor;
            setSelectedDebtor(debtor);
            setValue('companyDebtorId', debtor.id);
            setValue('name', debtor.name || '');
            setValue('address', debtor.postalAddress || debtor.deliveryAddress || '');
            setValue('telephone', debtor.cellphoneNumber || '');
            setValue('email', debtor.emailAddress || '');
            setValue('taxNumber', Number(debtor.preferredTaxRate) || 0);
        }

        if (order.orderNumber) setValue('orderNumber', order.orderNumber);
        if (order.internalOrderNo) setValue('internalOrderNo', order.internalOrderNo);
        if (order.deliveryMethod) setValue('deliveryMethod', order.deliveryMethod);
        if (order.deliveryNoteNumber) setValue('deliveryNoteNumber', order.deliveryNoteNumber);
        if (order.representativeId) setValue('representativeId', order.representativeId);
        if (order.SalesRepresentative) setSelectedRep(order.SalesRepresentative);

        const prefilledItems = (order.salesOrderItems ?? []).flatMap((soItem) => {
            const detail = soItem.CompanyStockDetail;
            if (!detail?.id) return [];
            const unitPrice = soItem.unitPrice ?? 0;
            const quantity = soItem.quantity || 1;
            const pricingType = soItem.type || { name: '' };
            const hasManualMetadata =
                soItem.manualDiscountAmount !== undefined || soItem.discountPercentage !== undefined;
            const manualValue = getManualDiscountValue({
                manualDiscountType: soItem.manualDiscountType,
                manualDiscountAmount: soItem.manualDiscountAmount,
                discountPercentage: soItem.discountPercentage,
            });
            const manualAmount = hasManualMetadata
                ? getManualDiscountAmount(
                      {
                          manualDiscountType: manualValue.mode,
                          manualDiscountAmount: manualValue.amount,
                          discountPercentage: manualValue.percentage,
                      },
                      unitPrice * quantity,
                  )
                : Math.min(Math.max(soItem.discount || 0, 0), unitPrice * quantity);
            const selectedPricing: CartItemPricingType = {
                id: soItem.companyStockPricingId || '',
                companyStockPricingTypeId: soItem.companyStockPricingTypeId || '',
                priceInclusive: unitPrice,
                priceExclusive: unitPrice,
                type: pricingType,
            };
            return [
                {
                    ...detail,
                    quantity,
                    discount: manualAmount,
                    manualDiscountType: hasManualMetadata ? manualValue.mode : 'AMOUNT',
                    manualDiscountAmount: hasManualMetadata ? manualValue.amount : manualAmount,
                    discountPercentage: hasManualMetadata ? manualValue.percentage : 0,
                    unitPrice,
                    lineTotal: unitPrice * quantity - manualAmount,
                    companyStockPricingId: soItem.companyStockPricingId,
                    companyStockPricingTypeId: soItem.companyStockPricingTypeId,
                    type: pricingType,
                    selectedPricing,
                    salesOrderItemId: soItem.id || soItem.salesOrderItemId,
                } as AccountSaleCartItem,
            ];
        });

        setCartItemsAndRef(prefilledItems);
    }, [sourceSaleOrderRes, sourceSaleOrderId, setValue]);
    // --------------------------------------- END CREATE INVOICE FROM SALE ORDER ---------------------------------------

    const isCodDebtor = useMemo(() => {
        const terms = `${(selectedDebtor as any)?.terms || ''}`.trim().toUpperCase();
        const paymentMethod =
            `${(selectedDebtor as any)?.CompanyCreditorSetting?.paymentMethod || (selectedDebtor as any)?.paymentMethod || ''}`
                .trim()
                .toUpperCase();
        return (
            terms === 'COD' ||
            terms === 'C.O.D' ||
            terms === 'C.O.D.' ||
            terms === 'CASH ON DELIVERY' ||
            terms.includes('COD') ||
            paymentMethod === 'COD' ||
            paymentMethod.includes('COD')
        );
    }, [selectedDebtor]);

    const [editingPriceLevelItem, setEditingPriceLevelItem] = useState<string>('');

    // --------------------------------------- QUANTITY OVERRIDE ---------------------------------------
    const hasQuantityOverride = useMemo(() => {
        return cartItems.some((item) => {
            const rec = recommendedItems.get(item.id);
            return rec && rec.overrideRequired;
        });
    }, [cartItems, recommendedItems]);

    const fetchQuantityRecommendations = useCallback(() => {
        const debtorId = form.getValues('companyDebtorId');
        if (!debtorId || !cartItems.length) return;

        recommendationMutation.mutate(
            {
                companyDebtorId: debtorId,
                items: cartItems.map((item) => ({
                    companyStockDetailId: item.id,
                    quantity: item.quantity,
                })),
            },
            {
                onSuccess: (response) => {
                    const items: QuantityRecommendationItem[] = response?.data?.items || [];
                    if (!items.length) return;
                    const newMap = new Map<string, QuantityRecommendationItem>();
                    items.forEach((item) => newMap.set(item.companyStockDetailId, item));
                    setRecommendedItems(newMap);
                },
                onError: () => {},
            },
        );
    }, [cartItems, recommendationMutation, form]);

    // Auto-fetch recommendations when cart items or debtor change
    useEffect(() => {
        const debtorId = form.getValues('companyDebtorId');
        if (!debtorId || !cartItems.length) {
            setRecommendedItems(new Map());
            return;
        }
        const timer = setTimeout(fetchQuantityRecommendations, 500);
        return () => clearTimeout(timer);
    }, [cartItems, companyDebtorId]);

    const generateSecurityReference = (): string => {
        return `ASQR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    };
    // --------------------------------------- END QUANTITY OVERRIDE ---------------------------------------

    // --------------------------------------- DISCOUNT / PRICE OVERRIDE ---------------------------------------
    const isItemDiscounted = (item: AccountSaleCartItem) => {
        // An NST line's discount is backend-authorised; it never counts as an override.
        if (item.stockDispositionId) return false;
        if (item.isDiscountOverride || item.discountOverride) return true;
        return (item.discount || 0) > 0 || (item.dispositionDiscountAmount || 0) > 0;
    };

    const isItemPriceOverridden = (item: AccountSaleCartItem) => {
        // An NST line's unit price is the fixed discounted price; never an override.
        if (item.stockDispositionId) return false;
        if (item.isPriceOverride || item.priceOverride) return true;
        const basePrice = item.selectedPricing?.priceInclusive;
        if (basePrice === undefined || basePrice === null) return false;
        return Number(item.unitPrice) !== Number(basePrice);
    };

    const invoiceDiscountPercentage = watch('invoiceDiscountPercentage');

    // Resolve is only needed when the invoice actually carries a discount or a
    // changed/overridden price. A plain invoice on the backend price with zero
    // discount can skip it (checkout still re-checks as a safety net).
    const hasPricingOverride = useMemo(() => {
        const hasDocumentDiscount =
            Number(invoiceDiscountPercentage || 0) > 0 ||
            Number(appliedPromotionDiscount || 0) > 0 ||
            Number(loyaltyPointRes?.redeemableValue || 0) > 0;
        const hasLineOverride = cartItems.some((item) => isItemDiscounted(item) || isItemPriceOverridden(item));
        return hasDocumentDiscount || hasLineOverride;
    }, [cartItems, invoiceDiscountPercentage, appliedPromotionDiscount, loyaltyPointRes]);

    const checkPricingMatrixOverrides = async () => {
        const debtorId = form.getValues('companyDebtorId');
        const items = cartItemsRef.current;
        if (!debtorId || !items.length) {
            hasDiscountOverrideRef.current = false;
            setHasDiscountOverride(false);
            return false;
        }

        try {
            const evaluationDiscount = typeof evaluation?.totalDiscount === 'number' ? evaluation.totalDiscount : 0;
            const evaluationPromotionId = evaluationOffer?.promotionId || evaluationApplications[0]?.promotionId;

            const cartItemsForResolve = items.flatMap((item) => [
                {
                    companyStockDetailId: item.id,
                    ...(item.companyStockPricingId ? { companyStockPricingId: item.companyStockPricingId } : {}),
                    ...(item.companyStockPricingTypeId
                        ? { companyStockPricingTypeId: item.companyStockPricingTypeId }
                        : {}),
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: getAutomaticDiscountAmount(item, (item.unitPrice || 0) * item.quantity),
                    ...toManualDiscountPayload(item),
                    isDiscountOverride: isItemDiscounted(item),
                    isPriceOverride: isItemPriceOverridden(item),
                    ...(item.selectedPricing?.priceInclusive !== undefined
                        ? { originalUnitPrice: item.selectedPricing.priceInclusive }
                        : {}),
                    ...(item.salesOrderItemId ? { salesOrderItemId: item.salesOrderItemId } : {}),
                },
            ]);

            const rewardLinesForResolve = (evaluation?.freeItemOffers ?? []).flatMap((offer) =>
                offer.rewardItems.map((reward) => ({
                    companyStockDetailId: reward.companyStockDetailId,
                    ...(reward.companyStockPricingId ? { companyStockPricingId: reward.companyStockPricingId } : {}),
                    ...(reward.companyStockPricingTypeId
                        ? { companyStockPricingTypeId: reward.companyStockPricingTypeId }
                        : {}),
                    quantity: 0,
                    freeQuantity: reward.freeQuantity,
                    isFree: true,
                    unitPrice: reward.unitPrice || 0,
                    discount: reward.discountAmount || 0,
                })),
            );

            const resolveItems = [...cartItemsForResolve, ...rewardLinesForResolve];

            const response = await pricingMatrixMutation.mutateAsync({
                transactionType: 'ACCOUNT_SALE',
                companyDebtorId: debtorId,
                buyer: { companyDebtorId: debtorId },
                ...(authUser?.warehouseId ? { companyWarehouseId: authUser.warehouseId } : {}),
                ...(authUser?.id ? { userId: authUser.id } : {}),
                ...(authUser?.companyUserGroups?.[0]?.groupId
                    ? { groupId: authUser.companyUserGroups[0].groupId }
                    : {}),
                // Promotions travel in their own payload fields. Keep the manual header
                // discount separate so it is never sent as a combined promotion value.
                discountAmount: items.reduce(
                    (sum, item) =>
                        sum + (hasManualDiscount(item) ? getManualDiscountAmount(item, (item.unitPrice || 0) * item.quantity) : item.discount || 0),
                    0,
                ),
                items: resolveItems,
                ...(evaluationPromotionId ? { promotionId: evaluationPromotionId } : {}),
                ...(evaluationApplications.length
                    ? { promotionApplications: evaluationApplications as any }
                    : {}),
                ...(evaluation?.freeItemOffers?.length
                    ? { freeItemOffers: evaluation.freeItemOffers as any }
                    : {}),
                ...(sourceSaleOrderId ? { linkedSalesOrderId: sourceSaleOrderId, salesOrderId: sourceSaleOrderId } : {}),
            });
            const requiredActions = response?.requiredActions || [];
            const hasQuantityOverrideRequired = requiredActions.includes('ACCOUNT_SALE_QUANTITY_OVERRIDE');
            const hasDiscountOverrideRequired = requiredActions.includes('ACCOUNT_SALE_DISCOUNT_OVERRIDE');
            hasDiscountOverrideRef.current = hasDiscountOverrideRequired || hasQuantityOverrideRequired;
            setHasDiscountOverride(hasDiscountOverrideRequired || hasQuantityOverrideRequired);
            return hasDiscountOverrideRequired || hasQuantityOverrideRequired;
        } catch {
            hasDiscountOverrideRef.current = false;
            setHasDiscountOverride(false);
            return false;
        }
    };

    useEffect(() => {
        const debtorId = form.getValues('companyDebtorId');
        if (!debtorId || !cartItems.length || !hasPricingOverride) {
            hasDiscountOverrideRef.current = false;
            setHasDiscountOverride(false);
            return;
        }

        const timer = setTimeout(() => {
            void checkPricingMatrixOverrides();
        }, 200);

        return () => clearTimeout(timer);
    }, [
        cartItems,
        companyDebtorId,
        hasPricingOverride,
        evaluation,
        evaluationApplications,
        evaluationOffer,
        appliedPromotionDiscount,
        loyaltyPointRes,
        authUser,
        sourceSaleOrderId,
    ]);
    // --------------------------------------- END DISCOUNT / PRICE OVERRIDE ---------------------------------------

    useEffect(() => {
        const formattedCartItems: CartItemReponse[] = cartItems.map((item) => ({
            companyStockDetailId: item.id,
            companyStockPricingId: item?.companyStockPricingId || '',
            companyStockPricingTypeId: item?.companyStockPricingTypeId || '',
            companyTaxRateId: item?.companyTaxRateId || '',
            quantity: item.quantity,
            // Manual discount travels in its own fields; keep the legacy discount field for
            // automatic/legacy values only so the backend never subtracts it twice.
            discount: getAutomaticDiscountAmount(item, (item.unitPrice || 0) * item.quantity),
            ...toManualDiscountPayload(item),
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            ...(item.stockDispositionId
                ? {
                      stockDispositionId: item.stockDispositionId,
                      stockDispositionVersion: item.stockDispositionVersion ?? 1,
                  }
                : {}),
        }));

        setValue('items', formattedCartItems);
    }, [cartItems, setValue, editingPriceLevelItem]);

    const calculateLineTotal = (item: AccountSaleCartItem) => {
        return item.unitPrice * item.quantity - item.discount;
    };

    const isInclusivePrice =
        asType === 'SALES_ORDER'
            ? watch('salesOrderInclusive') === 'Yes'
            : asType === 'QUOTATION'
              ? watch('quotationInclusive') === 'Yes'
              : watch('invoiceInclusive') === 'Yes';

    // A normal sale never touches the NST API. The allocation is loaded only when the
    // cashier picks the near-expiry option on a line, and re-checked before submit. The
    // sale picker explicitly scopes its lookup to company/DC or this authorized store.
    const nstInventoryScope = authUser?.userType === 'COMPANY-DEBTOR-USER' ? 'STORE' : 'COMPANY';
    const nstCompanyDebtorId =
        nstInventoryScope === 'STORE' ? authUser?.companyDebtorId || null : null;
    const [nstPickerLine, setNstPickerLine] = useState<AccountSaleCartItem | null>(null);
    // Opens the "Add Discounted Stock" picker (all sellable allocations, no cart line).
    const [nstAllOpen, setNstAllOpen] = useState(false);
    // Blocks promotions for the whole basket once a selected line's rule disallows stacking.
    const nstBlocksPromotionsRef = useRef(false);

    // Re-evaluates the promotion guard against the live basket: the block only holds while
    // a line whose rule forbids stacking is actually present, so removing the line (or
    // clearing the allocation) lifts the refusal immediately.
    useEffect(() => {
        nstBlocksPromotionsRef.current = cartItems.some(
            (item) => item.stockDispositionId && item.dispositionAllowPromotionStacking === false,
        );
    }, [cartItems]);

    // Applies (or clears) the near-expiry allocation on one cart line. A normal line keeps
    // no stockDispositionId at all, so the payload stays a plain product line.
    const applyDispositionToLine = useCallback((line: AccountSaleCartItem, d: StockDisposition | null) => {
        setCartItemsAndRef((prevItems) =>
            prevItems.map((item) => {
                if (item.id !== line.id || item.selectedSerialNumber !== line.selectedSerialNumber) return item;
                const baseUnitPrice = item.originalUnitPrice ?? item.selectedPricing?.priceInclusive ?? item.unitPrice;
                // The backend owns the discounted price. When it has not priced the
                // allocation there is nothing safe to attach, so clear the line rather
                // than recompute the price from the rule's discount.
                const unitPrice = d ? (d.discountedUnitPrice ?? d.unitPrice) : undefined;
                if (!d || !isSellableNST(d) || unitPrice == null || unitPrice <= 0) {
                    return {
                        ...item,
                        unitPrice: baseUnitPrice,
                        lineTotal: baseUnitPrice * item.quantity,
                        stockDispositionId: undefined,
                        stockDispositionVersion: undefined,
                        dispositionCompanyDebtorId: undefined,
                        dispositionType: undefined,
                        originalUnitPrice: undefined,
                        dispositionDiscountAmount: undefined,
                        dispositionAllowPromotionStacking: undefined,
                    };
                }
                return {
                    ...item,
                    unitPrice,
                    discount: 0,
                    manualDiscountType: 'AMOUNT',
                    manualDiscountAmount: 0,
                    discountPercentage: 0,
                    lineTotal: unitPrice * item.quantity,
                    stockDispositionId: d.id,
                    stockDispositionVersion: nstVersion(d),
                    dispositionCompanyDebtorId: d.companyDebtorId || undefined,
                    dispositionType: d.dispositionType,
                    originalUnitPrice: d.originalUnitPrice ?? baseUnitPrice,
                    dispositionDiscountAmount: Math.round((baseUnitPrice - unitPrice) * 100) / 100,
                    dispositionAllowPromotionStacking: nstAllowsPromotionStacking(d),
                };
            }),
        );
    }, []);

    // Re-reads the chosen allocation before attaching it to the line. The picker list can
    // be stale, so the line always quotes the backend's latest discountedUnitPrice and
    // version, never the normal pricing-type amount.
    const handleNSTSelect = useCallback(
        async (line: AccountSaleCartItem, disposition: StockDisposition) => {
            let fresh = disposition;
            try {
                // Use the selected record's owner (not the buyer) so store-owned NST resolves.
                const res = await getStockDispositionById({
                    id: disposition.id,
                    ...(disposition.companyDebtorId ? { companyDebtorId: disposition.companyDebtorId } : {}),
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
        [applyDispositionToLine],
    );

    const handleSelectProduct = async (
        product: StockDetails,
        companyStockPrice: CartItemPricingType | null,
        scannedBaseQuantity = 1,
    ) => {
        if (!companyStockPrice) {
            toast.error('Invalid pricing! Please choose another product.');
            return;
        }

        setIsProductSelectionOpen(false);
        setScannedBarcode('');

        // A package barcode resolves to the converted base quantity (e.g. one SHRINK scan
        // -> 6 base units). A pack SKU stays at one selling unit because its own conversion
        // already deducts the base units.
        const quantityToAdd = Math.max(1, Number(scannedBaseQuantity) || 1);

        const currentItems = cartItemsRef.current;
        const existingItemIndex = currentItems.findIndex(
            (item) => item.id === product.id && !item.selectedSerialNumber,
        );

        if (existingItemIndex !== -1) {
            const existingItem = currentItems[existingItemIndex];
            handleCartQuantityChange(existingItem.id, quantityToAdd, existingItem.selectedSerialNumber);
            return;
        }

        const inclusiveUnitPrice = companyStockPrice?.priceInclusive || 0;
        const companyDebtorId = form.getValues('companyDebtorId') || '';
        let discountPercentage = 0;

        if (companyDebtorId && isOnline) {
            const result = await getApplicableDiscount({
                companyDebtorId,
                companyStockDetailId: product.id,
                quantity: quantityToAdd,
            });
            discountPercentage = result?.data?.discountPercent || 0;
        }

        const discountAmount = inclusiveUnitPrice * (discountPercentage / 100) * quantityToAdd;
        const lineTotal = inclusiveUnitPrice * quantityToAdd - discountAmount;

        if (discountAmount) {
            toast.success(
                `A discount of ${currencySymbol} ${discountAmount?.toFixed(2)} has been applied to ${product.description}.`,
                { position: 'top-right' },
            );
        }

        // Normal price. The near-expiry price is only used once the cashier selects an
        // allocation on the line, so no NST lookup happens for an ordinary product.
        const newCartItem: AccountSaleCartItem = {
            ...product,
            quantity: quantityToAdd,
            discount: discountAmount || 0,
            manualDiscountType: 'AMOUNT',
            manualDiscountAmount: 0,
            discountPercentage: 0,
            unitPrice: inclusiveUnitPrice,
            lineTotal: inclusiveUnitPrice * quantityToAdd - (discountAmount || 0),
            companyStockPricingId: companyStockPrice?.id,
            companyStockPricingTypeId: companyStockPrice?.companyStockPricingTypeId,
            type: companyStockPrice?.type,
            selectedPricing: companyStockPrice,
        };

        setCartItemsAndRef((prevItems) => {
            const alreadyExists = prevItems.find((item) => item.id === product.id && !item.selectedSerialNumber);
            if (alreadyExists) {
                return prevItems;
            }
            return [...prevItems, newCartItem];
        });

        await Promise.resolve();
        // Promotions are resolved server-side by the evaluate effect, which reacts to the
        // cart composition change above; nothing is applied client-side here.
    };

    // Barcode Scan
    const [scannedBarcode, setScannedBarcode] = useState<string>('');

    // Buy-one-scan-one NST flow: an allocation label ("NST:<id>") or the "Add Discounted
    // Stock" picker hands in an id. A fresh /get is always performed so the line reflects
    // the backend's latest discounted price, version and remaining quantity.
    const addScannedNSTLine = useCallback(
        async (dispositionId: string) => {
            let disposition: StockDisposition | null = null;
            try {
                const res = await getStockDispositionById({ id: dispositionId });
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
            setCartItemsAndRef((prevItems) => {
                const existing = prevItems.find((i) => i.stockDispositionId === dispositionId);
                if (existing) {
                    const nextQty = Math.min(existing.quantity + 1, d.remainingQuantity ?? existing.quantity + 1);
                    return prevItems.map((i) =>
                        i.stockDispositionId === dispositionId
                            ? {
                                  ...i,
                                  quantity: nextQty,
                                  lineTotal: (i.unitPrice || 0) * nextQty,
                                  dispositionRemainingQuantity: d.remainingQuantity,
                              }
                            : i,
                    );
                }
                return [
                    ...prevItems,
                    {
                        ...detail,
                        quantity: 1,
                        discount: 0,
                        manualDiscountType: 'AMOUNT',
                        manualDiscountAmount: 0,
                        discountPercentage: 0,
                        unitPrice,
                        lineTotal: unitPrice,
                        companyStockPricingId: d.companyStockPricingId || '',
                        companyStockPricingTypeId: d.companyStockPricingTypeId || '',
                        companyTaxRateId: d.companyTaxRateId,
                        type: { name: 'NST' },
                        selectedPricing: {
                            id: d.companyStockPricingId || '',
                            companyStockPricingTypeId: d.companyStockPricingTypeId || '',
                            priceInclusive: unitPrice,
                            priceExclusive: unitPrice,
                            type: { name: 'NST' },
                        },
                        stockDispositionId: d.id,
                        stockDispositionVersion: nstVersion(d),
                        dispositionCompanyDebtorId: d.companyDebtorId || undefined,
                        dispositionType: d.dispositionType,
                        originalUnitPrice,
                        dispositionDiscountAmount: Math.max(originalUnitPrice - unitPrice, 0),
                        dispositionBatchNumber: d.batchNumber,
                        dispositionExpiryDate: d.expiryDate,
                        dispositionRemainingQuantity: d.remainingQuantity,
                        dispositionReason: d.reason,
                        dispositionAllowPromotionStacking: nstAllowsPromotionStacking(d),
                    } as AccountSaleCartItem,
                ];
            });
            toast.success('Discounted stock added to the sale.');
        },
        [],
    );

    const handleScannedProduct = (barcode: string) => {
        if (!selectedDebtor) {
            toast.error('Please select a debtor/customer first before scanning!');
            return;
        }

        const trimmedBarcode = String(barcode).trim();

        // NST batch labels scan as NST:<stockDispositionId>; resolve the allocation
        // straight into a cart line instead of treating it as a product barcode.
        const nstScanId = parseNSTLabelScan(trimmedBarcode);
        if (nstScanId) {
            setScannedBarcode('');
            setIsProductSelectionOpen(false);
            void addScannedNSTLine(nstScanId);
            return;
        }

        setScannedBarcode(trimmedBarcode);
    };

    function onProductSelectionClose() {
        setIsProductSelectionOpen(false);
        setScannedBarcode('');
    }

    const handleSelectPriceLevel = (priceType: CartItemPricingType) => {
        if (editingPriceLevelItem) {
            setCartItemsAndRef((prevItems) =>
                prevItems.map((item) => {
                    // An NST line keeps the backend-echoed discounted price; the cashier
                    // cannot swap in a different price level for it.
                    if (item.id === editingPriceLevelItem && !item.stockDispositionId) {
                        const newUnitPrice = priceType.priceInclusive || 0;
                        return {
                            ...item,
                            companyStockPricingId: priceType.id,
                            selectedPricing: priceType,
                            unitPrice: newUnitPrice,
                            lineTotal: calculateLineTotal({
                                ...item,
                                unitPrice: newUnitPrice,
                                quantity: item.quantity,
                                discount: item.discount,
                            }),
                            type: priceType.type,
                        };
                    }
                    return item;
                }),
            );
        }
        setEditingPriceLevelItem('');
        setIsPriceLevelSelectionOpen(false);
    };

    function nullifyPromotionDiscount() {
        setAppliedPromotionDiscount(0);
        setAppliedPromotion(null);
    }

    const handleCartQuantityChange = async (
        companyStockDetailId: string,
        delta: number,
        selectedSerialNumber?: string,
    ) => {
        setLoadingRowId(companyStockDetailId);
        nullifyPromotionDiscount();

        const companyDebtorId = form.getValues('companyDebtorId') || '';

        const item = cartItemsRef.current.find(
            (i) => i.id === companyStockDetailId && i.selectedSerialNumber === selectedSerialNumber,
        );

        if (!item) {
            setLoadingRowId(null);
            return;
        }

        const newQuantity = Math.max(1, item.quantity + delta);
        // An NST line can never be bumped past what the allocation still holds.
        let effectiveQuantity = newQuantity;
        if (item.stockDispositionId && item.dispositionRemainingQuantity != null) {
            if (newQuantity > item.dispositionRemainingQuantity) {
                effectiveQuantity = Math.max(item.dispositionRemainingQuantity, 0);
                toast.warning(`Only ${effectiveQuantity} remaining on this discounted-stock line. Quantity updated.`);
            }
        }
        // A near-expiry line already carries the discounted price, so no other discount
        // may be stacked on it when the quantity changes. A manual discount is preserved
        // (amount stays fixed, percentage is recalculated against the new line gross).
        const baseLineAmount = (item.unitPrice || 0) * effectiveQuantity;
        let discountAmount = item.stockDispositionId
            ? 0
            : hasManualDiscount(item)
              ? getManualDiscountAmount(item, baseLineAmount)
              : item.discount || 0;

        const updatedCartItems = cartItemsRef.current.map((cartItem) => {
            if (cartItem.id === companyStockDetailId && cartItem.selectedSerialNumber === selectedSerialNumber) {
                return {
                    ...cartItem,
                    quantity: effectiveQuantity,
                    discount: discountAmount,
                    lineTotal: calculateLineTotal({
                        ...cartItem,
                        quantity: effectiveQuantity,
                        unitPrice: cartItem.unitPrice || 0,
                        discount: discountAmount,
                    }),
                };
            }
            return cartItem;
        });

        if (companyDebtorId && isOnline && !item.stockDispositionId) {
            try {
                setIsLoading(true);

                const result = await getApplicableDiscount({
                    companyDebtorId,
                    companyStockDetailId: item.id,
                    quantity: effectiveQuantity,
                });

                const discountPercent = result?.data?.discountPercent || 0;
                const baseAmount = (item.unitPrice || 0) * effectiveQuantity;
                // A cashier-entered manual discount takes precedence over the automatic
                // quantity discount when the line quantity changes.
                discountAmount = hasManualDiscount(item)
                    ? getManualDiscountAmount(item, baseAmount)
                    : baseAmount * (discountPercent / 100);

                if (discountAmount) {
                    toast.success(
                        `A discount of ${currencySymbol} ${discountAmount.toFixed(2)} has been applied to ${item.description}.`,
                        { position: 'top-right' },
                    );

                    const updatedCartItemsWithDiscount = cartItemsRef.current.map((cartItem) => {
                        if (
                            cartItem.id === companyStockDetailId &&
                            cartItem.selectedSerialNumber === selectedSerialNumber
                        ) {
                            return {
                                ...cartItem,
                                quantity: effectiveQuantity,
                                discount: discountAmount,
                                lineTotal: calculateLineTotal({
                                    ...cartItem,
                                    quantity: effectiveQuantity,
                                    unitPrice: cartItem.unitPrice || 0,
                                    discount: discountAmount,
                                }),
                            };
                        }
                        return cartItem;
                    });

                    setCartItemsAndRef(updatedCartItemsWithDiscount);
                } else {
                    // Promotions are resolved server-side by the evaluate effect, which
                    // reacts to the quantity change applied here.
                    setCartItemsAndRef(updatedCartItems);
                }
            } finally {
                setIsLoading(false);
                setLoadingRowId(null);
            }
        } else {
            setCartItemsAndRef(updatedCartItems);
        }
    };

    const handleUpdateLineManualDiscount = (
        companyStockDetailId: string,
        value: Parameters<typeof withManualDiscount<AccountSaleCartItem>>[1],
        selectedSerialNumber?: string,
    ) => {
        // The manual discount is sent separately and is applied by the server after the
        // promotion result. Editing it must never clear the promotion overlay.
        setCartItemsAndRef((prevItems) =>
            prevItems.map((item) => {
                if (item.id !== companyStockDetailId || item.selectedSerialNumber !== selectedSerialNumber) {
                    return item;
                }
                // An NST line is already discounted by its allocation; a manual line
                // discount would stack another discount, so it is refused.
                if (item.stockDispositionId) return item;

                const lineGross = Math.max(0, (item.unitPrice || 0) * item.quantity);
                return withManualDiscount(item, value, lineGross);
            }),
        );
    };

    const handleUpdatePriceLevel = (code: string) => {
        nullifyPromotionDiscount();
        setIsPriceLevelSelectionOpen(true);
    };

    const handleRemoveFromCart = (companyStockDetailId: string, selectedSerialNumber?: string) => {
        nullifyPromotionDiscount();

        setCartItemsAndRef((prevItems) =>
            prevItems.filter(
                (item) => !(item.id === companyStockDetailId && item.selectedSerialNumber === selectedSerialNumber),
            ),
        );
    };

    const goodsTotal = useMemo(
        () => cartItems.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0),
        [cartItems],
    );
    const discountAmount = useMemo(() => cartItems.reduce((sum, item) => sum + item.discount, 0), [cartItems]);

    const taxAmount = useMemo(
        () =>
            cartItems.reduce(
                (sum, item) =>
                    sum +
                    +calculateTaxDetails(
                        (item.unitPrice || 0) * item.quantity || 0,
                        +item?.subCategory?.taxRate?.taxRatePercent || 0,
                    ).taxAmount.toFixed(2),
                0,
            ),
        [cartItems],
    );

    const totalQuantity = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

    const totalFreeQuantity = useMemo(() => {
        if (evaluation?.freeItemOffers?.length) {
            return evaluation.freeItemOffers.reduce(
                (sum, offer) => sum + offer.rewardItems.reduce((s, reward) => s + (reward.freeQuantity || 0), 0),
                0,
            );
        }
        return cartItems.reduce((sum, item) => sum + (item?.freeQuantity || 0), 0);
    }, [cartItems, evaluation]);

    useEffect(() => {
        const loyaltyDiscountAmount = loyaltyPointRes?.redeemableValue || 0;
        // Manual line discounts and the server-evaluated promotion discount stack
        // additively. Clamp at zero so a promotion plus a manual discount can never
        // produce a negative payable amount.
        const payable = Math.max(0, goodsTotal - discountAmount - loyaltyDiscountAmount - appliedPromotionDiscount);
        setValue('goodsTotal', +payable.toFixed(2));
        setValue('discountAmount', discountAmount);
        setValue('loyaltyDiscountAmount', loyaltyDiscountAmount);
        setValue('taxAmount', taxAmount);
        setValue('totalQuantity', totalQuantity);
        setValue('totalFreeQuantity', totalFreeQuantity);
    }, [
        goodsTotal,
        discountAmount,
        taxAmount,
        loyaltyPointRes?.redeemableValue,
        totalQuantity,
        totalFreeQuantity,
        setValue,
        appliedPromotionDiscount,
    ]);

    useEffect(() => {
        setValue('promotionDiscountAmount', appliedPromotionDiscount);
    }, [appliedPromotionDiscount]);

    const tenders = isOnline
        ? useGetTenders({ isParentNull: true, isDiscountParent: false })?.data?.data?.rows
        : useGetTendersOffline(isOnline)?.data?.data?.rows?.filter(
              (tender) => !tender?.parentTenderId && !tender?.isDiscountParent,
          );

    const [paymentSplits, setPaymentSplits] = useState<PaymentSplitRow[]>([]);

    const payableAmount = useMemo(() => Number(watch('goodsTotal')) || 0, [watch('goodsTotal')]);

    const nonCashPaid = useMemo(() => {
        return paymentSplits
            .filter((row) => row.tenderType !== TENDER_TYPES?.CASH)
            .reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
    }, [paymentSplits]);

    const cashSplitRow = useMemo(
        () => paymentSplits.find((row) => row.tenderType === TENDER_TYPES?.CASH),
        [paymentSplits],
    );

    const cashEntered = useMemo(() => parseFloat(cashSplitRow?.amount || '') || 0, [cashSplitRow]);

    const remainingBeforeCash = useMemo(() => {
        return Math.max(0, Math.round((payableAmount - nonCashPaid) * 100) / 100);
    }, [payableAmount, nonCashPaid]);

    const cashApplied = useMemo(() => {
        return Math.min(cashEntered, remainingBeforeCash);
    }, [cashEntered, remainingBeforeCash]);

    const codChangeDue = useMemo(() => {
        const change = cashEntered - remainingBeforeCash;
        return change > 0 ? Math.round(change * 100) / 100 : 0;
    }, [cashEntered, remainingBeforeCash]);

    const totalPaid = useMemo(() => {
        return Math.round((nonCashPaid + cashApplied) * 100) / 100;
    }, [nonCashPaid, cashApplied]);

    const remainingAmount = useMemo(() => {
        return Math.max(0, Math.round((payableAmount - totalPaid) * 100) / 100);
    }, [payableAmount, totalPaid]);

    const handleAddPaymentSplit = () => {
        setPaymentSplits((prev) => [
            ...prev,
            {
                rowId: `${Date.now()}-${prev.length}`,
                tenderTypeId: '',
                tenderType: '',
                description: '',
                amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : '',
                remarks: '',
            },
        ]);
    };

    const handleRemovePaymentSplit = (rowId: string) => {
        setPaymentSplits((prev) => prev.filter((row) => row.rowId !== rowId));
    };

    const handlePaymentTenderChange = (rowId: string, tenderTypeId: string) => {
        const tender = tenders?.find((t) => t.id === tenderTypeId);

        const isAlreadyAdded = paymentSplits.some((row) => row.rowId !== rowId && row.tenderTypeId === tenderTypeId);

        if (isAlreadyAdded) {
            toast.error(
                `${tender?.description || 'This tender type'} has already been added. Each payment method can only be used once.`,
            );
            return;
        }

        setPaymentSplits((prev) =>
            prev.map((row) =>
                row.rowId === rowId
                    ? {
                          ...row,
                          tenderTypeId: tenderTypeId,
                          tenderType: tender?.type || '',
                          description: tender?.description || '',
                      }
                    : row,
            ),
        );
    };

    const handlePaymentAmountChange = (rowId: string, amount: string) => {
        setPaymentSplits((prev) => {
            const row = prev.find((r) => r.rowId === rowId);
            const isCashRow = row?.tenderType === TENDER_TYPES?.CASH;

            if (!isCashRow) {
                const otherNonCashTotal = prev
                    .filter((r) => r.rowId !== rowId && r.tenderType !== TENDER_TYPES?.CASH)
                    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

                const maxAllowed = Math.max(0, Math.round((payableAmount - otherNonCashTotal) * 100) / 100);
                const entered = parseFloat(amount) || 0;

                if (entered > maxAllowed) {
                    toast.error(
                        `Amount cannot exceed the remaining payable balance of ${currencySymbol} ${maxAllowed.toFixed(2)} for this tender type.`,
                    );
                    return prev.map((r) => (r.rowId === rowId ? { ...r, amount: maxAllowed.toFixed(2) } : r));
                }
            }

            return prev.map((r) => (r.rowId === rowId ? { ...r, amount } : r));
        });
    };

    const handlePaymentRemarksChange = (rowId: string, remarks: string) => {
        setPaymentSplits((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, remarks } : row)));
    };

    useEffect(() => {
        if (isCodDebtor) {
            const formattedPayments = paymentSplits
                .filter((row) => row.tenderTypeId && parseFloat(row.amount) > 0)
                .map((row) => {
                    const isCashRow = row.tenderType === TENDER_TYPES?.CASH;
                    const enteredAmount = parseFloat(row.amount) || 0;
                    const appliedAmount = isCashRow ? cashApplied : enteredAmount;

                    return {
                        tenderTypeId: row.tenderTypeId,
                        tenderType: row.tenderType,
                        amount: appliedAmount,
                        remarks: row.remarks || 'COD payment',
                    };
                });
            setValue('payments' as any, formattedPayments);
            setValue('changeDue' as any, codChangeDue);
        } else {
            setValue('payments' as any, []);
            setValue('changeDue' as any, 0);
            if (paymentSplits.length) {
                setPaymentSplits([]);
            }
        }
    }, [paymentSplits, isCodDebtor, cashApplied, codChangeDue]);

    useEffect(() => {
        setPaymentSplits([]);
    }, [companyDebtorId]);

    const cartColumns = useMemo(() => {
        const selectedPromotion = appliedPromotion?.promotion;
        const selectedPromotionType = appliedPromotion?.promotion?.CompanyStockPromotionType?.code;

        const isDiscountPercent = (id: string) =>
            selectedPromotionType === 'BIAGDPT' &&
            selectedPromotion?.CompanyStockPromotionItems?.find((data) => data?.companyStockDetailId === id);
        const discountPercent = (selectedPromotion?.discountPercent || 0) / 100;

        return [
            {
                key: 'itemCode',
                label: 'Code',
                className: 'w-[120px]',
                render: (item: AccountSaleDisplayItem) => {
                    if (item.isNewRow) {
                        return (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-full justify-start px-2 text-xs"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsProductSelectionOpen(true);
                                    }}
                                >
                                    <PlusIcon /> Select Product
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs whitespace-nowrap"
                                    onClick={() => setNstAllOpen(true)}
                                >
                                    Add Discounted Stock
                                </Button>
                            </div>
                        );
                    }
                    if (item.isFreeRewardRow) {
                        return (
                            <div className="space-y-1">
                                <span className="block truncate">{item.itemCode}</span>
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                    FREE
                                </span>
                            </div>
                        );
                    }
                    return (
                        <span className="block truncate">
                            {item.itemCode} {item.selectedSerialNumber ? `(${item.selectedSerialNumber})` : ''}
                        </span>
                    );
                },
            },
            {
                key: 'description',
                label: 'Description',
                className: 'max-w-[200px] truncate',
                render: (item: AccountSaleDisplayItem) => item.description,
            },
            {
                key: 'pack des',
                label: 'Pack Des.',
                className: 'w-[60px] text-center',
                render: (item: AccountSaleDisplayItem) =>
                    item.isFreeRewardRow ? `${item.freeQuantity || 0} x` : item.packSize,
            },
            {
                key: 'stock',
                label: 'Stock',
                className: 'w-[60px] text-center',
                render: (item: AccountSaleDisplayItem) => {
                    console.log("avialable stock",item)
                    const remainingStock = item.dispositionRemainingQuantity ?? item.stockOnHand ?? 0;
                    return item.isNewRow || item.isFreeRewardRow ? null : (
                        <div className={`font-semibold ${remainingStock <= 5 ? 'text-red-600' : 'text-green-700'}`}>
                            {remainingStock}
                        </div>
                    );
                },
            },
            {
                key: 'companyStockPricingId',
                label: 'Price Type',
                className: 'w-[100px] text-right',
                render: (item: AccountSaleDisplayItem) =>
                    item.isNewRow ? null : item.isFreeRewardRow ? (
                        <div className="text-center text-[10px] font-semibold text-green-700">Promotion</div>
                    ) : (
                        <>
                            <div className="relative flex-grow">
                                <Input
                                    value={
                                        cartItems.find((cartItem) => cartItem.id === item.id)?.companyStockPricingId
                                            ? cartItems.find((cartItem) => cartItem.id === item.id)?.type?.name ||
                                              'Unknown'
                                            : item.type?.name || 'No Price Type'
                                    }
                                    className="border-input h-7 w-full cursor-pointer rounded-md border bg-white px-2 py-1 pr-8 text-xs"
                                    readOnly
                                    onClick={() => {
                                        if (item.stockDispositionId) return;
                                        setEditingPriceLevelItem(item.id);
                                        setIsPriceLevelSelectionOpen(true);
                                    }}
                                />
                                <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            </div>
                        </>
                    ),
            },
            {
                key: 'nst1',
                label: 'NST',
                className: 'w-[110px]',
                render: (item: AccountSaleCartItem) =>
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
                                        {item.dispositionBatchNumber && <p>Batch: {item.dispositionBatchNumber}</p>}
                                        {item.dispositionExpiryDate && (
                                            <p>Expiry: {moment(item.dispositionExpiryDate).format('DD MMM, YY')}</p>
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
                render: (item: AccountSaleDisplayItem) =>
                    item.isNewRow || item.isFreeRewardRow ? null : (
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
            {
                key: 'quantity',
                label: 'Qty',
                className: 'w-[100px] text-center',
                render: (item: AccountSaleDisplayItem) =>
                    item.isFreeRewardRow ? (
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold text-green-700">{item.freeQuantity || 0}</span>
                            <span className="text-[9px] font-semibold text-green-700">FREE</span>
                        </div>
                    ) : item.isNewRow ? (
                        <span className="h-6 w-full text-sm font-semibold">{watch('totalQuantity')}</span>
                    ) : (
                        <div className="flex items-center justify-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 bg-transparent"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleCartQuantityChange(item.id, -1, item.selectedSerialNumber);
                                }}
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
                                        (item.availableStock ?? item.stockOnHand) === item.quantity &&
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
            ...(hasFreeRewards || appliedPromotion
                ? [
                      {
                          key: 'freeQuantity',
                          label: 'Free',
                          className: 'w-[100px] text-center',
                          render: (item: AccountSaleDisplayItem) =>
                              item.isNewRow ? (
                                  <div className="font-bold text-green-700">{watch('totalFreeQuantity')}</div>
                              ) : (
                                  <div className="font-bold text-green-700">{item.evaluatedFreeQuantity || 0}</div>
                              ),
                      },
                  ]
                : []),
            {
                key: 'unitPrice',
                label: 'Product Price (incl.)',
                className: 'w-[80px] text-right',
                render: (item: AccountSaleDisplayItem) =>
                    item.isNewRow ? null : item.isFreeRewardRow ? (
                        <div className="text-right">
                            <div className="text-sm font-semibold text-green-700">FREE</div>
                            {item.unitPrice ? (
                                <div className="mt-1 w-full text-right text-xs text-gray-500 line-through">
                                    {currencySymbol} {item.unitPrice.toFixed(2)}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <>
                            <Input
                                type="number"
                                value={item?.evaluatedPromotionalPrice || item?.unitPrice}
                                readOnly
                                className="h-6 w-full p-0 text-right text-xs"
                            />

                            {item.evaluatedPromotionalPrice ? (
                                <div className="mt-1 w-full text-right text-xs text-gray-500 line-through">
                                    {currencySymbol} {(item?.unitPrice || 0.0).toFixed(2)}
                                </div>
                            ) : null}
                        </>
                    ),
            },
            {
                key: 'discount',
                label: 'Disc.',
                className: 'w-[80px] text-right',
                render: (item: AccountSaleDisplayItem) => {
                    if (item.isNewRow)
                        return (
                            <span className="h-6 w-full justify-end text-sm font-semibold">
                                {currencySymbol} {discountAmount.toFixed()}
                            </span>
                        );

                    if (item.isFreeRewardRow) {
                        return (
                            <span className="h-6 w-full text-right text-xs font-semibold text-green-700">
                                {currencySymbol} {(item.discount || 0).toFixed(2)}
                            </span>
                        );
                    }

                    return (
                        <>
                            <ManualDiscountInput
                                mode={item.manualDiscountType ?? 'AMOUNT'}
                                amount={item.manualDiscountAmount ?? 0}
                                percentage={item.discountPercentage ?? 0}
                                grossAmount={(item.unitPrice || 0) * item.quantity}
                                currencySymbol={currencySymbol}
                                disabled={!!item.stockDispositionId}
                                onChange={(value) =>
                                    handleUpdateLineManualDiscount(item.id, value, item.selectedSerialNumber)
                                }
                            />

                            {isDiscountPercent(item.id) ? (
                                <div className="mt-1 w-full text-right text-[9px] font-semibold text-green-800">
                                    +{discountPercent * 100}% extra off
                                </div>
                            ) : null}
                        </>
                    );
                },
            },
            {
                key: 'vatAmount',
                label: 'VAT Amount',
                className: 'w-[80px] text-right',
                render: (item: AccountSaleDisplayItem) =>
                    item.isNewRow ? (
                        <div className="h-6 w-full justify-end text-sm font-semibold">
                            {currencySymbol} {taxAmount.toFixed(2)}
                        </div>
                    ) : item.isFreeRewardRow ? (
                        <div className="text-muted-foreground w-full text-right text-xs">
                            {currencySymbol} 0.00
                        </div>
                    ) : (
                        <div className="text-muted-foreground w-full text-right text-xs">
                            {currencySymbol}{' '}
                            {calculateTaxDetails(
                                (item.unitPrice || 0) * item.quantity,
                                +item?.subCategory?.taxRate?.taxRatePercent || 0,
                            ).taxAmount.toFixed(2)}
                        </div>
                    ),
            },
            {
                key: 'lineTotal',
                label: 'Total',
                className: 'w-[80px] text-right font-semibold',
                render: (item: AccountSaleDisplayItem) =>
                    item.isNewRow ? (
                        <>
                            <div className={`h-6 w-full justify-end text-sm font-semibold`}>
                                {currencySymbol} {watch('goodsTotal')}
                            </div>
                            {appliedPromotionDiscount ? (
                                <div className={`h-6 w-full justify-end text-xs text-gray-500 line-through`}>
                                    {currencySymbol} {watch('goodsTotal') + appliedPromotionDiscount}
                                </div>
                            ) : null}
                        </>
                    ) : item.isFreeRewardRow ? (
                        <div className="text-sm font-semibold text-green-700">{currencySymbol} 0.00</div>
                    ) : (
                        <>
                            {(item.evaluatedPromotionalPrice || (item.evaluationLine?.discountAmount ?? 0) > 0) && (
                                <div className="text-green-700">
                                    {currencySymbol} {(item.evaluatedLineTotal || 0).toFixed(2)}
                                </div>
                            )}

                            <div
                                className={`${
                                    item.evaluatedPromotionalPrice || (item.evaluationLine?.discountAmount ?? 0) > 0
                                        ? 'text-xs text-gray-500 line-through'
                                        : ''
                                }`}
                            >
                                {currencySymbol} {(item.unitPrice * item.quantity - (item.discount || 0)).toFixed()}
                            </div>
                        </>
                    ),
            },
            {
                key: 'delete',
                label: 'Delete',
                className: 'w-[60px] text-center',
                render: (item: AccountSaleDisplayItem) =>
                    item.isNewRow || item.isFreeRewardRow ? null : (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700"
                            onClick={(e) => {
                                e.preventDefault();
                                handleRemoveFromCart(item.id, item.selectedSerialNumber);
                            }}
                        >
                            <Trash2Icon className="h-4 w-4" />
                            <span className="sr-only">Remove item</span>
                        </Button>
                    ),
            },
        ];
    }, [
        handleCartQuantityChange,
        handleRemoveFromCart,
        handleUpdateLineManualDiscount,
        handleUpdatePriceLevel,
        watch,
        discountAmount,
        taxAmount,
        appliedPromotion,
        appliedPromotionDiscount,
        hasFreeRewards,
    ]);

    const displayCartItems = useMemo(() => {
        const rows = [...cartItemsForDisplay, ...freeRewardDisplayItems];
        if (isDebtorSelected) {
            return [
                ...rows,
                {
                    id: '',
                    description: '',
                    barcode: '',
                    supplierCode: '',
                    onhand: 0,
                    unitPrice: 0,
                    hasSerialNumber: false,
                    quantity: 0,
                    discount: 0,
                    lineTotal: 0,
                    isNewRow: true,
                },
            ];
        }
        return rows;
    }, [cartItemsForDisplay, freeRewardDisplayItems, isDebtorSelected]);

    const resetFormAndStatesAfterSubmission = (form: UseFormReturn<AnyAccountSale>) => {
        form.reset();
        setIsDebtorSelected(false);
        setSelectedDebtor(null);
        setCartItemsAndRef([]);
        setSelectedRep(null);
        setASInvoiceCount(asInvoiceCount + 1);
        setSupervisorDetails(null);
        setLoyaltyPointRes(null);
        setAppliedPromotion(null);
        setAppliedPromotionDiscount(0);
        setPaymentSplits([]);
        setIsCodPaymentDialogOpen(false);
        overrideReasonRef.current = null;
        nstBlocksPromotionsRef.current = false;
        setNstPickerLine(null);
        clearReason();
        hasDiscountOverrideRef.current = false;
        setHasDiscountOverride(false);
    };

    const handlePrintPromptAnswer = (shouldPrint: boolean) => {
        if (shouldPrint && pendingPrintData) {
            setPrintData(pendingPrintData);
        }
        setShowPrintPrompt(false);
        setPendingPrintData(null);
    };

    // Recovery for the backend's discounted-stock rejections. The price-changed case
    // reloads the allocation into the basket (updated price, version, remaining) and
    // returns the cashier to the basket WITHOUT auto-retrying: the sale only goes
    // through once the cashier re-accepts the updated total. Other cases refresh or
    // remove lines; a promotion-blocking rule drops the promotion.
    const handleDispositionSaleError = useCallback(
        (error: unknown) => {
            if (!isOnline) return null;
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
                            ...(line.dispositionCompanyDebtorId ? { companyDebtorId: line.dispositionCompanyDebtorId } : {}),
                        });
                        const d = res?.data;
                        if (!d) continue;
                        if (!isSellableNST(d) || (d.remainingQuantity ?? 0) <= 0) {
                            setCartItemsAndRef((prevItems) => prevItems.filter((i) => i.stockDispositionId !== d.id));
                            toast.error(
                                kind === 'UNAVAILABLE'
                                    ? 'A discounted-stock item is no longer available and was removed.'
                                    : 'A discounted-stock item has changed and is no longer sellable; it was removed.',
                            );
                            continue;
                        }
                        const price = d.discountedUnitPrice ?? d.unitPrice;
                        setCartItemsAndRef((prevItems) =>
                            prevItems.map((i) => {
                                if (i.stockDispositionId !== d.id) return i;
                                const qty = Math.min(i.quantity, d.remainingQuantity ?? i.quantity);
                                return {
                                    ...i,
                                    stockDispositionVersion: nstVersion(d),
                                    unitPrice: price ?? i.unitPrice,
                                    lineTotal: (price ?? i.unitPrice) * qty - (i.discount || 0),
                                    quantity: qty,
                                    dispositionRemainingQuantity: d.remainingQuantity,
                                    dispositionAllowPromotionStacking: nstAllowsPromotionStacking(d),
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
        [cartItems],
    );

    function onSubmit(values: AnyAccountSale) {
        if (!selectedDebtor) return;

        const cleanedPayload: Partial<AnyAccountSale> = cleanDataPayload(values);
        delete (cleanedPayload as any).terminalId;

        // The server evaluation is authoritative. The manual "Apply Promotion" dialog is
        // display-only and must never contribute a second discount or promotion to the payload.
        const selectedPromotionPayload =
            evaluationPromotionId || evaluationDiscount || evaluationApplications.length
                ? {
                      ...(evaluationPromotionId ? { promotionId: evaluationPromotionId } : {}),
                      ...(evaluationPromotionName ? { promotionName: evaluationPromotionName } : {}),
                      promotionDiscountAmount: evaluationDiscount,
                      ...(evaluationApplications.length
                          ? { promotionApplications: evaluationApplications as any }
                          : {}),
                  }
                : {};

        // goodsTotal is the GROSS basket sum (pre-discount). The discounts travel in their own
        // header fields (discountAmount / loyaltyDiscountAmount / promotionDiscountAmount) so the
        // backend never subtracts a promotion twice.
        const grossGoodsTotal = +values.items
            .reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0)
            .toFixed(2);

        function cartItemsWithFreeQuantity() {
            const baseItems = values.items.flatMap((item, index) => {
                const cartItem = cartItems[index];
                const line = evaluationLineByKey.get(`line-${index + 1}`);
                const linePromotionType = line?.promotionTypeCode;
                const isPromotionalPricePromotion = linePromotionType === 'SP' || linePromotionType === 'BMF';
                const promotionalPrice = isPromotionalPricePromotion
                    ? (line?.finalUnitPrice ?? line?.unitPrice)
                    : undefined;

                return [
                    {
                        ...item,
                        companyTaxRateId: cartItem?.companyTaxRateId || '',
                        baseUnitPrice: cartItem?.selectedPricing?.priceInclusive ?? item.unitPrice,
                        ...(cartItem?.salesOrderItemId ? { salesOrderItemId: cartItem.salesOrderItemId } : {}),
                        ...(promotionalPrice !== undefined ? { promotionalPrice } : {}),
                    },
                ];
            });

            // Free reward lines the evaluated offers entitle the customer to. They are recorded
            // at zero payable and never added into goodsTotal or the payable header discount.
            // BIAGDPB's discounted item is already a normal basket line, so it is excluded here.
            const rewardLines: AccountSaleCreateSchema['items'] = (evaluation?.freeItemOffers ?? []).flatMap((offer) =>
                offer.rewardItems.filter((reward) => reward.isFree || (reward.freeQuantity || 0) > 0).map((reward) => ({
                    companyStockDetailId: reward.companyStockDetailId,
                    companyStockPricingId: reward.companyStockPricingId || '',
                    companyStockPricingTypeId: reward.companyStockPricingTypeId || '',
                    companyTaxRateId: reward.companyTaxRateId || '',
                    ...(reward.description ? { description: reward.description } : {}),
                    quantity: 0,
                    freeQuantity: reward.freeQuantity,
                    isFree: true,
                    unitPrice: reward.unitPrice,
                    discount: reward.discountAmount,
                    lineTotal: 0,
                })),
            );

            return [...baseItems, ...rewardLines];
        }

        if ('invoiceDate' in values) {
            const asValues = cleanedPayload as AccountSaleCreateSchema;
            const createPayload = {
                ...asValues,
                goodsTotal: grossGoodsTotal,
                items: cartItemsWithFreeQuantity(),
                ...(loyaltyPointRes?.loyaltyCardNumber
                    ? { loyaltyCardNumber: loyaltyPointRes?.loyaltyCardNumber }
                    : {}),
                ...(loyaltyPointRes ? { loyaltyDiscountAmount: loyaltyPointRes?.redeemableValue } : {}),
                ...(supervisorDetails ? { approvedById: supervisorDetails?.id } : {}),
                ...selectedPromotionPayload,
            };

            // If a quantity and/or discount override is required, add the operator-entered
            // reason (plus any automatic quantity note) and a securityRequestReference.
            const overrideReasons = [
                hasQuantityOverride
                    ? overrideReasonRef.current
                        ? `${overrideReasonRef.current}; Additional stock required`
                        : 'Additional stock required'
                    : null,
                hasDiscountOverrideRef.current ? overrideReasonRef.current || 'Discount override requested' : null,
            ].filter(Boolean);
            const payloadWithOverride = overrideReasons.length
                ? {
                      ...createPayload,
                      reason: overrideReasons.join('; '),
                      securityRequestReference: generateSecurityReference(),
                  }
                : createPayload;

            const onSuccessHandler = async (data: any) => {
                if (data.success) {
                    toast.success('Account Sale created successfully');
                    // NST sold stock refreshes: allocations with zero remaining drop out
                    // of the management screens, candidate lists and pickers.
                    if (isOnline && (values.items as CartItemReponse[])?.some((item) => item.stockDispositionId)) {
                        queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
                        queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockInventories)] });
                    }
                    if (isOnline) {
                        setPendingPrintData({
                            accountSales: data.data,
                            cartItems: data.data.DebtorInvoicingOrderItems,
                            accountNumber: data.data.CompanyDebtor.accountNumber,
                        });
                        // The invoice is created: route the outstanding balance to the Cash
                        // Office when the rules say so (amount above the threshold). Any other
                        // outcome (POS or error) falls back to the normal print prompt.
                        checkCashOfficePaymentRouting(
                            {
                                invoiceAmount: Number(data.data?.outstandingAmount ?? 0),
                                ...(data.data?.companyDebtorId ? { companyDebtorId: data.data.companyDebtorId } : {}),
                            },
                            {
                                onSuccess: (res) => {
                                    if (res?.data?.route === 'CASH_OFFICE' && data.data?.id) {
                                        setCashOfficeRouting({ result: res.data, invoice: data.data });
                                        return;
                                    }
                                    setShowPrintPrompt(true);
                                },
                                onError: () => setShowPrintPrompt(true),
                            },
                        );
                    } else {
                        setPendingPrintData({
                            accountSales: asValues,
                            cartItems: cartItems.map((item) => {
                                const {
                                    quantity,
                                    discount,
                                    unitPrice,
                                    freeQuantity,
                                    isFree,
                                    promotionalPrice,
                                    companyStockPricingId,
                                    type,
                                    selectedPricing,
                                    ...product
                                } = item;
                                return {
                                    quantity,
                                    discount,
                                    unitPrice,
                                    ...(hasFreeRewards ? { freeQuantity, isFree, promotionalPrice } : {}),
                                    lineTotal: item?.unitPrice * item.quantity - item.discount || 0,
                                    companyStockPricingId,
                                    type: item?.type,
                                    selectedPricing,
                                    CompanyStockDetail: product,
                                };
                            }),
                            accountNumber: selectedDebtor?.accountNumber,
                        });
                        setShowPrintPrompt(true);

                        const offlineAccountSalesData = (await getDBData(
                            getIDBKey(apiUrls.accountSales),
                        )) as GetAccountSaleResponse;

                        const offlineAccountSale: AccountSalesDetails = {
                            ...(cleanedPayload as AccountSaleCreateSchema),
                            CompanyDebtor: selectedDebtor,
                            outstandingAmount: values.goodsTotal,
                            id: generateUUIDForData(),
                            DebtorInvoicingOrderItems: cartItems.map((item) => {
                                const {
                                    quantity,
                                    discount,
                                    unitPrice,
                                    freeQuantity,
                                    isFree,
                                    promotionalPrice,
                                    companyStockPricingId,
                                    type,
                                    selectedPricing,
                                    ...product
                                } = item;
                                return {
                                    quantity,
                                    discount,
                                    unitPrice,
                                    ...(hasFreeRewards ? { freeQuantity, isFree, promotionalPrice } : {}),
                                    lineTotal: item?.unitPrice * item.quantity - item.discount || 0,
                                    companyStockPricingId,
                                    type: item?.type,
                                    selectedPricing,
                                    CompanyStockDetail: product,
                                };
                            }),
                            createdAt: asValues.invoiceDate,
                            notSynced: true,
                            ...(selectedRep ? { representativeId: selectedRep.id } : {}),
                            ...(selectedRep ? { SalesRepresentative: selectedRep } : {}),
                        };

                        const updateOfflineAccountSalesData: GetAccountSaleResponse = {
                            success: true,
                            message: 'Account Sale created successfully',
                            data: {
                                rows: [offlineAccountSale, ...offlineAccountSalesData.data.rows],
                                count: offlineAccountSalesData?.data?.count + 1,
                            },
                        };

                        await setDBData(getIDBKey(apiUrls.accountSales), updateOfflineAccountSalesData);
                        queryClient.setQueryData(
                            [getIDBKey(apiUrls.accountSales), false],
                            updateOfflineAccountSalesData,
                        );

                        const offlineStockDetailsData = (await getDBData(
                            getIDBKey(apiUrls.stocks),
                        )) as CompanyStockDetailsListResponse;

                        const updatedStockDetailsData: CompanyStockDetailsListResponse = {
                            ...offlineStockDetailsData,
                            data: {
                                count: offlineStockDetailsData?.data?.count,
                                rows: offlineStockDetailsData?.data?.rows?.map((row) => {
                                    const cartItem = (cleanedPayload as AccountSaleCreateSchema).items.find(
                                        (item) => item.companyStockDetailId === row.id,
                                    );
                                    if (cartItem)
                                        return {
                                            ...row,
                                            stockOnHand: row.stockOnHand - cartItem.quantity,
                                            availableStock: (row.availableStock ?? row.stockOnHand) - cartItem.quantity,
                                        };
                                    else return row;
                                }),
                            },
                        };

                        await setDBData(getIDBKey(apiUrls.stocks), updatedStockDetailsData);
                        queryClient.setQueryData([getIDBKey(apiUrls.stocks), false], updatedStockDetailsData);
                    }
                    resetFormAndStatesAfterSubmission(form);
                } else {
                    toast.error('Account Sales creation failed');
                }
            };

            const onErrorHandler = (error: any) => {
                // Discounted-stock rejections (price changed / not stackable with a
                // promotion / unavailable) are recovered in-basket instead of toasted raw.
                if (handleDispositionSaleError(error)) return;
                const approvalInfo = isApprovalRequiredError(error);
                if (approvalInfo) {
                    pendingApprovalRef.current = {
                        payload: payloadWithOverride,
                        approvedTokens: {},
                        isOnline,
                    };
                    setApproval({ ...approvalInfo, actionLabel: 'Create Account Sale' });
                } else {
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            };

            // Direct call (no approval token)
            createAccountSale(
                { data: payloadWithOverride },
                {
                    onSuccess: onSuccessHandler,
                    onError: onErrorHandler,
                },
            );
        }

        if ('salesOrderDate' in values) {
            const soValues = cleanedPayload as SaleOrderCreateSchema;
            createSaleOrder(
                {
                    ...soValues,
                    goodsTotal: grossGoodsTotal,
                    ...(supervisorDetails ? { approvedById: supervisorDetails?.id } : {}),
                    ...selectedPromotionPayload,
                    items: cartItemsWithFreeQuantity(),
                },
                {
                    onSuccess: async (data) => {
                        if (data.success) {
                            toast.success('Sale order created successfully');
                            setPendingPrintData({
                                accountSales: data.data,
                                cartItems: data.data.salesOrderItems,
                                accountNumber: data.data.CompanyDebtor.accountNumber,
                            });
                            setShowPrintPrompt(true);
                            resetFormAndStatesAfterSubmission(form);
                        } else {
                            toast.error('Sale order creation failed');
                        }
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    },
                },
            );
        }

        if ('quotationDate' in values) {
            const pqValues = cleanedPayload as QuotationCreateSchema;
            createQuotation(
                {
                    ...pqValues,
                    goodsTotal: grossGoodsTotal,
                    ...(supervisorDetails ? { approvedById: supervisorDetails?.id } : {}),
                    ...selectedPromotionPayload,
                    items: cartItemsWithFreeQuantity(),
                } as QuotationCreateSchema,
                {
                    onSuccess: async (data) => {
                        if (data.success) {
                            toast.success('Price Quotations created successfully');
                            setPendingPrintData({
                                accountSales: data.data,
                                cartItems: data.data.priceQuotationItems,
                                accountNumber: data.data.CompanyDebtor.accountNumber,
                            });
                            setShowPrintPrompt(true);
                            resetFormAndStatesAfterSubmission(form);
                        } else {
                            toast.error('Price Quotations creation failed');
                        }
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    },
                },
            );
        }
    }

    const handleApproved = (token: string, tokens?: Record<string, string>) => {
        const meta = pendingApprovalRef.current;
        if (!meta) {
            closeApproval();
            return;
        }

        // The 428 response may carry multiple approvals; the dialog approves each
        // approvalRequestId and returns a map of actionCode -> approvalToken. Submit
        // once with every token in the approvalTokens body.
        const approvedTokens: AccountSaleApprovalTokens = { ...meta.approvedTokens, ...(tokens || {}) };
        const tokenValues = Object.values(approvedTokens).filter(Boolean) as string[];
        const needsBodyTokens = tokenValues.length > 1;
        const headerToken = needsBodyTokens ? '' : token || tokenValues[0] || '';
        const retryPayload = {
            ...meta.payload,
            ...(needsBodyTokens ? { approvalTokens: approvedTokens } : {}),
        } as AccountSaleCreateSchema;

        createAccountSale(
            {
                data: retryPayload,
                ...(headerToken ? { headers: { 'X-Approval-Token': headerToken } } : {}),
            },
            {
                onSuccess: async (data: any) => {
                    pendingApprovalRef.current = null;
                    closeApproval();
                    if (data.success) {
                        toast.success('Account Sale created successfully');
                        if (meta.isOnline) {
                            setPendingPrintData({
                                accountSales: data.data,
                                cartItems: data.data.DebtorInvoicingOrderItems,
                                accountNumber: data.data.CompanyDebtor.accountNumber,
                            });
                            setShowPrintPrompt(true);
                        }
                        resetFormAndStatesAfterSubmission(form);
                    } else {
                        toast.error('Account Sales creation failed');
                    }
                },
                onError: (error: any) => {
                    if (handleDispositionSaleError(error)) {
                        pendingApprovalRef.current = null;
                        closeApproval();
                        return;
                    }
                    const approvalInfo = isApprovalRequiredError(error);
                    if (approvalInfo) {
                        pendingApprovalRef.current = { ...meta, approvedTokens };
                        setApproval({ ...approvalInfo, actionLabel: 'Create Account Sale' });
                    } else {
                        pendingApprovalRef.current = null;
                        closeApproval();
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    }
                },
            },
        );
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for account sales');
    };

    const handleAccept = async () => {
        // Refresh every selected allocation before checkout. Screen data can be stale, so
        // sellability and remaining quantity are re-read and the submit is blocked if
        // anything changed. The backend revalidates atomically either way.
        if (!pendingApprovalRef.current) {
            const nstLines = cartItems.filter((item) => !!item.stockDispositionId);
            if (nstLines.length) {
                setIsLoading(true);
                try {
                    const checks = await verifyNSTLinesForCheckout(
                        nstLines.map((item) => ({
                            stockDispositionId: item.stockDispositionId,
                            // Owner of the NST record (selling store); the buyer must not be used here.
                            companyDebtorId: item.dispositionCompanyDebtorId,
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
        }

        await checkPricingMatrixOverrides();

        // When the pricing matrix flags a discount / price override (or the quantity
        // recommendation flags a quantity override) the operator must type an override
        // reason, which is sent with the create request. Skipped when re-submitting
        // with an approval token because the reason was already captured.
        if (!pendingApprovalRef.current && (hasDiscountOverrideRef.current || hasQuantityOverride)) {
            if (!overrideReasonRef.current) {
                const enteredReason = await askReason();
                if (!enteredReason) {
                    toast.error('Submission cancelled: an override reason is required.');
                    return;
                }
                overrideReasonRef.current = enteredReason;
            }
        }

        if (isCodDebtor) {
            if (!selectedDebtor) {
                toast.error('Please select a debtor first.');
                return;
            }
            if (cartItems.length === 0) {
                toast.error('Cart is empty.');
                return;
            }

            // COD payments are always collected at the POS; the amount-routing check for
            // any outstanding balance happens after the invoice is created (see onSuccessHandler).
            setIsCodPaymentDialogOpen(true);
            return;
        }
        handleSubmit(onSubmit)();
    };

    const handleConfirmCodPayment = () => {
        if (remainingAmount > 0) {
            toast.error(`Payment incomplete. Remaining amount: ${currencySymbol} ${remainingAmount.toFixed(2)}`);
            return;
        }
        setIsCodPaymentDialogOpen(false);
        handleSubmit(onSubmit)();
    };

    // Promotions
    function handleApplyPromotion(appliedPromo: AppliedPromotionDetails) {
        // A rule with allowPromotionStacking = false cannot be discounted twice; the
        // backend rejects the basket, so the promotion is refused up front.
        if (nstBlocksPromotionsRef.current) {
            toast.error('A near-expiry item in this sale does not allow promotion stacking.');
            return;
        }
        // The server evaluation is authoritative for pricing and totals. The manual dialog
        // only records which promotion the operator selected so its badge stays visible; it
        // never re-prices the cart or adds a second discount.
        setAppliedPromotion(appliedPromo);
    }

    return (
        <PageLoader isLoading={isAccountSalePending || isQuotationPending || isSaleOrderPending}>
            <div
                className={`flex flex-col ${
                    asType === 'SALES_ORDER'
                        ? COLOR_CODES_FOR_INVOICE_FORMS?.SALE_ORDER
                        : asType === 'QUOTATION'
                          ? COLOR_CODES_FOR_INVOICE_FORMS?.QUOTATION
                          : COLOR_CODES_FOR_INVOICE_FORMS?.INVOICE
                }`}
            >
                <h1 className="px-4 py-2 text-2xl font-bold capitalize">
                    {asType?.toLowerCase()?.replaceAll('_', ' ')}
                </h1>
                <Form {...form}>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                        }}
                        className="flex flex-col"
                    >
                        <InvoiceDetailsForm
                            control={control}
                            setValue={setValue}
                            selectedDebtor={selectedDebtor}
                            setSelectedDebtor={setSelectedDebtor}
                            isOnline={isOnline}
                            onSelectRep={(rep) => setSelectedRep(rep)}
                            selectedRep={selectedRep}
                            asType={asType}
                            setASType={setASType}
                            isEmptyCart={cartItems.length !== 0}
                            isInclusivePrice={isInclusivePrice}
                            appliedPromotionDiscount={appliedPromotionDiscount}
                        >
                            {selectedDebtor && isOnline && goodsTotal !== 0 && (
                                <div className="flex flex-col items-end">
                                    {asType === 'INVOICE' && loyaltyPointRes ? (
                                        <div className="flex !h-max items-center gap-2">
                                            <div className="w-28 shrink-0 text-xs"></div>

                                            <div className="mt-2 flex w-full items-center justify-end">
                                                <Badge className="gap-2 bg-green-600 text-xs">
                                                    {loyaltyPointRes?.redeemPointsApplied} point
                                                    {loyaltyPointRes?.redeemPointsApplied <= 1 ? '' : 's'} redeemed
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setLoyaltyPointRes(null)}
                                                        className="h-max w-max !p-0 text-red-700 hover:bg-transparent"
                                                    >
                                                        <X size="sm" />
                                                    </Button>
                                                </Badge>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="!px-0 text-xs"
                                            onClick={(e) => setIsLoyaltyRedemptionOpen(true)}
                                        >
                                            Redeem Loyalty Points?
                                        </Button>
                                    )}

                                    {evaluationPromotionName || appliedPromotion ? (
                                        <div className="flex !h-max items-center gap-2">
                                            <div className="w-28 shrink-0 text-xs"></div>

                                            <div className="mt-2 flex w-full items-center justify-end">
                                                <Badge className="gap-2 bg-green-600 text-xs">
                                                    {evaluationPromotionName ||
                                                        appliedPromotion?.promotion?.promotionDescription}
                                                    {appliedPromotion?.promotion?.promotionBatchCode
                                                        ? ` (${appliedPromotion.promotion.promotionBatchCode})`
                                                        : ''}
                                                    {appliedPromotion ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setAppliedPromotion(null)}
                                                            className="h-max w-max !p-0 text-red-700 hover:bg-transparent"
                                                        >
                                                            <X size="sm" />
                                                        </Button>
                                                    ) : null}
                                                </Badge>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="!px-0 text-xs"
                                            onClick={(e) => setIsApplyPromotionOpen(true)}
                                        >
                                            Apply Promotion
                                        </Button>
                                    )}
                                </div>
                            )}
                        </InvoiceDetailsForm>

                        <div className="mt-4 flex-1 overflow-hidden">
                            <div className="h-full overflow-y-auto">
                                <FormField
                                    control={form.control}
                                    name="items"
                                    render={({ fieldState }) => {
                                        const itemError =
                                            fieldState.error && Array.isArray(fieldState.error)
                                                ? fieldState.error
                                                : null;

                                        return (
                                            <ListOnlyTable
                                                columns={cartColumns}
                                                data={displayCartItems}
                                                staticTable={true}
                                                itemError={itemError}
                                            />
                                        );
                                    }}
                                />
                            </div>

                            {errors.items && (
                                <div className="px-4 py-2">
                                    <p className="text-xs text-red-500">{errors.items.message}</p>
                                </div>
                            )}

                            {(hasQuantityOverride || hasDiscountOverride) && (
                                <div className="flex flex-col gap-1 px-4 py-2">
                                    {hasQuantityOverride && (
                                        <span className="text-xs text-amber-600">
                                            Approval required: quantity differs from recommendation
                                        </span>
                                    )}
                                    {hasDiscountOverride && (
                                        <span className="text-xs text-amber-600">
                                            Approval required: a line discount exceeds the allowed limit
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <AcceptHintActions onShowHints={handleShowHints} onAccept={handleAccept} />
                    </form>
                </Form>

                {/* {(isProductSelectionOpen || scannedBarcode) && ( */}
                <ProductSelection
                    isOpen={isProductSelectionOpen}
                    onClose={onProductSelectionClose}
                    onSelectProduct={handleSelectProduct}
                    companyDebtorId={companyDebtorId}
                    warehouseId={authUser?.warehouseId}
                    key={companyDebtorId}
                    isOnline={isOnline}
                    isEmptyStockValidation={true}
                    autoSelectWithPrice={true}
                    scannedBarcode={scannedBarcode}
                    setScannedBarcode={setScannedBarcode}
                />

                {printData && <AccountSalesInvoiceDialog printData={printData} onClose={() => setPrintData(null)} />}

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

                {isCodPaymentDialogOpen && (
                    <Dialog
                        open={isCodPaymentDialogOpen}
                        onOpenChange={(open) => !open && setIsCodPaymentDialogOpen(false)}
                    >
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>COD Payment — Select Tender Type(s)</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold text-gray-700">COD Tender Types</h4>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={handleAddPaymentSplit}
                                    >
                                        <PlusIcon className="mr-1 h-3 w-3" />
                                        Add Tender
                                    </Button>
                                </div>

                                {paymentSplits.length === 0 ? (
                                    <div className="text-[10px] text-gray-500">No tender types added yet</div>
                                ) : (
                                    paymentSplits.map((row) => {
                                        const isCashRow = row.tenderType === TENDER_TYPES?.CASH;
                                        return (
                                            <div key={row.rowId}>
                                                <div className="flex items-center gap-1">
                                                    <Select
                                                        onValueChange={(val) =>
                                                            handlePaymentTenderChange(row.rowId, val)
                                                        }
                                                        value={row.tenderTypeId}
                                                    >
                                                        <SelectTrigger className="border-input h-7 flex-1 rounded-md border bg-white px-2 py-1 text-xs">
                                                            <SelectValue placeholder="Select tender" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {tenders
                                                                ?.filter((t) => t.status === 'ACTIVE')
                                                                .filter(
                                                                    (t) =>
                                                                        t.id === row.tenderTypeId ||
                                                                        !paymentSplits.some(
                                                                            (r) => r.tenderTypeId === t.id,
                                                                        ),
                                                                )
                                                                .map((tender: TenderDetails) => (
                                                                    <SelectItem key={tender.id} value={tender.id}>
                                                                        {tender.description}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Amount"
                                                        value={row.amount}
                                                        onChange={(e) =>
                                                            handlePaymentAmountChange(row.rowId, e.target.value)
                                                        }
                                                        className="border-input h-7 w-20 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                                    />

                                                    <Input
                                                        placeholder="Remarks"
                                                        value={row.remarks}
                                                        onChange={(e) =>
                                                            handlePaymentRemarksChange(row.rowId, e.target.value)
                                                        }
                                                        className="border-input h-7 w-20 rounded-md border bg-white px-2 py-1 text-xs"
                                                    />

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemovePaymentSplit(row.rowId)}
                                                        className="h-6 w-6 shrink-0 text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2Icon className="h-4 w-4" />
                                                        <span className="sr-only">Remove tender</span>
                                                    </Button>
                                                </div>

                                                {isCashRow && codChangeDue > 0 ? (
                                                    <div className="pt-0.5 pr-6 text-right text-[10px] font-semibold text-green-600">
                                                        Change Due: {currencySymbol} {codChangeDue.toFixed(2)}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-1 pt-1 text-[10px] text-gray-600">
                                    <span>
                                        Payable: {currencySymbol} {payableAmount.toFixed(2)}
                                    </span>
                                    <span>
                                        Paid: {currencySymbol} {totalPaid.toFixed(2)}
                                    </span>
                                    <span className={remainingAmount > 0 ? 'text-red-500' : 'text-green-600'}>
                                        Remaining: {currencySymbol} {remainingAmount.toFixed(2)}
                                    </span>
                                </div>

                                {codChangeDue > 0 ? (
                                    <div className="flex items-center justify-between pt-1 text-[10px] font-semibold text-green-600">
                                        <span>Change Due:</span>
                                        <span>
                                            {currencySymbol} {codChangeDue.toFixed(2)}
                                        </span>
                                    </div>
                                ) : null}
                            </div>

                            <DialogFooter className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsCodPaymentDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleConfirmCodPayment} disabled={remainingAmount > 0}>
                                    Confirm &amp; Create
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {cashOfficeRouting && (
                    <Dialog
                        open={!!cashOfficeRouting}
                        onOpenChange={(open) => {
                            if (!open) setCashOfficeRouting(null);
                        }}
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Payment must be collected at Cash Office</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <p className="text-muted-foreground text-sm">
                                    Invoice{' '}
                                    <span className="font-semibold">
                                        {cashOfficeRouting.invoice.invoiceNumber || '—'}
                                    </span>{' '}
                                    for{' '}
                                    <span className="font-semibold">
                                        {currencySymbol} {cashOfficeRouting.result.invoiceAmount.toFixed(2)}
                                    </span>{' '}
                                    exceeds the Cash Office payment threshold of{' '}
                                    <span className="font-semibold">
                                        {currencySymbol} {cashOfficeRouting.result.thresholdAmount.toFixed(2)}
                                    </span>
                                    . Payment cannot be collected at this terminal.
                                </p>

                                <div className="mt-4 flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setCashOfficeRouting(null);
                                            setShowPrintPrompt(true);
                                        }}
                                    >
                                        Print Invoice
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const inv = cashOfficeRouting.invoice;
                                            setCashOfficeRouting(null);
                                            router.push({
                                                pathname: '/operations/cash-office/payment-collection',
                                                query: {
                                                    source: 'ACCOUNT_SALE',
                                                    ...(inv?.id ? { invoiceId: inv.id } : {}),
                                                    ...(inv?.invoiceNumber ? { invoiceNumber: inv.invoiceNumber } : {}),
                                                    ...(inv?.companyDebtorId
                                                        ? { companyDebtorId: inv.companyDebtorId }
                                                        : {}),
                                                },
                                            });
                                        }}
                                    >
                                        Collect in Cash Office
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {isPriceLevelSelectionOpen && editingPriceLevelItem && (
                    <PriceLevelDialog
                        isOpen={isPriceLevelSelectionOpen}
                        onClose={() => {
                            setIsPriceLevelSelectionOpen(false);
                            setEditingPriceLevelItem('');
                        }}
                        onSelectPriceLevel={handleSelectPriceLevel}
                        companyStockDetailId={editingPriceLevelItem}
                        isOnline={isOnline}
                    />
                )}

                {isInventoryZero && !supervisorDetails && (
                    <SupervisorLogin
                        open={isInventoryZero}
                        onClose={() => setIsInventoryZero(false)}
                        onSuccess={(user) => setSupervisorDetails(user)}
                    />
                )}

                <BarcodeScanner onScan={handleScannedProduct} active={true} />

                {isLoyaltyRedemptionOpen && asType === 'INVOICE' && selectedDebtor && goodsTotal !== 0 && (
                    <LoyaltyPointsRedemption
                        open={isLoyaltyRedemptionOpen}
                        onClose={() => setIsLoyaltyRedemptionOpen(false)}
                        debtorId={selectedDebtor?.id}
                        totalAmount={watch('goodsTotal')}
                        onApply={(val) => setLoyaltyPointRes(val)}
                        saleType="ACCOUNT_SALE"
                    />
                )}

                {isApplyPromotionOpen && goodsTotal !== 0 && cartItems?.length !== 0 && (
                    <PromotionDialog
                        isOpen={isApplyPromotionOpen}
                        onClose={() => setIsApplyPromotionOpen(false)}
                        onApplyPromotion={handleApplyPromotion}
                        cartItems={cartItems?.map((item) => ({
                            companyStockDetailId: item.id,
                            quantity: item.quantity,
                        }))}
                    />
                )}

                <ApprovalDialog
                    open={openApproval}
                    onClose={closeApproval}
                    approvalRequestId={approval?.approvalRequestId || undefined}
                    approvals={approval?.approvals}
                    allowedMethods={approval?.allowedMethods}
                    actionLabel={approval?.actionLabel}
                    onApproved={handleApproved}
                />

                <OverrideReasonDialog
                    open={overrideReasonOpen}
                    description="This account sale exceeds the allowed discount / price / quantity limits and requires an override reason."
                    onConfirm={(reason) => closeOverrideReason(reason)}
                    onCancel={() => closeOverrideReason(null)}
                />

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
            </div>
        </PageLoader>
    );
};

export default AccountSales;
