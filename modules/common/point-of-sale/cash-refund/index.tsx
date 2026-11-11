import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import { MinusIcon, PackageMinus, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import CustomerInfo from '../cash-sales/actions/customer-info';
import PaymentScreen, { SplitPaymentEntry } from './actions/payment-screen';
import { RepSelection } from '../../hoc/rep-selection';
import { CompanyStockDetailsListResponse, StockDetails } from '@/api-queries/company/stock-details';
import { CartItemPricingType } from '@/api-queries/point-of-sale';
import { TenderDetails } from '@/api-queries/point-of-sale/tenders';
import {
    CashRefundCreateSchema,
    useCreateCashRefunds,
    CashRefundCartItem,
    CashRefundInvoiceType,
    CashRefundCustomerSchema,
    GetCashRefundResponse,
    CashRefundsDetails,
} from '@/api-queries/point-of-sale/cash-refund';
import CashRefundInvoiceDialog from './invoice/invoice-dialog';
import { TENDER_TYPES } from '@/lib/constant';
import moment from 'moment-timezone';
import { useAuthUser } from '@/stores/auth-user.store';
import { ProductSearchSelection } from '../../hoc/product-search-selection';
import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
import { useNetworkStore } from '@/stores/network.store';
import { generateUUIDForData, getIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';
import { apiUrls } from '@/api-queries';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useQueryClient } from '@tanstack/react-query';
import BarcodeScanner from '../../hoc/bar-code-scanner';
import { Checkbox } from '@/components/ui/checkbox';
import { CashSaleDialog } from '../../hoc/cash-sale-dialog';
import { CashSalesDetails } from '@/api-queries/point-of-sale/cash-sales';


export interface PaymentSuccessType {
    netAmountToPay: number;
    selectedPaymentMethod: TenderDetails;
    changeDue: number;
    bankAccountNumber: string;
    chequeReference: string;
    cardNumber: string;
    cardExpiryDate: string;
    refundReason: string;
    isSplitPayment?: boolean;
    payments?: SplitPaymentEntry[];
}

export default function CashRefundScreen() {
    const queryClient = useQueryClient();

    const isOnline = useNetworkStore((state) => state?.online);

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const isElectronApp = process.env.NEXT_PUBLIC_IS_ELECTRON_APP === 'true';
    const screenHeight = isElectronApp ? 'h-[75vh]' : 'h-[81vh]';
    const [cartItems, setCartItems] = useState<CashRefundCartItem[]>([]);
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);

    const { mutate: createCashRefund, isPending } = useCreateCashRefunds(isOnline);

    // ----------------- Modals Start -----------------

    const [isSerialNumberModalOpen, setIsSerialNumberModalOpen] = useState(false);

    const [selectedRep, setSelectedRep] = useState<SalesRepresentativeDetails | null>(null);

    const [printData, setPrintData] = useState<CashRefundInvoiceType | null>(null);

    const [customerData, setCustomerData] = useState<CashRefundCustomerSchema | null>(null);

    const [isCashSaleDialogOpen, setIsCashSaleDialogOpen] = useState(false);
    const [selectedCashSale, setSelectedCashSale] = useState<CashSalesDetails | null>(null);

    // ----------------- Modals End -----------------

    useEffect(() => {
    if (!selectedCashSale?.PosCashSaleOrderItems?.length) {
        return;
    }

    const refundItems: CashRefundCartItem[] =
        selectedCashSale.PosCashSaleOrderItems.map((item) => ({
            ...item.CompanyStockDetail,

            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,

            companyStockPricingId: item.companyStockPricingId,
            posCashSaleOrderItemId: (item as { id?: string })?.id,
            selectedPricing: item.selectedPricing,
            companyTaxRateId: item.taxRateId,

            comment: item.comment || '',
            lineComment: item.lineComment || '',

            isRestocked: true,
        }));

    setCartItems(refundItems);
}, [selectedCashSale]);

    const [formProduct, setFormProduct] = useState<StockDetails | null>(null);
    const [formPrice, setFormPrice] = useState<CartItemPricingType | null>();
    const [formQuantity, setFormQuantity] = useState<number>(1);
    const [formLineComment, setFormLineComment] = useState<string>('');
    const [formComment, setFormComment] = useState<string>('');
    const [formTaxRate, setFormTaxRate] = useState<number>(0);

    const calculateLineTotal = useCallback(() => {
        if (!formProduct) return 0;
        const price = formPrice?.priceInclusive || 0;
        const quantity = formQuantity;
        return Math.max(0, price * quantity);
    }, [formProduct, formQuantity, formPrice]);

    const lineTotal = useMemo(() => calculateLineTotal(), [calculateLineTotal, formPrice]);

    useEffect(() => {
        if (formProduct === null) {
            setFormQuantity(1);
            setFormPrice(null);
            setFormComment('');
            setFormTaxRate(0);
            setFormLineComment('');
        }
    }, [formProduct]);

    const calculateTotals = useCallback(() => {
        const total = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
        return { total };
    }, [cartItems]);

    const { total } = useMemo(() => calculateTotals(), [calculateTotals]);

    const handleSelectProductForForm = useCallback(
        (
            product: StockDetails | null,
            companyStockPrice: CartItemPricingType | null,
            scannedBaseQuantity = 1,
        ) => {
            if (!product || !companyStockPrice) return;
            const sourceItem = selectedCashSale?.PosCashSaleOrderItems.find(
                (item) => item.CompanyStockDetail.id === product.id,
            );
            if (selectedCashSale && !sourceItem) {
                toast.error('Refund items must come from the selected cash sale.');
                return;
            }
            const quantity = Math.max(1, Number(scannedBaseQuantity) || 1);
            if (sourceItem && quantity > sourceItem.quantity) {
                toast.error('Refund quantity cannot exceed the original sale quantity.');
                return;
            }
            const selectedPrice = sourceItem?.selectedPricing || companyStockPrice;
            const { priceInclusive, priceExclusive } = selectedPrice;
            const taxRate = ((priceInclusive - priceExclusive) / priceExclusive) * 100;

            setFormProduct(product);
            setFormQuantity(quantity);
            setFormPrice(selectedPrice);
            setFormTaxRate(taxRate || +'0.00');
            setFormComment('');
            setFormLineComment('');
            setScannedBarcode('');
        },
        [selectedCashSale],
    );

    const handleAddProductToCart = useCallback(() => {
        if (!formProduct || !formPrice) {
            toast.error('Please select a product first by clicking the Stock Code input.');
            return;
        }

        const quantityToAdd = Math.max(1, formQuantity);

        const sourceItem = selectedCashSale?.PosCashSaleOrderItems.find(
            (item) => item.CompanyStockDetail.id === formProduct.id,
        );
        if (selectedCashSale && !sourceItem) {
            toast.error('Refund items must come from the selected cash sale.');
            return;
        }
        if (sourceItem && quantityToAdd > sourceItem.quantity) {
            toast.error('Refund quantity cannot exceed the original sale quantity.');
            return;
        }

        // if (formProduct.hasSerialNumber) {
        //     setIsSerialNumberModalOpen(true);
        // } else {

        const existingItem = cartItems.find((item) => item.id === formProduct.id && !item.selectedSerialNumber);
        if (existingItem) {
            if (sourceItem) {
                const sourceTotal = sourceItem.lineTotal || sourceItem.unitPrice * sourceItem.quantity;
                setCartItems((current) =>
                    current.map((item) =>
                        item.posCashSaleOrderItemId === (sourceItem as { id?: string }).id
                            ? {
                                  ...item,
                                  quantity: quantityToAdd,
                                  lineTotal: sourceTotal * (quantityToAdd / sourceItem.quantity),
                              }
                            : item,
                    ),
                );
                setFormProduct(null);
                return;
            }
            toast.error(`${existingItem.description} (${existingItem.generalCode}) - already added`);
            return;
        }

        setCartItems((prevItems) => {
            return [
                ...prevItems,
                {
                    ...formProduct,
                    quantity: quantityToAdd,
                    unitPrice: formPrice.priceInclusive,
                    lineTotal: lineTotal,
                    isRestocked: true,
                    comment: formComment,
                    lineComment: formLineComment,
                    companyStockPricingId: formPrice?.id,
                    selectedPricing: formPrice,
                },
            ];
        });

        setFormProduct(null);
        // }
    }, [formProduct, formQuantity, lineTotal, formLineComment]);

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
    //                         lineTotal: selectedProductForSerialNumber.unitPrice,
    //                         lineComment: formLineComment,
    //                     },
    //                 ];
    //             });
    //             setFormProduct(null);
    //         }
    //     },
    //     [formLineComment],
    // );

    // Barcode Scan

    const [scannedBarcode, setScannedBarcode] = useState<string>('');

    const handleScannedProduct = (barcode: string) => {
        setScannedBarcode(String(barcode));
    };

    const getSourceSaleItem = (item: Pick<CashRefundCartItem, 'id' | 'posCashSaleOrderItemId'>) => {
        const saleItems = selectedCashSale?.PosCashSaleOrderItems || [];
        return (
            saleItems.find((saleItem) => (saleItem as { id?: string }).id === item.posCashSaleOrderItemId) ||
            saleItems.find((saleItem) => saleItem.CompanyStockDetail.id === item.id)
        );
    };

    const getRefundLineTotal = (item: CashRefundCartItem, quantity: number) => {
        const sourceItem = getSourceSaleItem(item);
        if (sourceItem && sourceItem.quantity > 0) {
            return (sourceItem.lineTotal * quantity) / sourceItem.quantity;
        }
        return (item.unitPrice || 0) * quantity;
    };

    // On product Selection close
    function onProductSelectionClose() {
        setScannedBarcode('');
    }

    const handleCartQuantitySet = useCallback((itemId: string, newQuantity: number, serialNumber?: string) => {
    setCartItems((prevItems) => {
        return prevItems
            .map((item) => {
                const isMatch =
                    item.id === itemId &&
                    (serialNumber ? item.selectedSerialNumber === serialNumber : !item.selectedSerialNumber);
                if (isMatch) {
                    if (isNaN(newQuantity) || newQuantity <= 0) return null;
                    const sourceItem = getSourceSaleItem(item);
                    if (sourceItem && newQuantity > sourceItem.quantity) {
                        toast.error('Refund quantity cannot exceed the original sale quantity.');
                        return item;
                    }
                    const newLineTotal = getRefundLineTotal(item, newQuantity);
                    return { ...item, quantity: newQuantity, lineTotal: newLineTotal };
                }
                return item;
            })
            .filter(Boolean) as CashRefundCartItem[];
    });
}, [selectedCashSale]);

    const handleCartQuantityChange = useCallback((itemId: string, change: number, serialNumber?: string) => {
        setCartItems((prevItems) => {
            return prevItems
                .map((item) => {
                    const isMatch =
                        item.id === itemId &&
                        (serialNumber ? item.selectedSerialNumber === serialNumber : !item.selectedSerialNumber);
                    if (isMatch) {
                        const newQuantity = item.quantity + change;
                        if (newQuantity <= 0) return null;
                        const sourceItem = getSourceSaleItem(item);
                        if (sourceItem && newQuantity > sourceItem.quantity) {
                            toast.error('Refund quantity cannot exceed the original sale quantity.');
                            return item;
                        }
                        const newLineTotal = getRefundLineTotal(item, newQuantity);
                        return { ...item, quantity: newQuantity, lineTotal: newLineTotal };
                    }
                    return item;
                })
                .filter(Boolean) as CashRefundCartItem[];
        });
    }, [selectedCashSale]);

    const handleRemoveFromCart = useCallback((itemId: string, serialNumber?: string) => {
        setCartItems((prevItems) => {
            return prevItems.filter((item) => {
                const isMatch = item.id === itemId;
                // && (serialNumber ? item.selectedSerialNumber === serialNumber : !item.selectedSerialNumber);
                return !isMatch;
            });
        });
    }, []);

    const handleAcceptPayment = useCallback(() => {
        if (cartItems.length === 0) {
            toast.error('Cart is empty. Please add products before accepting payment.');
            return;
        }
        setShowPaymentScreen(true);
    }, [cartItems.length]);

    const handleResetAllSaleState = useCallback(() => {
        setCartItems([]);
        setFormProduct(null);
        setSelectedRep(null);
        setShowPaymentScreen(false);
        setPrintData(null);
        setCustomerData(null);
        setSelectedCashSale(null);
    }, []);

    const handlePaymentSuccess = useCallback(
        ({
            netAmountToPay,
            changeDue,
            selectedPaymentMethod,
            bankAccountNumber,
            chequeReference,
            cardNumber,
            cardExpiryDate,
            refundReason,
            isSplitPayment,
            payments,
        }: PaymentSuccessType) => {
            const isCardTender =
                selectedPaymentMethod?.type === TENDER_TYPES?.CREDIT_CARD ||
                selectedPaymentMethod?.type === TENDER_TYPES?.DEBIT_CARD;

            const payload: CashRefundCreateSchema = {
                // tenderTypeId: selectedPaymentMethod?.id,
                // tenderType: selectedPaymentMethod?.type,
                totalPrice: netAmountToPay,
                timezone: moment.tz.guess(),
                refundReason,
                changeDue: changeDue || 0,
                //@ts-ignore
                payments: isSplitPayment
                    ? (payments || []).map((p) => ({
                          tenderTypeId: p.tenderTypeId,
                          tenderType: p.tenderType,
                          amount: p.amount,
                      }))
                    : selectedPaymentMethod
                      ? [
                            {
                                tenderTypeId: selectedPaymentMethod.id,
                                tenderType: selectedPaymentMethod.type,
                                amount: netAmountToPay,
                            },
                        ]
                      : [],

                ...(isSplitPayment ? { isSplitPayment: true } : {}),

                ...(!isSplitPayment && selectedPaymentMethod?.type === TENDER_TYPES?.CHEQUE
                    ? {
                          bankAccountNumber,
                          reference: chequeReference,
                      }
                    : {}),
                ...(!isSplitPayment && isCardTender
                    ? {
                          cardNumber,
                          cardExpiryDate,
                      }
                    : {}),
                items: cartItems.map((item) => ({
                    companyStockDetailId: item.id,
                    companyStockPricingId: item.selectedPricing.id,
                    companyTaxRateId: item.companyTaxRateId,
                    posCashSaleOrderItemId: item.posCashSaleOrderItemId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal: item.lineTotal,
                    comment: item.comment,
                    lineComment: item.lineComment,
                    isRestocked: item.isRestocked,
                })),
                ...(customerData ? { customer: customerData } : {}),
                ...(selectedCashSale ? { posCashSaleOrderId: selectedCashSale?.id } : {}),
                ...(selectedRep ? { representativeId: selectedRep?.id } : {}),
            };

            createCashRefund(payload, {
                onSuccess: async (data) => {
                    if (data.success) {
                        if (isOnline) {
                            const resData = data.data;
                            setPrintData({
                                cashRefund: resData,
                                cartItems: resData.PosCashRefundItems,
                                paymentMethod: resData?.PosTenderType || '',
                                invoiceDate: resData?.createdAt,
                                ...(isSplitPayment ? { payments } : {}),
                            });
                        } else {
                            setPrintData({
                                cashRefund: payload,
                                cartItems: cartItems.map((item) => {
                                    const {
                                        quantity,
                                        unitPrice,
                                        comment,
                                        lineComment,
                                        lineTotal,
                                        selectedPricing,
                                        companyStockPricingId,
                                        isRestocked,
                                        ...product
                                    } = item;
                                    return {
                                        quantity: quantity,
                                        companyStockPricingId,
                                        posCashSaleOrderItemId: item.posCashSaleOrderItemId,
                                        isRestocked,
                                        unitPrice: item.unitPrice,
                                        lineTotal,
                                        comment,
                                        lineComment,
                                        selectedPricing,
                                        CompanyStockDetail: product,
                                    };
                                }),
                                paymentMethod: selectedPaymentMethod,
                                invoiceDate: new Date().toISOString(),
                                ...(isSplitPayment ? { payments } : {}),
                            });

                            // Saving data to indexedDB

                            const offlineCashRefundsData = (await getDBData(
                                getIDBKey(apiUrls.cashRefund),
                            )) as GetCashRefundResponse;

                            const offlineCashRefund: CashRefundsDetails = {
                                ...payload,
                                id: generateUUIDForData(),
                                PosTenderType: selectedPaymentMethod,
                                PosCashRefundItems: cartItems.map((item) => {
                                    const {
                                        quantity,
                                        unitPrice,
                                        comment,
                                        lineComment,
                                        lineTotal,
                                        isRestocked,
                                        selectedPricing,
                                        companyStockPricingId,
                                        ...product
                                    } = item;
                                    return {
                                        companyStockPricingId,
                                        posCashSaleOrderItemId: item.posCashSaleOrderItemId,
                                        quantity: quantity,
                                        unitPrice: item.unitPrice,
                                        lineTotal,
                                        isRestocked,
                                        comment,
                                        lineComment,
                                        selectedPricing,
                                        CompanyStockDetail: product,
                                    };
                                }),
                                invoiceDate: new Date().toISOString(),
                                createdAt: new Date().toISOString(),
                                notSynced: true,
                                ...(selectedCashSale ? { posCashSaleOrderId: selectedCashSale?.id } : {}),
                                ...(selectedRep ? { representativeId: selectedRep?.id } : {}),
                                ...(selectedRep ? { SalesRepresentative: selectedRep } : {}),
                            };

                            const updateOfflineCashRefundsData: GetCashRefundResponse = {
                                success: true,
                                message: 'Cash Sale created successfully',
                                data: {
                                    rows: [offlineCashRefund, ...offlineCashRefundsData.data.rows],
                                    count: offlineCashRefundsData?.data?.count + 1,
                                },
                            };

                            await setDBData(getIDBKey(apiUrls.cashRefund), updateOfflineCashRefundsData);
                            queryClient.setQueryData(
                                [getIDBKey(apiUrls.cashRefund), false],
                                updateOfflineCashRefundsData,
                            );

                            // Stock Update
                            const offlineStockDetailsData = (await getDBData(
                                getIDBKey(apiUrls.stocks),
                            )) as CompanyStockDetailsListResponse;

                            const updatedStockDetailsData: CompanyStockDetailsListResponse = {
                                ...offlineStockDetailsData,
                                data: {
                                    count: offlineStockDetailsData?.data?.count,
                                    rows: offlineStockDetailsData?.data?.rows,
                                },
                            };

                            await setDBData(getIDBKey(apiUrls.stocks), updatedStockDetailsData);
                            queryClient.setQueryData([getIDBKey(apiUrls.stocks), false], updatedStockDetailsData);
                        }

                        toast.success('Cash Refund successful.');
                    } else {
                        toast.error('Cash refund processing failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        },
        [cartItems, customerData],
    );

    function onCloseInvoice() {
        setPrintData(null);
        handleResetAllSaleState();
    }

    const cartColumns = useMemo(
        () => [
            {
                key: 'itemCode',
                label: 'Code',
                className: 'w-[80px]',
                render: (item: CashRefundCartItem) => (
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
                key: 'quantity',
                label: 'Qty',
                className: 'w-[100px] text-center',
                render: (item: CashRefundCartItem) => (
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
    min={1}
    value={item.quantity}
    onChange={(e) => {
        const raw = e.target.value;
        // allow the field to be temporarily empty while typing
        if (raw === '') {
            handleCartQuantitySet(item.id, 0, item.selectedSerialNumber); 
            return;
        }
        const value = parseInt(raw, 10);
        handleCartQuantitySet(item.id, value, item.selectedSerialNumber);
    }}
    onBlur={(e) => {
        // if left empty or invalid on blur, reset to 1
        const value = parseInt(e.target.value, 10);
        if (isNaN(value) || value <= 0) {
            handleCartQuantitySet(item.id, 1, item.selectedSerialNumber);
        }
    }}
    className="h-6 w-10 p-0 text-center text-xs"
/>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 bg-transparent"
                            onClick={(e) => {
                                handleCartQuantityChange(item.id, 1, item.selectedSerialNumber);
                            }}
                        >
                            <PlusIcon className="h-3 w-3" />
                            <span className="sr-only">Increase quantity</span>
                        </Button>
                    </div>
                ),
            },
            {
                key: 'price',
                label: 'Price',
                className: 'w-[80px] text-right',
                render: (item: CashRefundCartItem) => `${currencySymbol} ${(item?.unitPrice || 0.0).toFixed(2)}`,
            },
            {
                key: 'lineTotal',
                label: 'Total',
                className: 'w-[80px] text-right font-semibold',
                render: (item: CashRefundCartItem) => `${currencySymbol} ${item.lineTotal.toFixed(2)}`,
            },
            {
                key: 'isRestocked',
                label: 'Restock',
                className: 'w-[60px] text-center',
                render: (item: CashRefundCartItem) => (
                    <Checkbox
                        checked={item.isRestocked}
                        onCheckedChange={(val) => handleDamageItems(item.id, Boolean(val), item.selectedSerialNumber)}
                    />
                ),
            },
            {
                key: 'delete',
                label: 'Delete',
                className: 'w-[60px] text-center',
                render: (item: CashRefundCartItem) => (
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
        ],
        [handleCartQuantityChange, handleRemoveFromCart],
    );

    const handleCustomerInfo = (data: CashRefundCustomerSchema) => {
        setCustomerData(data);
    };

    const handleDamageItems = useCallback((itemId: string, isRestocked: boolean, serialNumber?: string) => {
        setCartItems((prevItems) => {
            return prevItems
                .map((item) => {
                    const isMatch =
                        item.id === itemId &&
                        (serialNumber ? item.selectedSerialNumber === serialNumber : !item.selectedSerialNumber);
                    if (isMatch) {
                        return { ...item, isRestocked };
                    }
                    return item;
                })
                .filter(Boolean) as CashRefundCartItem[];
        });
    }, []);

    return (
        <PageLoader isLoading={isPending}>
            <div className="flex w-full gap-4 p-2">
                <div className={`flex ${screenHeight} w-1/2 flex-col rounded-lg bg-white p-4`}>
                    <h2 className="mb-4 flex items-center justify-between text-xl font-semibold">
                        Tax Invoice (Inclusive)
                        {cartItems?.length === 0 ? null : (
                            <div className="flex gap-2">
                                <CustomerInfo onSubmit={handleCustomerInfo} />
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
                </div>

                {showPaymentScreen ? (
                    <PaymentScreen
                        cartTotal={total}
                        onBack={() => setShowPaymentScreen(false)}
                        onPaymentSuccess={handlePaymentSuccess}
                        screenHeight={screenHeight}
                        isOnline={isOnline}
                    />
                ) : (
                    <div
                        className={`flex ${screenHeight} w-1/2 flex-col justify-between rounded-lg bg-white p-4 shadow-md`}
                    >
                        <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="relative col-span-2 flex items-center gap-2">
                                <Label htmlFor="rep" className="w-24 text-right">
                                    Cash Sale:
                                </Label>
                                <Input
                                    id="rep"
                                    value={
                                        selectedCashSale
                                            ? `#INV${
                                                  selectedCashSale?.id?.slice(0, 8)?.toUpperCase() || 'N/A'
                                              } - ${moment(selectedCashSale?.invoiceDate || selectedCashSale?.createdAt).format('Do MMM, YY')}`
                                            : ''
                                    }
                                    placeholder="Select cash sale invoice"
                                    readOnly
                                    onClick={() => setIsCashSaleDialogOpen(true)}
                                    className="flex-1 cursor-pointer"
                                />

                                {selectedCashSale && (
                                    <XIcon
                                        onClick={() => {
                                            setSelectedCashSale(null);
                                            setCartItems([]);
                                        }}
                                        className="absolute top-1/2 right-1 h-4 w-4 -translate-y-1/2 cursor-pointer text-red-500"
                                    />
                                )}
                            </div>

                            <div className="col-span-2 flex items-center gap-2">
                                <Label htmlFor="stockCode" className="w-24 text-right">
                                    Stock Code:
                                </Label>

                                <div className="relative flex-1">
                                    <ProductSearchSelection
                                        isEmptyStockValidation={false}
                                        onClose={onProductSelectionClose}
                                        onSelectProduct={handleSelectProductForForm}
                                        selectedProduct={formProduct}
                                        companyDebtorId={null}
                                        isOnline={isOnline}
                                        scannedBarcode={scannedBarcode}
                                        key={scannedBarcode}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Label htmlFor="unitPrice" className="w-24 text-right">
                                    Unit Price:
                                </Label>
                                <Input
                                    id="unitPrice"
                                    value={formPrice?.priceInclusive.toFixed(2) || ''}
                                    className="flex-1"
                                    type="number"
                                    disabled={!formPrice}
                                    onChange={(e) => {
                                        if (!formPrice) return;
                                        const value = e.target.value;
                                        if (value === '') {
                                            setFormPrice({ ...formPrice, priceInclusive: 0 });
                                        } else {
                                            const priceInclusive = Number.parseInt(value, 10);
                                            if (!isNaN(priceInclusive)) {
                                                setFormPrice({ ...formPrice, priceInclusive });
                                            }
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Label htmlFor="quantity" className="w-24 text-right">
                                    Quantity:
                                </Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    value={formQuantity}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                            setFormQuantity(0);
                                        } else {
                                            const numValue = Number.parseInt(value, 10);
                                            if (!isNaN(numValue)) {
                                                setFormQuantity(numValue);
                                            }
                                        }
                                    }}
                                    disabled={!formProduct}
                                    className="flex-1"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Label htmlFor="lineTotal" className="w-24 text-right">
                                    Line Total:
                                </Label>
                                <Input
                                    id="lineTotal"
                                    value={lineTotal.toFixed(2)}
                                    readOnly
                                    className="flex-1 font-bold"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Label htmlFor="taxRate" className="w-24 text-right">
                                    Tax Rate:
                                </Label>
                                <Input id="taxRate" value={`${formTaxRate.toFixed(2)}%`} readOnly className="flex-1" />
                            </div>

                            <RepSelection selectedRep={selectedRep} onSelectRep={setSelectedRep} isOnline={isOnline} />

                            <div className="flex items-center gap-2">
                                <Label htmlFor="lineComment" className="w-24 text-right">
                                    Line Comment:
                                </Label>
                                <Input
                                    id="lineComment"
                                    value={formLineComment}
                                    onChange={(e) => setFormLineComment(e.target.value.slice(0, 30))}
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
                                    disabled={!formProduct}
                                    className="flex-1"
                                />
                            </div>

                            <div className="col-span-2 flex justify-end">
                                <Button
                                    className="mt-2 w-max"
                                    size="lg"
                                    onClick={handleAddProductToCart}
                                    disabled={!formProduct}
                                >
                                    <PackageMinus className="!h-5 !w-5 shrink-0" /> Return Item
                                </Button>
                            </div>
                        </div>

                        <div>
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>AMOUNT TO BE REFUNDED:</span>
                                    <span>
                                        {currencySymbol} {total.toFixed(2)}
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
                            </div>
                        </div>
                    </div>
                )}

                <BarcodeScanner onScan={handleScannedProduct} active={true} />

                {printData && <CashRefundInvoiceDialog printData={printData} onClose={onCloseInvoice} />}

                {isCashSaleDialogOpen && (
                    <CashSaleDialog
                        isOpen={isCashSaleDialogOpen}
                        onClose={() => setIsCashSaleDialogOpen(false)}
                        onSelectCashSale={(cs) => setSelectedCashSale(cs)}
                    />
                )}
            </div>
        </PageLoader>
    );
}