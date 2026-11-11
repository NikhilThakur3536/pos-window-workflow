// import React, { useState, useMemo, useEffect } from 'react';
// import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
// import GoodsReturnDetailsForm from './goods-return-details-form';
// import { useForm, UseFormReturn } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { ListOnlyTable } from '@/components/list-only-table';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Form } from '@/components/ui/form';
// import { ArrowLeft, MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react';
// import { ProductSelection } from '../hoc/product-selection';
// // import { SerialNumber } from '../cash-sales/cash-sales-types';
// import { toast } from 'sonner';
// import moment from 'moment-timezone';
// import BarcodeScanner from '../hoc/bar-code-scanner';

// import {
//     GoodsReturnCartItem,
//     useCreateGoodsReturn,
//     CartItemReponse,
//     GoodsReturnsDetails,
//     GetGoodsReturnResponse,
//     goodsReturnCreateSchema,
//     GoodsReturnCreateSchema,
//     GoodsReturnInvoiceType,
// } from '@/api-queries/goods-return';

// import { CompanyStockDetailsListResponse, StockDetails } from '@/api-queries/company/stock-details';
// import GoodsReturnInvoiceDialog from './invoice/invoice-dialog';
// import { useAuthUser } from '@/stores/auth-user.store';
// import { useNetworkStore } from '@/stores/network.store';
// import { useInvoiceCountState } from '@/stores/invoice-count.store';
// import { getDBData, setDBData } from '@/offline/db';
// import { cleanDataPayload, generateUUIDForData, getIDBKey } from '@/utils/helpers';
// import { apiUrls } from '@/api-queries';
// import { CompanyCreditor } from '@/types';
// import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
// import { PageLoader } from '@/components/custom-components/PageLoader';
// import { useQueryClient } from '@tanstack/react-query';
// import { GoodsReceivingDetails } from '@/api-queries/goods-receiving';
// import { COLOR_CODES_FOR_INVOICE_FORMS } from '@/lib/constant';

// const GoodsReturnForm = ({ onClose }: { onClose: () => void }) => {
//     const queryClient = useQueryClient();

//     const isOnline = useNetworkStore((state) => state?.online);
//     const { dnInvoiceCount, setDNInvoiceCount } = useInvoiceCountState();

//     const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

//     const { mutate: createGoodsReturn, isPending } = useCreateGoodsReturn(isOnline);

//     const form = useForm<GoodsReturnCreateSchema>({
//         resolver: zodResolver(goodsReturnCreateSchema),
//         defaultValues: {
//             companyCreditorId: '',
//             name: '',
//             address: '',
//             telephone: '',
//             email: '',
//             taxNumber: 0,
//             documentGpPercentage: 0,
//             goodsTotal: 0,
//             discountAmount: 0,
//             originalDocumentId: '',
//             orderNumber: '',
//             taxAmount: 0,
//             totalQuantity: 0,
//             timezone: moment.tz.guess(),
//             debitNoteDate: new Date().toISOString().split('T')[0],
//             debitNoteNumber: '',
//             debitNoteMemo: '',
//             debitNoteInclusive: 'Yes',
//             items: [],
//         },
//     });

//     const {
//         handleSubmit,
//         control,
//         setValue,
//         watch,
//         formState: { errors },
//     } = form;

//     const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';

//     const [cartItems, setCartItems] = useState<GoodsReturnCartItem[]>([]);

//     // ----------------- Modals Start -----------------

//     const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
//     const [isSerialNumberModalOpen, setIsSerialNumberModalOpen] = useState(false);

//     const [selectedCreditor, setSelectedCreditor] = useState<CompanyCreditor | null>(null);
//     const [selectedGRV, setSelectedGRV] = useState<GoodsReceivingDetails | null>(null);
//     const [selectedRep, setSelectedRep] = useState<SalesRepresentativeDetails | null>(null);
//     const [isCreditorSelected, setIsCreditorSelected] = useState(false);

//     const [printData, setPrintData] = useState<GoodsReturnInvoiceType | null>(null);
//     // console.log("print data",printData)
    

//     // ----------------- Modals End -----------------

//     const companyCreditorId = watch('companyCreditorId');

//     useEffect(() => {
//         setIsCreditorSelected(!!companyCreditorId);
//     }, [companyCreditorId]);

//     useEffect(() => {
//         if (selectedGRV) {
//             form.setValue('originalDocumentId', selectedGRV.id);
//         } else {
//             form.setValue('originalDocumentId', undefined);
//         }
//     }, [selectedGRV]);

//     useEffect(() => {
//         const formattedCartItems: CartItemReponse[] = cartItems.map((item) => ({
//             companyStockDetailId: item.id,
//             companyTaxRateId: item.companyTaxRateId??undefined,
//             quantity: item.quantity,
//             discount: item.discount,
//             unitPrice: item.unitPrice,
//             lineTotal: item.lineTotal,
//         }));

//         setValue('items', formattedCartItems);
//     }, [cartItems, setValue]);

//     const calculateLineTotal = (item: GoodsReturnCartItem) => {
//         return item.unitPrice * item.quantity - item.discount;
//     };

//     const handleSelectProduct = (product: StockDetails) => {
//         // if (product.hasSerialNumber) {
//         //     setIsSerialNumberModalOpen(true);
//         // } else {
//         const currentItems = form.getValues('items') || [];

//         const existingItemIndex = currentItems.findIndex((item) => item.companyStockDetailId === product.id);
//         if (existingItemIndex !== -1) {
//             const existingItem = cartItems[existingItemIndex];
//             handleCartQuantityChange(existingItem.id, 1, existingItem.selectedSerialNumber);
            
//             setIsProductSelectionOpen(false);
//             setScannedBarcode('');
//             return;
//         }


//         const latestCost = product?.costTypes?.latestCost || 0;

//         const newCartItem: GoodsReturnCartItem = {
//             ...product,
//             quantity: 1,
//             companyTaxRateId: product.subCategory?.taxRate.id  || product.companyTaxRateId,
//             discount: 0,
//             unitPrice: latestCost || 0,
//             lineTotal: latestCost || 0,
//         };

