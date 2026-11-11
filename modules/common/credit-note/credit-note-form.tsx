import React, { useState, useMemo, useEffect } from 'react';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import CreditNoteDetailsForm from './credit-note-details-form';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { ListOnlyTable } from '@/components/list-only-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form } from '@/components/ui/form';
import { ArrowLeft, ChevronDown, MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { ProductSelection } from '../hoc/product-selection';
// import { SerialNumber } from '../cash-sales/cash-sales-types';
import { PriceLevelDialog } from '../hoc/price-level-dialog';
import { toast } from 'sonner';
import moment from 'moment-timezone';
import BarcodeScanner from '../hoc/bar-code-scanner';

import {
    CreditNoteCartItem,
    useCreateCreditNote,
    CartItemReponse,
    CreditNotesDetails,
    GetCreditNoteResponse,
    creditNoteCreateSchema,
    CreditNoteCreateSchema,
    CreditNoteInvoiceType,
} from '@/api-queries/credit-note';

import { CompanyStockDetailsListResponse, StockDetails } from '@/api-queries/company/stock-details';
import { CartItemPricingType } from '@/api-queries/point-of-sale';
import CreditNoteInvoiceDialog from './invoice/invoice-dialog';
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
import { AccountSalesDetails } from '@/api-queries/point-of-sale/account-sales/account-sales';
import { COLOR_CODES_FOR_INVOICE_FORMS } from '@/lib/constant';

const CreditNoteForm = ({ onClose }: { onClose: () => void }) => {
    const queryClient = useQueryClient();

    const isOnline = useNetworkStore((state) => state?.online);
    const { cnInvoiceCount, setCNInvoiceCount } = useInvoiceCountState();

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const { mutate: createCreditNote, isPending } = useCreateCreditNote(isOnline);

    const form = useForm<CreditNoteCreateSchema>({
        resolver: zodResolver(creditNoteCreateSchema),
        defaultValues: {
            companyDebtorId: '',
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
            items: [],
            creditNoteDate: new Date().toISOString().split('T')[0],
            creditNoteNumber: '',
            creditNoteInclusive: 'Yes',
        },
    });

    const {
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors },
    } = form;

    const [cartItems, setCartItems] = useState<CreditNoteCartItem[]>([]);
    // console.log("cart items",cartItems)

    // ----------------- Modals Start -----------------

    const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
    const [isSerialNumberModalOpen, setIsSerialNumberModalOpen] = useState(false);

    const [selectedDebtor, setSelectedDebtor] = useState<CompanyCreditor | null>(null);
    const [selectedAccountSale, setSelectedAccountSale] = useState<AccountSalesDetails | null>(null);
    const [selectedRep, setSelectedRep] = useState<SalesRepresentativeDetails | null>(null);
    const [isDebtorSelected, setIsDebtorSelected] = useState(false);
    const [isPriceLevelSelectionOpen, setIsPriceLevelSelectionOpen] = useState(false);

    // console.log("selecteddebtor sale invoice",selectedAccountSale)

    const [printData, setPrintData] = useState<CreditNoteInvoiceType | null>(null);

    // ----------------- Modals End -----------------

    const companyDebtorId = watch('companyDebtorId');

    useEffect(() => {
        setIsDebtorSelected(!!companyDebtorId);
    }, [companyDebtorId]);

    useEffect(() => {
        if (selectedAccountSale) {
            form.setValue('originalDocumentId', selectedAccountSale.id);
        } else {
            form.setValue('originalDocumentId', undefined);
        }
    }, [selectedAccountSale]);

    const [editingPriceLevelItem, setEditingPriceLevelItem] = useState<string>('');

    useEffect(() => {
        const formattedCartItems: CartItemReponse[] = cartItems.map((item) => ({
            companyStockDetailId: item.id,
            companyStockPricingId: item?.companyStockPricingId || '',
            companyTaxRateId: item?.companyTaxRateId ?? null,
            quantity: item.quantity,
            discount: item.discount,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            stockDispositionId: item.stockDispositionId,
            stockDispositionVersion: item.stockDispositionVersion,
        }));

        setValue('items', formattedCartItems);
    }, [cartItems, setValue, editingPriceLevelItem]);

    const calculateLineTotal = (item: CreditNoteCartItem) => {
        return item.unitPrice * item.quantity - item.discount;
    };

    const handleSelectProduct = (
        product: StockDetails,
        companyStockPrice: CartItemPricingType | null,
        scannedBaseQuantity = 1,
    ) => {
        // if (product.hasSerialNumber) {
        //     setIsSerialNumberModalOpen(true);
        // } else {

        if (
            selectedAccountSale &&
            !selectedAccountSale.DebtorInvoicingOrderItems?.some(
                (item) => item.CompanyStockDetail.id === product.id,
            )
        ) {
            toast.error('Credit note items must come from the selected account sale.');
            return;
        }

        if (!companyStockPrice) {
            toast.error('Invalid pricing! Please choose another product.');
            return;
        }

        const quantity = Math.max(1, Number(scannedBaseQuantity) || 1);

        const newCartItem: CreditNoteCartItem = {
            ...product,
            quantity,
            discount: 0,
            unitPrice: companyStockPrice?.priceInclusive || 0,
            lineTotal: (companyStockPrice?.priceInclusive || 0) * quantity,
            companyStockPricingId: companyStockPrice?.id,
            type: companyStockPrice?.type,
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
    //             const newCartItem: CreditNoteCartItem = {
    //                 ...selectedProductForSerialNumber,
    //                 quantity: 1,
    //                 selectedSerialNumber: serialNumber.serial,
    //                 discount: 0,
    //                 lineTotal: selectedProductForSerialNumber.unitPrice - 0,
    //                 companyStockPricingId: '',
    //             };
    //             setCartItems((prevItems) => [...prevItems, newCartItem]);
    //         }
    //     },
    //     [],
    // );

    // Price Level

    const handleSelectPriceLevel = (priceType: CartItemPricingType) => {
        if (editingPriceLevelItem) {
            setCartItems((prevItems) =>
                prevItems.map((item) => {
                    if (item.id === editingPriceLevelItem) {
                        const newUnitPrice = priceType.priceInclusive || 0;
                        return {
                            ...item,
                            companyStockPricingId: priceType.id,
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

    // Barcode Scan

    const [scannedBarcode, setScannedBarcode] = useState<string>('');

    const handleScannedProduct = (barcode: string) => {
        setIsProductSelectionOpen(true);
        setScannedBarcode(String(barcode));
    };

    // On product Selection close
    function onProductSelectionClose() {
        setIsProductSelectionOpen(false);
        setScannedBarcode('');
    }

    // Cart and Discounts

    // const handleCartQuantityChange = (companyStockDetailId: string, delta: number, selectedSerialNumber?: string) => {
    //     setCartItems((prevItems) =>
    //         prevItems.map((item) => {
    //             if (item.id === companyStockDetailId && item.selectedSerialNumber === selectedSerialNumber) {
    //                 const newQuantity = Math.max(1, item.quantity + delta);
    //                 return {
    //                     ...item,
    //                     quantity: newQuantity,
    //                     lineTotal: calculateLineTotal({
    //                         ...item,
    //                         quantity: newQuantity,
    //                         unitPrice: item?.unitPrice || 0,
    //                         discount: item.discount,
    //                     }),
    //                 };
    //             }
    //             return item;
    //         }),
    //     );
    // };

    const handleCartQuantityChange = (companyStockDetailId: string, newQuantity: number, selectedSerialNumber?: string) => {
    setCartItems((prevItems) =>
        prevItems.map((item) => {
            if (item.id === companyStockDetailId && item.selectedSerialNumber === selectedSerialNumber) {
                let quantity = isNaN(newQuantity) ? 1 : Math.max(1, newQuantity);

                // respect max limit when editing an account-sale-based credit note
                const maxAllowed = selectedAccountSale?.DebtorInvoicingOrderItems?.find(
                    (asCart) => asCart.CompanyStockDetail.id === item.id,
                )?.quantity;

                if (maxAllowed !== undefined && quantity > maxAllowed) {
                    toast.error('Max limit reached');
                    quantity = maxAllowed;
                }

                return {
                    ...item,
                    quantity,
                    lineTotal: calculateLineTotal({
                        ...item,
                        quantity,
                        unitPrice: item?.unitPrice || 0,
                        discount: item.discount,
                    }),
                };
            }
            return item;
        }),
    );
};

function QuantityCell({
    value,
    onCommit,
}: {
    value: number;
    onCommit: (newValue: number) => void;
}) {
    const [localValue, setLocalValue] = useState(String(value));

    useEffect(() => {
        setLocalValue(String(value));
    }, [value]);

    return (
        <Input
            type="number"
            min={1}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
                const parsed = parseInt(localValue, 10);
                if (isNaN(parsed) || parsed <= 0) {
                    setLocalValue(String(value)); // revert to last valid value
                } else {
                    onCommit(parsed);
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                }
            }}
            className="h-6 w-10 p-0 text-center text-xs"
        />
    );
}

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

    const handleUpdatePriceLevel = (code: string) => {
        setIsPriceLevelSelectionOpen(true);
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
                render: (item: CreditNoteCartItem) => {
                    if (item.isNewRow) {
                        return selectedAccountSale ? null : (
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
                render: (item: CreditNoteCartItem) => item.description,
            },
            {
                key: 'companyStockPricingId',
                label: 'Price Type',
                className: 'w-[100px] text-right',
                render: (item: CreditNoteCartItem) =>
                    item.isNewRow ? null : (
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
    key: 'quantity',
    label: 'Qty',
    className: 'w-[100px] text-center',
    render: (item: CreditNoteCartItem) =>
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

                <QuantityCell
                    value={item.quantity}
                    onCommit={(newQty) => handleCartQuantityChange(item.id, newQty, item.selectedSerialNumber)}
                />

                <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 bg-transparent"
                    onClick={(e) => {
                        e.preventDefault();
                        selectedAccountSale?.DebtorInvoicingOrderItems?.find(
                            (asCart) => asCart.CompanyStockDetail.id === item.id,
                        )?.quantity === item.quantity
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
                render: (item: CreditNoteCartItem) =>
                    item.isNewRow ? (
                        <span className="h-6 w-full justify-end text-sm font-semibold">
                            {currencySymbol} {totalUnitProductAmount.toFixed(2)}
                        </span>
                    ) : (
                        <Input
                            type="number"
                            defaultValue={item.unitPrice.toFixed(2)}
                            step="0.01"
                            readOnly={!!item.stockDispositionId}
                            title={item.stockDispositionId ? 'Controlled disposition price - cannot be edited' : ''}
                            className={`h-6 w-full p-0 text-right text-xs ${item.stockDispositionId ? 'bg-muted cursor-not-allowed' : ''}`}
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
                render: (item: CreditNoteCartItem) => {
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
                            readOnly={!!item.stockDispositionId}
                            title={item.stockDispositionId ? 'Controlled disposition price - cannot be edited' : ''}
                            onBlur={(e) => {
                                const parsed = parseFloat(e.target.value);
                                if (!isNaN(parsed)) {
                                    handleUpdateLineDiscount(item.id, parsed, item.selectedSerialNumber);
                                }
                            }}
                            step="0.01"
                            className={`h-6 w-full p-0 text-right text-xs ${item.stockDispositionId ? 'bg-muted cursor-not-allowed' : ''}`}
                        />
                    );
                },
            },
            {
                key: 'lineTotal',
                label: 'Total',
                className: 'w-[80px] text-right font-semibold',
                render: (item: CreditNoteCartItem) =>
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
                render: (item: CreditNoteCartItem) =>
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
            handleUpdatePriceLevel,
            watch,
            totalUnitProductAmount,
            discountAmount,
        ],
    );

    const displayCartItems = useMemo(() => {
        if (isDebtorSelected) {
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
    }, [cartItems, isDebtorSelected]);

    const resetFormAndStatesAfterSubmission = (form: UseFormReturn<CreditNoteCreateSchema>) => {
        form.reset();
        setIsDebtorSelected(false);
        setSelectedDebtor(null);
        setCartItems([]);
        setSelectedRep(null);
        setSelectedAccountSale(null);
        setCNInvoiceCount(cnInvoiceCount + 1);
    };

    function onSubmit(values: CreditNoteCreateSchema) {
        if (!selectedDebtor) return;

        const cleanedPayload = cleanDataPayload(values);

        createCreditNote(cleanedPayload as CreditNoteCreateSchema, {
            onSuccess: async (data) => {
                if (data.success) {
                    toast.success('Credit Note created successfully');
                    if (isOnline) {
                        setPrintData({
                            creditNote: data.data,
                            cartItems: data.data.creditNoteItems,
                            accountNumber: data.data.CompanyDebtor.accountNumber,
                        });
                    } else {
                        // Offline Print data

                        setPrintData({
                            creditNote: values,
                            cartItems: cartItems.map((item) => {
                                const { quantity, discount, unitPrice, companyStockPricingId, type, ...product } = item;
                                return {
                                    quantity,
                                    discount,
                                    unitPrice,
                                    lineTotal: item?.unitPrice * item.quantity - item.discount || 0,
                                    companyStockPricingId,
                                    stockDispositionId: item.stockDispositionId,
                                    stockDispositionVersion: item.stockDispositionVersion,
                                    type: item?.type,
                                    CompanyStockDetail: product,
                                };
                            }),
                            accountNumber: selectedDebtor?.accountNumber,
                        });

                        // Saving data to indexedDB

                        const offlineCreditNotesData = (await getDBData(
                            getIDBKey(apiUrls.creditNotes),
                        )) as GetCreditNoteResponse;

                        const offlineCreditNote: CreditNotesDetails = {
                            ...values,
                            CompanyDebtor: selectedDebtor,
                            id: generateUUIDForData(),
                            unallocatedAmount: values.goodsTotal,
                            creditNoteItems: cartItems.map((item) => {
                                const { quantity, discount, unitPrice, companyStockPricingId, type, ...product } = item;
                                return {
                                    quantity,
                                    discount,
                                    unitPrice,
                                    lineTotal: item?.unitPrice * item.quantity - item.discount || 0,
                                    companyStockPricingId,
                                    stockDispositionId: item.stockDispositionId,
                                    stockDispositionVersion: item.stockDispositionVersion,
                                    type: item?.type,
                                    CompanyStockDetail: product,
                                };
                            }),
                            createdAt: values.creditNoteDate,
                            notSynced: true,
                            ...(selectedRep ? { representativeId: selectedRep.id } : {}),
                            ...(selectedRep ? { SalesRepresentative: selectedRep } : {}),
                        };

                        const updateOfflineCreditNotesData: GetCreditNoteResponse = {
                            success: true,
                            message: 'Credit Note created successfully',
                            data: {
                                rows: [offlineCreditNote, ...offlineCreditNotesData.data.rows],
                                count: offlineCreditNotesData?.data?.count + 1,
                            },
                        };

                        await setDBData(getIDBKey(apiUrls.creditNotes), updateOfflineCreditNotesData);
                        queryClient.setQueryData([getIDBKey(apiUrls.creditNotes), false], updateOfflineCreditNotesData);

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

    useEffect(() => {
        if (selectedAccountSale) {
            setCartItems(
                selectedAccountSale.DebtorInvoicingOrderItems?.map((item) => ({
                    ...item.CompanyStockDetail,
                    unitPrice: item.unitPrice,
                    quantity: item.quantity,
                    discount: item.discount,
                    lineTotal: item.lineTotal,
                    companyStockPricingId: item.companyStockPricingId,
                    companyTaxRateId:item?.taxRateId || '',
                    type: { name: item?.selectedPricing?.type?.name || 'No Price' },
                    stockDispositionId: item.stockDispositionId,
                    stockDispositionVersion: item.stockDispositionVersion,
                })),
            );
        } else {
            setCartItems([]);
        }
    }, [selectedAccountSale]);

    return (
        <PageLoader isLoading={isPending}>
            <div className={`flex flex-col ${COLOR_CODES_FOR_INVOICE_FORMS?.CREDIT_NOTE}`}>
                <h1 className="px-4 py-2 text-2xl font-bold">Credit Note</h1>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
                        <CreditNoteDetailsForm
                            control={control}
                            setValue={setValue}
                            selectedDebtor={selectedDebtor}
                            setSelectedDebtor={setSelectedDebtor}
                            isOnline={isOnline}
                            selectedRep={selectedRep}
                            onSelectRep={(rep) => setSelectedRep(rep)}
                            selectedAccountSale={selectedAccountSale}
                            onSelectAccountSale={(as) => setSelectedAccountSale(as)}
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

                {isProductSelectionOpen && (
                    <ProductSelection
                        isOpen={isProductSelectionOpen}
                        onClose={onProductSelectionClose}
                        onSelectProduct={handleSelectProduct}
                        companyDebtorId={companyDebtorId}
                        key={companyDebtorId || ''}
                        isOnline={isOnline}
                        scannedBarcode={scannedBarcode}
                        setScannedBarcode={setScannedBarcode}
                        // onSelectSerialNumber={handleSelectSerialNumber}
                        // isSerialNumberOpen={isSerialNumberModalOpen}
                        // setIsSerialNumberOpen={setIsSerialNumberModalOpen}
                    />
                )}

                {printData && (
                    <CreditNoteInvoiceDialog
                        printData={printData}
                        onClose={() => {
                            setPrintData(null);
                            onClose();
                        }}
                    />
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

                {selectedDebtor && <BarcodeScanner onScan={handleScannedProduct} active={true} />}
            </div>
        </PageLoader>
    );
};

export default CreditNoteForm;