//         setCartItems((prevItems) => {
//             const existingItemIndex = prevItems.findIndex(
//                 (item) => item.id === product.id && !item.selectedSerialNumber,
//             );
//             if (existingItemIndex > -1) {
//                 toast.error('This item is already in the cart!!');
//                 return prevItems;
//             }

//             setIsProductSelectionOpen(false);
//             setScannedBarcode('');
//             return [...prevItems, newCartItem];
//         });

//         // }
//     };

//     // const handleSelectSerialNumber = useCallback(
//     //     (serialNumber: SerialNumber, selectedProductForSerialNumber: StockDetails) => {
//     //         if (selectedProductForSerialNumber) {
//     //             const newCartItem: GoodsReturnCartItem = {
//     //                 ...selectedProductForSerialNumber,
//     //                 quantity: 1,
//     //                 selectedSerialNumber: serialNumber.serial,
//     //                 discount: 0,
//     //                 lineTotal: selectedProductForSerialNumber.unitPrice - 0,
//     //             };
//     //             setCartItems((prevItems) => [...prevItems, newCartItem]);
//     //         }
//     //     },
//     //     [],
//     // );

//     // Barcode Scan

//     const [scannedBarcode, setScannedBarcode] = useState<string>('');

//      const handleScannedProduct = (barcode: string) => {
//         console.log("INSIDE SCAN", companyCreditorId);
//     if (!companyCreditorId) {
//         toast.error('Please select Account Number first');
//         return;
//     }

//     setScannedBarcode(barcode);
//     // setTimeout(() => {
//     //         setIsProductSelectionOpen(true);
//     //     }, 0);
//         // setIsProductSelectionOpen(true);
//     };

//     // On product Selection close
//     function onProductSelectionClose() {
//         if (!companyCreditorId) {
//             toast.error('Please select Account Number first');
//             return;
//         }
//         setIsProductSelectionOpen(false);
//         setScannedBarcode('');
//     }

//     // Cart and Discounts

//     const handleCartQuantityChange = (companyStockDetailId: string, delta: number, selectedSerialNumber?: string) => {
//         setCartItems((prevItems) =>
//             prevItems.map((item) => {
//                 if (item.id === companyStockDetailId && item.selectedSerialNumber === selectedSerialNumber) {
//                     const newQuantity = Math.max(1, item.quantity + delta);
//                     return {
//                         ...item,
//                         quantity: newQuantity,
//                         lineTotal: calculateLineTotal({
//                             ...item,
//                             quantity: newQuantity,
//                             unitPrice: item?.unitPrice || 0,
//                             discount: item.discount,
//                         }),
//                     };
//                 }
//                 return item;
//             }),
//         );
//     };

//     const handleCartPriceChange = (companyStockDetailId: string, price: number) => {
//         setCartItems((prevItems) =>
//             prevItems.map((item) => {
//                 if (item.id === companyStockDetailId) {
//                     const newPrice = isNaN(price) ? 0 : price;
//                     return {
//                         ...item,
//                         unitPrice: newPrice,
//                         lineTotal: calculateLineTotal({
//                             ...item,
//                             unitPrice: newPrice,
//                             discount: item.discount,
//                         }),
//                     };
//                 }
//                 return item;
//             }),
//         );
//     };

//     const handleUpdateLineDiscount = (
//         companyStockDetailId: string,
//         newDiscount: number,
//         selectedSerialNumber?: string,
//     ) => {
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

//     const handleRemoveFromCart = (companyStockDetailId: string, selectedSerialNumber?: string) => {
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
//     const totalUnitProductAmount = useMemo(
//         () => cartItems.reduce((sum, item) => sum + (item.unitPrice || 0), 0),
//         [cartItems],
//     );
//     const taxAmount = useMemo(() => 0, [cartItems]);
//     const totalQuantity = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

//     useEffect(() => {
//         setValue('goodsTotal', +(goodsTotal - discountAmount).toFixed(2));
//         setValue('discountAmount', discountAmount);
//         setValue('taxAmount', taxAmount);
//         setValue('totalQuantity', totalQuantity);
//     }, [goodsTotal, discountAmount, taxAmount, totalQuantity, setValue]);

//     const cartColumns = useMemo(
//         () => [
//             {
//                 key: 'itemCode',
//                 label: 'Code',
//                 className: 'w-[120px]',
//                 render: (item: GoodsReturnCartItem) => {
//                     if (item.isNewRow) {
//                         return selectedGRV ? null : (
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
//                 render: (item: GoodsReturnCartItem) => item.description,
//             },
//             ...(selectedGRV
//                 ? []
//                 : [
//                       {
//                           key: 'stock',
//                           label: 'Stock',
//                           className: 'w-[60px] text-center',
//                           render: (item: GoodsReturnCartItem) => {
//                               const remainingStock = +item?.stockOnHand - item?.quantity;
//                               return item.isNewRow ? null : (
//                                   <div
//                                       className={`font-semibold ${remainingStock <= 5 ? 'text-red-600' : 'text-green-700'}`}
//                                   >
//                                       {remainingStock}
//                                   </div>
//                               );
//                           },
//                       },
//                   ]),
//             {
//                 key: 'quantity',
//                 label: 'Qty',
//                 className: 'w-[100px] text-center',
//                 render: (item: GoodsReturnCartItem) =>
//                     item.isNewRow ? (
//                         <span className="h-6 w-full text-sm font-semibold">{watch('totalQuantity')}</span>
//                     ) : (
//                         <div className="flex items-center justify-center gap-1">
//                             <Button
//                                 variant="outline"
//                                 size="icon"
//                                 className="h-6 w-6 bg-transparent"
//                                 onClick={(e) => {
//                                     e.preventDefault();
//                                     handleCartQuantityChange(item.id, -1, item.selectedSerialNumber);
//                                 }}
//                             >
//                                 <MinusIcon className="h-3 w-3" />
//                                 <span className="sr-only">Decrease quantity</span>
//                             </Button>
//                             <Input
//                                 type="number"
//                                 value={item.quantity}
//                                 readOnly
//                                 className="h-6 w-10 p-0 text-center text-xs"
//                             />
//                             <Button
//                                 variant="outline"
//                                 size="icon"
//                                 className="h-6 w-6 bg-transparent"
//                                 onClick={(e) => {
//                                     const selectedGRVItems = selectedGRV?.[
//                                         isCompanyDebtor
//                                             ? 'DebtorGoodsReceivingOrderItems'
//                                             : 'CreditorGoodsReceivingOrderItems'
//                                     ]?.find((grvCart) => grvCart.companyStockDetailId === item.id);
//                                     e.preventDefault();
//                                     item.stockOnHand === item.quantity
//                                         ? toast.error('Max limit reached')
//                                         : (selectedGRVItems?.quantity || 0) + (selectedGRVItems?.freeStock || 0) ===
//                                             item.quantity
//                                           ? toast.error('Max limit reached')
//                                           : handleCartQuantityChange(item.id, 1, item.selectedSerialNumber);
//                                 }}
//                             >
//                                 <PlusIcon className="h-3 w-3" />
//                                 <span className="sr-only">Increase quantity</span>
//                             </Button>
//                         </div>
//                     ),
//             },
//             {
//                 key: 'unitPrice',
//                 label: 'Product Price',
//                 className: 'w-[80px] text-right',
//                 render: (item: GoodsReturnCartItem) =>
//                     item.isNewRow ? (
//                         <span className="h-6 w-full justify-end text-sm font-semibold">
//                             {currencySymbol} {totalUnitProductAmount.toFixed(2)}
//                         </span>
//                     ) : (
//                         <Input
//                             type="number"
//                             defaultValue={item.unitPrice.toFixed(2)}
//                             step="0.01"
//                             className="h-6 w-full p-0 text-right text-xs"
//                             onBlur={(e) => {
//                                 const parsed = parseFloat(e.target.value);
//                                 if (!isNaN(parsed)) {
//                                     handleCartPriceChange(item.id, parsed);
//                                 }
//                             }}
//                         />
//                     ),
//             },
//             {
//                 key: 'discount',
//                 label: 'Disc.',
//                 className: 'w-[80px] text-right',
//                 render: (item: GoodsReturnCartItem) => {
//                     if (item.isNewRow)
//                         return (
//                             <span className="h-6 w-full justify-end text-sm font-semibold">
//                                 {currencySymbol} {discountAmount.toFixed(2)}
//                             </span>
//                         );

//                     return (
//                         <Input
//                             type="number"
//                             defaultValue={item.discount.toFixed(2)}
//                             onBlur={(e) => {
//                                 const parsed = parseFloat(e.target.value);
//                                 if (!isNaN(parsed)) {
//                                     handleUpdateLineDiscount(item.id, parsed, item.selectedSerialNumber);
//                                 }
//                             }}
//                             step="0.01"
//                             className="h-6 w-full p-0 text-right text-xs"
//                         />
//                     );
//                 },
//             },
//             {
//                 key: 'lineTotal',
//                 label: 'Total',
//                 className: 'w-[80px] text-right font-semibold',
//                 render: (item: GoodsReturnCartItem) =>
//                     item.isNewRow ? (
//                         <span className="h-6 w-full justify-end text-sm font-semibold">
//                             {currencySymbol} {watch('goodsTotal')?.toFixed(2) || '0.00'}
//                         </span>
//                     ) : (
//                         `${item.lineTotal.toFixed(2)}`
//                     ),
//             },
//             {
//                 key: 'delete',
//                 label: 'Delete',
//                 className: 'w-[60px] text-center',
//                 render: (item: GoodsReturnCartItem) =>
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
//         ],
//         [
//             handleCartPriceChange,
//             handleCartQuantityChange,
//             handleRemoveFromCart,
//             handleUpdateLineDiscount,
//             watch,
//             totalUnitProductAmount,
//             discountAmount,
//         ],
//     );

//     const displayCartItems = useMemo(() => {
//         if (isCreditorSelected) {
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
//     }, [cartItems, isCreditorSelected]);

//     const resetFormAndStatesAfterSubmission = (form: UseFormReturn<GoodsReturnCreateSchema>) => {
//         form.reset();
//         setIsCreditorSelected(false);
//         setSelectedCreditor(null);
//         setCartItems([]);
//         setSelectedRep(null);
//         setSelectedGRV(null);
//         setDNInvoiceCount(dnInvoiceCount + 1);
//     };

//     useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//         const target = e.target as HTMLElement;
//         const isTyping =
//             target.tagName === 'INPUT' ||
//             target.tagName === 'TEXTAREA' ||
//             target.getAttribute('contenteditable') === 'true';

//         if (isTyping) return;

//         if (e.key.toLowerCase() === 'p') {
//             e.preventDefault();

//             if (!companyCreditorId) {
//                 toast.error('Please select Account Number first');
//                 return;
//             }

//             setIsProductSelectionOpen(true);
//         }
//     };

//     window.addEventListener('keydown', handleKeyDown);

//     return () => {
//         window.removeEventListener('keydown', handleKeyDown);
//     };
// }, [companyCreditorId]);

//     function onSubmit(values: GoodsReturnCreateSchema) {
//         if (!selectedCreditor) return;

//         const cleanedPayload = cleanDataPayload(values);

//         createGoodsReturn(cleanedPayload as GoodsReturnCreateSchema, {
//             onSuccess: async (data) => {
//                 if (data.success) {
//                     toast.success('Goods returned successfully');
//                     if (isOnline) {
//                         setPrintData({
//                             goodsReturn: data.data,
//                             cartItems: data.data.debitNoteItems,
//                             accountNumber: data.data.CompanyCreditor.accountNumber,
//                         });
//                     } else {
//                         // Offline Print data

//                         setPrintData({
//                             goodsReturn: values,
//                             cartItems: cartItems.map((item) => {
//                                 const { quantity, discount, unitPrice, ...product } = item;
//                                 return {
//                                     quantity,
//                                     discount,
//                                     unitPrice,
//                                     lineTotal: item?.unitPrice * item.quantity - item.discount || 0,
//                                     CompanyStockDetail: product,
//                                 };
//                             }),
//                             accountNumber: selectedCreditor?.accountNumber,
//                         });

//                         // Saving data to indexedDB

//                         const offlineGoodsReturnsData = (await getDBData(
//                             getIDBKey(apiUrls.goodsReturn),
//                         )) as GetGoodsReturnResponse;

//                         const offlineGoodsReturn: GoodsReturnsDetails = {
//                             ...values,
//                             CompanyCreditor: selectedCreditor,
//                             id: generateUUIDForData(),
//                             debitNoteItems: cartItems.map((item) => {
//                                 const { quantity, discount, unitPrice, ...product } = item;
//                                 return {
//                                     quantity,
//                                     discount,
//                                     unitPrice,
//                                     lineTotal: item?.unitPrice * item.quantity - item.discount || 0,
//                                     CompanyStockDetail: product,
//                                 };
//                             }),
//                             createdAt: values.debitNoteDate,
//                             notSynced: true,
//                             ...(selectedRep ? { representativeId: selectedRep.id } : {}),
//                             ...(selectedRep ? { SalesRepresentative: selectedRep } : {}),
//                         };

//                         const updateOfflineGoodsReturnsData: GetGoodsReturnResponse = {
//                             success: true,
//                             message: 'Goods returned successfully',
//                             data: {
//                                 rows: [offlineGoodsReturn, ...offlineGoodsReturnsData.data.rows],
//                                 count: offlineGoodsReturnsData?.data?.count + 1,
//                             },
//                         };

//                         await setDBData(getIDBKey(apiUrls.goodsReturn), updateOfflineGoodsReturnsData);
//                         queryClient.setQueryData(
//                             [getIDBKey(apiUrls.goodsReturn), false],
//                             updateOfflineGoodsReturnsData,
//                         );

//                         // Stock Update
//                         const offlineStockDetailsData = (await getDBData(
//                             getIDBKey(apiUrls.stocks),
//                         )) as CompanyStockDetailsListResponse;

//                         const updatedStockDetailsData: CompanyStockDetailsListResponse = {
//                             ...offlineStockDetailsData,
//                             data: {
//                                 count: offlineStockDetailsData?.data?.count,
//                                 rows: offlineStockDetailsData?.data?.rows?.map((row) => {
//                                     const cartItem = values.items.find((item) => item.companyStockDetailId === row.id);
//                                     if (cartItem)
//                                         return {
//                                             ...row,
//                                             stockOnHand: row.stockOnHand - cartItem.quantity,
//                                         };
//                                     else return row;
//                                 }),
//                             },
//                         };

//                         await setDBData(getIDBKey(apiUrls.stocks), updatedStockDetailsData);
//                         queryClient.setQueryData([getIDBKey(apiUrls.stocks), false], updatedStockDetailsData);
//                     }
//                     resetFormAndStatesAfterSubmission(form);
//                 } else {
//                     toast.error('Account Sales creation failed');
//                 }
//             },
//             onError: (error) => {
//                 // @ts-ignore
//                 toast.error(error?.response?.data?.message || 'Internal Server Error!');
//             },
//         });
//     }

//     const handleShowHints = () => {
//         console.log('Show Hints clicked for account sales');
//     };

//     const handleAccept = () => {
//         handleSubmit(onSubmit)();
//     };

//     useEffect(() => {
//         if (selectedGRV) {
//             setCartItems(
//                 selectedGRV[
//                     isCompanyDebtor ? 'DebtorGoodsReceivingOrderItems' : 'CreditorGoodsReceivingOrderItems'
//                 ]?.map((item) => ({
//                     ...item.CompanyStockDetail,
//                     ...(item.taxRateId ? { companyTaxRateId: item.taxRateId } : {}),
//                     unitPrice: item.unitPrice,
//                     quantity: item.quantity + (item.freeStock || 0),
//                     discount: item.discount,
//                     lineTotal: item.lineTotal,
//                 })),
//             );
//         } else {
//             setCartItems([]);
//         }
//     }, [selectedGRV]);

//     return (
//         <PageLoader isLoading={isPending}>
//             <div className={`flex flex-col ${COLOR_CODES_FOR_INVOICE_FORMS?.DEBIT_NOTE}`}>
//                 <h1 className="px-4 py-2 text-2xl font-bold">Goods Return</h1>

//                 <Form {...form}>
//                     <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
//                         <GoodsReturnDetailsForm
//                             control={control}
//                             setValue={setValue}
//                             selectedCreditor={selectedCreditor}
//                             setSelectedCreditor={setSelectedCreditor}
//                             isOnline={isOnline}
//                             selectedRep={selectedRep}
//                             onSelectRep={(rep) => setSelectedRep(rep)}
//                             selectedGRV={selectedGRV}
//                             onSelectGRV={(grv) => setSelectedGRV(grv)}
//                         />

//                         <div className="mt-4 flex-1 overflow-hidden">
//                             <div className="h-full overflow-y-auto">
//                                 <ListOnlyTable columns={cartColumns} data={displayCartItems} staticTable={true} />
//                             </div>

//                             {/* Display cart items validation error */}
//                             {errors.items && (
//                                 <div className="px-4 py-2">
//                                     <p className="text-xs text-red-500">{errors.items.message}</p>
//                                 </div>
//                             )}
//                         </div>

//                         <AcceptHintActions onShowHints={handleShowHints} onAccept={handleAccept}>
//                             <Button variant="secondary" onClick={() => onClose()}>
//                                 <ArrowLeft /> Back
//                             </Button>
//                         </AcceptHintActions>
//                     </form>
//                 </Form>

//                 {(isProductSelectionOpen || scannedBarcode) && (
//                     <ProductSelection
//                         isOpen={isProductSelectionOpen}
//                         onClose={onProductSelectionClose}
//                         onSelectProduct={handleSelectProduct}
//                         companyDebtorId={companyCreditorId}
//                         key={companyCreditorId || ''}
//                         isOnline={isOnline}
//                         isEmptyStockValidation={true}
//                         scannedBarcode={scannedBarcode}
//                         setScannedBarcode={setScannedBarcode}
//                         isGRV={true}
//                         // onSelectSerialNumber={handleSelectSerialNumber}
//                         // isSerialNumberOpen={isSerialNumberModalOpen}
//                         // setIsSerialNumberOpen={setIsSerialNumberModalOpen}
//                     />
//                 )}

//                 {printData && (
//                     <GoodsReturnInvoiceDialog
//                         printData={printData}
//                         onClose={() => {
//                             setPrintData(null);
//                             onClose();
//                         }}
//                     />
//                 )}

//                 <BarcodeScanner onScan={handleScannedProduct} active={true}/>
//             </div>
//         </PageLoader>
//     );
// };

// export default GoodsReturnForm;
import React, { useState, useMemo, useEffect } from 'react';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import GoodsReturnDetailsForm from './goods-return-details-form';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { ListOnlyTable } from '@/components/list-only-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form } from '@/components/ui/form';
import { ArrowLeft, MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { ProductSelection } from '../hoc/product-selection';
// import { SerialNumber } from '../cash-sales/cash-sales-types';
import { toast } from 'sonner';
import moment from 'moment-timezone';
import BarcodeScanner from '../hoc/bar-code-scanner';

import {
    GoodsReturnCartItem,
    useCreateGoodsReturn,
    CartItemReponse,
    GoodsReturnsDetails,
    GetGoodsReturnResponse,
    goodsReturnCreateSchema,
    GoodsReturnCreateSchema,
    GoodsReturnInvoiceType,
} from '@/api-queries/goods-return';

import { CompanyStockDetailsListResponse, StockDetails } from '@/api-queries/company/stock-details';
import GoodsReturnInvoiceDialog from './invoice/invoice-dialog';
import { useAuthUser } from '@/stores/auth-user.store';
import { useNetworkStore } from '@/stores/network.store';
import { useInvoiceCountState } from '@/stores/invoice-count.store';
import { getDBData, setDBData } from '@/offline/db';
import { cleanDataPayload, generateUUIDForData, getIDBKey } from '@/utils/helpers';
import { apiUrls } from '@/api-queries';
import { CompanyCreditor } from '@/types';
import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useQueryClient } from '@tanstack/react-query';
import { GoodsReceivingDetails } from '@/api-queries/goods-receiving';
import { COLOR_CODES_FOR_INVOICE_FORMS } from '@/lib/constant';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const GoodsReturnForm = ({ onClose }: { onClose: () => void }) => {
    const queryClient = useQueryClient();

    const isOnline = useNetworkStore((state) => state?.online);
    const { dnInvoiceCount, setDNInvoiceCount } = useInvoiceCountState();

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const { mutate: createGoodsReturn, isPending } = useCreateGoodsReturn(isOnline);

    const form = useForm<GoodsReturnCreateSchema>({
        resolver: zodResolver(goodsReturnCreateSchema),
        defaultValues: {
            companyCreditorId: '',
            name: '',
            address: '',
            telephone: '',
            email: '',
            taxNumber: 0,
            documentGpPercentage: 0,
            goodsTotal: 0,
            discountAmount: 0,
            originalDocumentId: '',
            orderNumber: '',
            taxAmount: 0,
            totalQuantity: 0,
            timezone: moment.tz.guess(),
            debitNoteDate: new Date().toISOString().split('T')[0],
            debitNoteNumber: '',
            debitNoteMemo: '',
            debitNoteInclusive: 'Yes',
            items: [],
        },
    });

    const {
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors },
    } = form;

    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';

    const [cartItems, setCartItems] = useState<GoodsReturnCartItem[]>([]);

    // ----------------- Modals Start -----------------

    const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
    const [isSerialNumberModalOpen, setIsSerialNumberModalOpen] = useState(false);

    const [selectedCreditor, setSelectedCreditor] = useState<CompanyCreditor | null>(null);
    const [selectedGRV, setSelectedGRV] = useState<GoodsReceivingDetails | null>(null);
    const [selectedRep, setSelectedRep] = useState<SalesRepresentativeDetails | null>(null);
    const [isCreditorSelected, setIsCreditorSelected] = useState(false);

    const [printData, setPrintData] = useState<GoodsReturnInvoiceType | null>(null);
    // console.log("print data",printData)

    const [pendingPrintData, setPendingPrintData] = useState<GoodsReturnInvoiceType | null>(null);
    const [showPrintPrompt, setShowPrintPrompt] = useState(false);

    // ----------------- Modals End -----------------

    const companyCreditorId = watch('companyCreditorId');

    useEffect(() => {
        setIsCreditorSelected(!!companyCreditorId);
    }, [companyCreditorId]);

    useEffect(() => {
        if (selectedGRV) {
            form.setValue('originalDocumentId', selectedGRV.id);
        } else {
            form.setValue('originalDocumentId', undefined);
        }
    }, [selectedGRV]);

    useEffect(() => {
        const formattedCartItems: CartItemReponse[] = cartItems.map((item) => ({
            companyStockDetailId: item.id,
            companyTaxRateId: item.companyTaxRateId??undefined,
            quantity: item.quantity,
            discount: item.discount,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
        }));

        setValue('items', formattedCartItems);
    }, [cartItems, setValue]);

    const calculateLineTotal = (item: GoodsReturnCartItem) => {
        return item.unitPrice * item.quantity - item.discount;
    };

    const handleSelectProduct = (product: StockDetails, scannedBaseQuantity = 1) => {
        // if (product.hasSerialNumber) {
        //     setIsSerialNumberModalOpen(true);
        // } else {
        const sourceItems = selectedGRV?.[
            isCompanyDebtor ? 'DebtorGoodsReceivingOrderItems' : 'CreditorGoodsReceivingOrderItems'
        ];
        const sourceItem = sourceItems?.find((item) => item.companyStockDetailId === product.id);
        if (selectedGRV && !sourceItem) {
            toast.error('Goods return items must come from the selected GRV.');
            return;
        }

        const quantity = Math.max(1, Number(scannedBaseQuantity) || 1);
        const existingItem = cartItems.find((item) => item.id === product.id && !item.selectedSerialNumber);
        if (existingItem) {
            handleCartQuantityChange(existingItem.id, quantity, existingItem.selectedSerialNumber);
            
            setIsProductSelectionOpen(false);
            setScannedBarcode('');
            return;
        }


        const latestCost = product?.costTypes?.latestCost || 0;

        const newCartItem: GoodsReturnCartItem = {
            ...product,
            quantity,
            companyTaxRateId: product.subCategory?.taxRate.id  || product.companyTaxRateId,
            discount: 0,
            unitPrice: latestCost || 0,
            lineTotal: (latestCost || 0) * quantity,
        };

        setCartItems((prevItems) => {
            const existingItemIndex = prevItems.findIndex(
                (item) => item.id === product.id && !item.selectedSerialNumber,
            );
            if (existingItemIndex > -1) {
                toast.error('This item is already in the cart!!');
                return prevItems;
            }

            setIsProductSelectionOpen(false);
            setScannedBarcode('');
            return [...prevItems, newCartItem];
        });

        // }
    };

    // const handleSelectSerialNumber = useCallback(
    //     (serialNumber: SerialNumber, selectedProductForSerialNumber: StockDetails) => {
    //         if (selectedProductForSerialNumber) {
    //             const newCartItem: GoodsReturnCartItem = {
    //                 ...selectedProductForSerialNumber,
    //                 quantity: 1,
    //                 selectedSerialNumber: serialNumber.serial,
    //                 discount: 0,
    //                 lineTotal: selectedProductForSerialNumber.unitPrice - 0,
    //             };
    //             setCartItems((prevItems) => [...prevItems, newCartItem]);
    //         }
    //     },
    //     [],
    // );

    // Barcode Scan

    const [scannedBarcode, setScannedBarcode] = useState<string>('');

     const handleScannedProduct = (barcode: string) => {
        console.log("INSIDE SCAN", companyCreditorId);
    if (!companyCreditorId) {
        toast.error('Please select Account Number first');
        return;
    }

    setScannedBarcode(barcode);
    // setTimeout(() => {
    //         setIsProductSelectionOpen(true);
    //     }, 0);
        // setIsProductSelectionOpen(true);
    };

    // On product Selection close
    function onProductSelectionClose() {
        if (!companyCreditorId) {
            toast.error('Please select Account Number first');
            return;
        }
        setIsProductSelectionOpen(false);
        setScannedBarcode('');
    }

    // Cart and Discounts

    const handleCartQuantityChange = (companyStockDetailId: string, delta: number, selectedSerialNumber?: string) => {
        setCartItems((prevItems) =>
            prevItems.map((item) => {
                if (item.id === companyStockDetailId && item.selectedSerialNumber === selectedSerialNumber) {
                    const newQuantity = Math.max(1, item.quantity + delta);
                    const sourceItems = selectedGRV?.[
                        isCompanyDebtor ? 'DebtorGoodsReceivingOrderItems' : 'CreditorGoodsReceivingOrderItems'
                    ];
                    const sourceItem = sourceItems?.find((source) => source.companyStockDetailId === item.id);
                    const maxAllowed = sourceItem
                        ? Number(sourceItem.quantity || 0) + Number(sourceItem.freeStock || 0)
                        : undefined;
                    if (selectedGRV && (maxAllowed === undefined || newQuantity > maxAllowed)) {
                        toast.error('Max limit reached');
                        return item;
                    }
                    return {
                        ...item,
                        quantity: newQuantity,
                        lineTotal: calculateLineTotal({
                            ...item,
                            quantity: newQuantity,
                            unitPrice: item?.unitPrice || 0,
                            discount: item.discount,
                        }),
                    };
                }
                return item;
            }),
        );
    };

    const handleCartPriceChange = (companyStockDetailId: string, price: number) => {
        setCartItems((prevItems) =>
            prevItems.map((item) => {
                if (item.id === companyStockDetailId) {
                    const newPrice = isNaN(price) ? 0 : price;
                    return {
                        ...item,
                        unitPrice: newPrice,
                        lineTotal: calculateLineTotal({
                            ...item,
                            unitPrice: newPrice,
                            discount: item.discount,
                        }),
                    };
                }
                return item;
            }),
        );
    };

    const handleUpdateLineDiscount = (
        companyStockDetailId: string,
        newDiscount: number,
        selectedSerialNumber?: string,
    ) => {
        setCartItems((prevItems) =>
            prevItems.map((item) => {
                if (item.id === companyStockDetailId && item.selectedSerialNumber === selectedSerialNumber) {
                    const discount = Math.max(0, newDiscount);
                    return {
                        ...item,
                        discount: discount,
                        lineTotal: calculateLineTotal({
                            ...item,
                            discount: discount,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice || 0,
                        }),
                    };
                }
                return item;
            }),
        );
    };

    const handleRemoveFromCart = (companyStockDetailId: string, selectedSerialNumber?: string) => {
        setCartItems((prevItems) =>
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
    const totalUnitProductAmount = useMemo(
        () => cartItems.reduce((sum, item) => sum + (item.unitPrice || 0), 0),
        [cartItems],
    );
    const taxAmount = useMemo(() => 0, [cartItems]);
    const totalQuantity = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

    useEffect(() => {
        setValue('goodsTotal', +(goodsTotal - discountAmount).toFixed(2));
        setValue('discountAmount', discountAmount);
        setValue('taxAmount', taxAmount);
        setValue('totalQuantity', totalQuantity);
    }, [goodsTotal, discountAmount, taxAmount, totalQuantity, setValue]);

    const cartColumns = useMemo(
        () => [
            {
                key: 'itemCode',
                label: 'Code',
                className: 'w-[120px]',
                render: (item: GoodsReturnCartItem) => {
                    if (item.isNewRow) {
                        return selectedGRV ? null : (
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
                render: (item: GoodsReturnCartItem) => item.description,
            },
            ...(selectedGRV
                ? []
                : [
                      {
                          key: 'stock',
                          label: 'Stock',
                          className: 'w-[60px] text-center',
                          render: (item: GoodsReturnCartItem) => {
                              const remainingStock = +item?.stockOnHand - item?.quantity;
                              return item.isNewRow ? null : (
                                  <div
                                      className={`font-semibold ${remainingStock <= 5 ? 'text-red-600' : 'text-green-700'}`}
                                  >
                                      {remainingStock}
                                  </div>
                              );
                          },
                      },
                  ]),
            {
                key: 'quantity',
                label: 'Qty',
                className: 'w-[100px] text-center',
                render: (item: GoodsReturnCartItem) =>
                    item.isNewRow ? (
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
                                    const selectedGRVItems = selectedGRV?.[
                                        isCompanyDebtor
                                            ? 'DebtorGoodsReceivingOrderItems'
                                            : 'CreditorGoodsReceivingOrderItems'
                                    ]?.find((grvCart) => grvCart.companyStockDetailId === item.id);
                                    e.preventDefault();
                                    item.stockOnHand === item.quantity
                                        ? toast.error('Max limit reached')
                                        : (selectedGRVItems?.quantity || 0) + (selectedGRVItems?.freeStock || 0) ===
                                            item.quantity
                                          ? toast.error('Max limit reached')
                                          : handleCartQuantityChange(item.id, 1, item.selectedSerialNumber);
                                }}
                            >
                                <PlusIcon className="h-3 w-3" />
                                <span className="sr-only">Increase quantity</span>
                            </Button>
                        </div>
                    ),
            },
            {
                key: 'unitPrice',
                label: 'Product Price',
                className: 'w-[80px] text-right',
                render: (item: GoodsReturnCartItem) =>
                    item.isNewRow ? (
                        <span className="h-6 w-full justify-end text-sm font-semibold">
                            {currencySymbol} {totalUnitProductAmount.toFixed(2)}
                        </span>
                    ) : (
                        <Input
                            type="number"
                            defaultValue={item.unitPrice.toFixed(2)}
                            step="0.01"
                            className="h-6 w-full p-0 text-right text-xs"
                            onBlur={(e) => {
                                const parsed = parseFloat(e.target.value);
                                if (!isNaN(parsed)) {
                                    handleCartPriceChange(item.id, parsed);
                                }
                            }}
                        />
                    ),
            },
            {
                key: 'discount',
                label: 'Disc.',
                className: 'w-[80px] text-right',
                render: (item: GoodsReturnCartItem) => {
                    if (item.isNewRow)
                        return (
                            <span className="h-6 w-full justify-end text-sm font-semibold">
                                {currencySymbol} {discountAmount.toFixed(2)}
                            </span>
                        );

                    return (
                        <Input
                            type="number"
                            defaultValue={item.discount.toFixed(2)}
                            onBlur={(e) => {
                                const parsed = parseFloat(e.target.value);
                                if (!isNaN(parsed)) {
                                    handleUpdateLineDiscount(item.id, parsed, item.selectedSerialNumber);
                                }
                            }}
                            step="0.01"
                            className="h-6 w-full p-0 text-right text-xs"
                        />
                    );
                },
            },
            {
                key: 'lineTotal',
                label: 'Total',
                className: 'w-[80px] text-right font-semibold',
                render: (item: GoodsReturnCartItem) =>
                    item.isNewRow ? (
                        <span className="h-6 w-full justify-end text-sm font-semibold">
                            {currencySymbol} {watch('goodsTotal')?.toFixed(2) || '0.00'}
                        </span>
                    ) : (
                        `${item.lineTotal.toFixed(2)}`
                    ),
            },
            {
                key: 'delete',
                label: 'Delete',
                className: 'w-[60px] text-center',
                render: (item: GoodsReturnCartItem) =>
                    item.isNewRow ? null : (
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
        ],
        [
            handleCartPriceChange,
            handleCartQuantityChange,
            handleRemoveFromCart,
            handleUpdateLineDiscount,
            watch,
            totalUnitProductAmount,
            discountAmount,
        ],
    );

    const displayCartItems = useMemo(() => {
        if (isCreditorSelected) {
            return [
                ...cartItems,
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
        return cartItems;
    }, [cartItems, isCreditorSelected]);

    const resetFormAndStatesAfterSubmission = (form: UseFormReturn<GoodsReturnCreateSchema>) => {
        form.reset();
        setIsCreditorSelected(false);
        setSelectedCreditor(null);
        setCartItems([]);
        setSelectedRep(null);
        setSelectedGRV(null);
        setDNInvoiceCount(dnInvoiceCount + 1);
    };

    useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isTyping =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.getAttribute('contenteditable') === 'true';

        if (isTyping) return;

        if (e.key.toLowerCase() === 'p') {
            e.preventDefault();

            if (!companyCreditorId) {
                toast.error('Please select Account Number first');
                return;
            }

            setIsProductSelectionOpen(true);
        }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
}, [companyCreditorId]);

    function onSubmit(values: GoodsReturnCreateSchema) {
        if (!selectedCreditor) return;

        const cleanedPayload = cleanDataPayload(values);

        createGoodsReturn(cleanedPayload as GoodsReturnCreateSchema, {
            onSuccess: async (data) => {
                if (data.success) {
                    toast.success('Goods returned successfully');
                    if (isOnline) {
                        setPendingPrintData({
                            goodsReturn: data.data,
                            cartItems: data.data.debitNoteItems,
                            accountNumber: data.data.CompanyCreditor.accountNumber,
                        });
                    } else {
                        // Offline Print data

                        setPendingPrintData({
                            goodsReturn: values,
                            cartItems: cartItems.map((item) => {
                                const { quantity, discount, unitPrice, ...product } = item;
                                return {
                                    quantity,
                                    discount,
                                    unitPrice,
                                    lineTotal: item?.unitPrice * item.quantity - item.discount || 0,
                                    CompanyStockDetail: product,
                                };
                            }),
                            accountNumber: selectedCreditor?.accountNumber,
                        });

                        // Saving data to indexedDB

                        const offlineGoodsReturnsData = (await getDBData(
                            getIDBKey(apiUrls.goodsReturn),
                        )) as GetGoodsReturnResponse;

                        const offlineGoodsReturn: GoodsReturnsDetails = {
                            ...values,
                            CompanyCreditor: selectedCreditor,
                            id: generateUUIDForData(),
                            debitNoteItems: cartItems.map((item) => {
                                const { quantity, discount, unitPrice, ...product } = item;
                                return {
                                    quantity,
                                    discount,
                                    unitPrice,
                                    lineTotal: item?.unitPrice * item.quantity - item.discount || 0,
                                    CompanyStockDetail: product,
                                };
                            }),
                            createdAt: values.debitNoteDate,
                            notSynced: true,
                            ...(selectedRep ? { representativeId: selectedRep.id } : {}),
                            ...(selectedRep ? { SalesRepresentative: selectedRep } : {}),
                        };

                        const updateOfflineGoodsReturnsData: GetGoodsReturnResponse = {
                            success: true,
                            message: 'Goods returned successfully',
                            data: {
                                rows: [offlineGoodsReturn, ...offlineGoodsReturnsData.data.rows],
                                count: offlineGoodsReturnsData?.data?.count + 1,
                            },
                        };

                        await setDBData(getIDBKey(apiUrls.goodsReturn), updateOfflineGoodsReturnsData);
                        queryClient.setQueryData(
                            [getIDBKey(apiUrls.goodsReturn), false],
                            updateOfflineGoodsReturnsData,
                        );

                        // Stock Update
                        const offlineStockDetailsData = (await getDBData(
                            getIDBKey(apiUrls.stocks),
                        )) as CompanyStockDetailsListResponse;

                        const updatedStockDetailsData: CompanyStockDetailsListResponse = {
                            ...offlineStockDetailsData,
                            data: {
                                count: offlineStockDetailsData?.data?.count,
                                rows: offlineStockDetailsData?.data?.rows?.map((row) => {
                                    const cartItem = values.items.find((item) => item.companyStockDetailId === row.id);
                                    if (cartItem)
                                        return {
                                            ...row,
                                            stockOnHand: row.stockOnHand - cartItem.quantity,
                                        };
                                    else return row;
                                }),
                            },
                        };

                        await setDBData(getIDBKey(apiUrls.stocks), updatedStockDetailsData);
                        queryClient.setQueryData([getIDBKey(apiUrls.stocks), false], updatedStockDetailsData);
                    }
                    setShowPrintPrompt(true);
                    resetFormAndStatesAfterSubmission(form);
                } else {
                    toast.error('Account Sales creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    const handleShowHints = () => {
        console.log('Show Hints clicked for account sales');
    };

    const handleAccept = () => {
        handleSubmit(onSubmit)();
    };

    const handlePrintPromptAnswer = (shouldPrint: boolean) => {
        if (shouldPrint && pendingPrintData) {
            setPrintData(pendingPrintData);
        } else {
            onClose();
        }
        setShowPrintPrompt(false);
        setPendingPrintData(null);
    };

    useEffect(() => {
        if (selectedGRV) {
            setCartItems(
                selectedGRV[
                    isCompanyDebtor ? 'DebtorGoodsReceivingOrderItems' : 'CreditorGoodsReceivingOrderItems'
                ]?.map((item) => ({
                    ...item.CompanyStockDetail,
                    ...(item.taxRateId ? { companyTaxRateId: item.taxRateId } : {}),
                    unitPrice: item.unitPrice,
                    quantity: item.quantity + (item.freeStock || 0),
                    discount: item.discount,
                    lineTotal: item.lineTotal,
                })),
            );
        } else {
            setCartItems([]);
        }
    }, [selectedGRV]);

    return (
        <PageLoader isLoading={isPending}>
            <div className={`flex flex-col ${COLOR_CODES_FOR_INVOICE_FORMS?.DEBIT_NOTE}`}>
                <h1 className="px-4 py-2 text-2xl font-bold">Goods Return</h1>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
                        <GoodsReturnDetailsForm
                            control={control}
                            setValue={setValue}
                            selectedCreditor={selectedCreditor}
                            setSelectedCreditor={setSelectedCreditor}
                            isOnline={isOnline}
                            selectedRep={selectedRep}
                            onSelectRep={(rep) => setSelectedRep(rep)}
                            selectedGRV={selectedGRV}
                            onSelectGRV={(grv) => setSelectedGRV(grv)}
                        />

                        <div className="mt-4 flex-1 overflow-hidden">
                            <div className="h-full overflow-y-auto">
                                <ListOnlyTable columns={cartColumns} data={displayCartItems} staticTable={true} />
                            </div>

                            {/* Display cart items validation error */}
                            {errors.items && (
                                <div className="px-4 py-2">
                                    <p className="text-xs text-red-500">{errors.items.message}</p>
                                </div>
                            )}
                        </div>

                        <AcceptHintActions onShowHints={handleShowHints} onAccept={handleAccept}>
                            <Button variant="secondary" onClick={() => onClose()}>
                                <ArrowLeft /> Back
                            </Button>
                        </AcceptHintActions>
                    </form>
                </Form>

                {(isProductSelectionOpen || scannedBarcode) && (
                    <ProductSelection
                        isOpen={isProductSelectionOpen}
                        onClose={onProductSelectionClose}
                        onSelectProduct={handleSelectProduct}
                        companyDebtorId={companyCreditorId}
                        key={companyCreditorId || ''}
                        isOnline={isOnline}
                        isEmptyStockValidation={true}
                        scannedBarcode={scannedBarcode}
                        setScannedBarcode={setScannedBarcode}
                        isGRV={true}
                        // onSelectSerialNumber={handleSelectSerialNumber}
                        // isSerialNumberOpen={isSerialNumberModalOpen}
                        // setIsSerialNumberOpen={setIsSerialNumberModalOpen}
                    />
                )}

                {showPrintPrompt && (
                    <Dialog open={showPrintPrompt} onOpenChange={(open) => !open && handlePrintPromptAnswer(false)}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Print Invoice</DialogTitle>
                            </DialogHeader>

                            <div className="py-2 text-sm text-gray-700">
                                Do you want to print the invoice?
                            </div>

                            <DialogFooter className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => handlePrintPromptAnswer(false)}>
                                    No
                                </Button>
                                <Button onClick={() => handlePrintPromptAnswer(true)}>
                                    Yes, Print
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {printData && (
                    <GoodsReturnInvoiceDialog
                        printData={printData}
                        onClose={() => {
                            setPrintData(null);
                            onClose();
                        }}
                    />
                )}

                <BarcodeScanner onScan={handleScannedProduct} active={true}/>
            </div>
        </PageLoader>
    );
};

export default GoodsReturnForm;