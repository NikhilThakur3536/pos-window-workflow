import type React from 'react';
import {
    type StockDetails,
    type StockDetailsQuery,
    companyStockDetailById,
    useCompanyStockDetailsList,
    useCompanyStockDetailsOffline,
} from '@/api-queries/company/stock-details';
import { type CartItemPricingType, useGetStockPrices } from '@/api-queries/point-of-sale';
import { resolveStockBarcode } from '@/api-queries/company-stock-barcodes';
import { isPackSellingUnit } from '@/utils/selling-unit';
import ConfirmDialog from '@/components/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Check, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductSearchSelectionProps {
    onClose: () => void;
    onSelectProduct: (
        product: StockDetails | null,
        companyStockPrice: CartItemPricingType | null,
        scannedBaseQuantity?: number,
    ) => void;
    companyDebtorId: string | null;
    placeholder?: string;
    selectedProduct?: StockDetails | null;
    isOnline: boolean;
    isEmptyStockValidation?: boolean;
    scannedBarcode?: string;
    // Used only when a package barcode is resolved against warehouse stock.
    warehouseId?: string;
    // Store (company-debtor) billing must sell the configured unit SKU. A pack/case row is
    // rejected so the operator explicitly picks the unit item instead of selling a pack.
    storeBilling?: boolean;
}

export function ProductSearchSelection({
    onClose,
    onSelectProduct,
    companyDebtorId,
    selectedProduct: externalSelectedProduct,
    isOnline,
    scannedBarcode,
    warehouseId,
    isEmptyStockValidation = true,
    storeBilling = false,
}: ProductSearchSelectionProps) {
    const [selectedProduct, setSelectedProduct] = useState<StockDetails | null>(null);
    const [selectedDefectiveProduct, setSelectedDefectiveProduct] = useState<StockDetails | null>(null);
    const scannedBaseQuantityRef = useRef(1);
    const [internalOpen, setInternalOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const processedBarcodeRef = useRef<string | null>(null);
    // Package-barcode resolution is done before the product search, so its result is kept
    // aside until it can be applied as a cart line.
    const [resolvedScan, setResolvedScan] = useState<{
        barcode: string;
        product: StockDetails;
        quantity: number;
    } | null>(null);
    const [resolveSettled, setResolveSettled] = useState<string | null>(null);

    const initialFilters = {
        search: scannedBarcode || '',
    };

    const { filters, setFilters, handleFilters, clearFilters } = useTableFilters<StockDetailsQuery>(initialFilters);

    useEffect(() => {
        handleFilters(filters);
    }, [filters.search]);

    const [showItemOnHoldDialog, setShowItemOnHoldDialog] = useState(false);
    const [showEmptyStockDialog, setShowEmptyStockDialog] = useState(false);
    const [showPackBlockedDialog, setShowPackBlockedDialog] = useState(false);

    const { data: products, isLoading } = isOnline
        ? useCompanyStockDetailsList({
              limit: 100,
              offset: 0,
              ...(filters?.search ? { search: filters?.search } : {}),
              pricing: true,
          })
        : useCompanyStockDetailsOffline(isOnline);

    const { data: priceData, isLoading: isPriceLoading } = useGetStockPrices(
        {
            companyStockDetailId: selectedProduct?.id,
            ...(companyDebtorId ? { companyDebtorId } : {}),
        },
        !!selectedProduct?.id,
    );

    const fallbackPriceType: CartItemPricingType = {
        id: '',
        companyStockPricingTypeId: '',
        priceExclusive: 0,
        priceInclusive: 0,
        type: { name: 'Default' },
    };

    useEffect(() => {
        if (!selectedProduct || isPriceLoading || !isOnline) return;

        let defaultPriceType = fallbackPriceType;

        const rows = priceData?.data?.rows || [];
        defaultPriceType =
            rows.length > 0 && rows[0].pricingTypes.length > 0 ? rows[0].pricingTypes[0] : fallbackPriceType;

        onSelectProduct(selectedProduct, defaultPriceType, scannedBaseQuantityRef.current);
        scannedBaseQuantityRef.current = 1;
        setPopoverOpen(false);
    }, [priceData, isPriceLoading, selectedProduct, onSelectProduct, isOnline]);

    const popoverOpen = internalOpen;

    const setPopoverOpen = (open: boolean) => {
        if (isPriceLoading && !open) return;
        setInternalOpen(open);
        if (!open) onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') setPopoverOpen(false);
    };

    const handleSelectAndClose = (product: StockDetails, scannedBaseQuantity = 1, fromPackageScan = false) => {
        if (!product) return;

        if (product.itemOnHold) {
            setSelectedDefectiveProduct(product);
            setShowItemOnHoldDialog(true);
            return;
        }

        // A pack/case row selected manually is rejected for store billing so the operator
        // picks the unit item. A package barcode that resolves to that same pack SKU is
        // valid: it is sold as one selling unit and the SKU's own conversion applies.
        if (storeBilling && isPackSellingUnit(product) && !fromPackageScan) {
            setSelectedDefectiveProduct(product);
            setShowPackBlockedDialog(true);
            return;
        }

        const productOnHand = product?.availableStock ?? (product?.stockOnHand || 0);

        console.log('Scanned Product:', product);
        console.log('Stock On Hand:', product.stockOnHand);
        console.log('Calculated Product On Hand:', productOnHand);
        console.log('Barcode:', scannedBarcode);

        if (isEmptyStockValidation && productOnHand <= 0) {
            setSelectedDefectiveProduct(product);
            setShowEmptyStockDialog(true);
            return;
        }

        setFilters({ search: '' });
        scannedBaseQuantityRef.current = Math.max(1, Number(scannedBaseQuantity) || 1);

        if (isOnline) {
            setSelectedProduct(null);
            setTimeout(() => setSelectedProduct({ ...product, stockOnHand: productOnHand }), 0);
        } else {
            let defaultPriceType = fallbackPriceType;

            const rows = products?.data?.rows?.find((row) => row.id === product?.id)?.pricingTypes;

            defaultPriceType =
                rows && rows?.length > 0 ? rows?.find((type) => type?.isDefault) || rows?.[0] : fallbackPriceType;

            onSelectProduct(
                { ...product, stockOnHand: productOnHand },
                defaultPriceType,
                scannedBaseQuantityRef.current,
            );
            scannedBaseQuantityRef.current = 1;
            setPopoverOpen(false);
        }
    };

    // Store billing: resolve the configured unit item behind a pack and select it so its own
    // pricing is loaded. The operator must confirm; we never silently swap the product.
    const handleSelectUnitItem = async () => {
        const pack = selectedDefectiveProduct;
        setShowPackBlockedDialog(false);
        if (!pack) return;

        const baseId = pack.baseStockDetailId || pack.baseInventoryItemId;
        if (!baseId) return;

        if (!isOnline) {
            toast.error('Selecting the unit item requires a connection. Please search for the unit item.');
            return;
        }

        try {
            const res = await companyStockDetailById(baseId);
            const unit = res?.data;
            if (!unit) {
                toast.error('The unit item could not be loaded.');
                return;
            }
            handleSelectAndClose(unit);
        } catch {
            toast.error('The unit item could not be loaded.');
        }
    };

    useEffect(() => {
        if (!scannedBarcode) {
            clearFilters();
            return;
        }

        const newFilters = { search: scannedBarcode };
        setFilters(newFilters);
        handleFilters(newFilters);
    }, [scannedBarcode]);

    // useEffect(() => {
    //     if (!isLoading && scannedBarcode) {
    //         if (products?.data?.rows?.length) {
    //             handleSelectAndClose(products.data.rows[0]);
    //         } else {
    //             toast.error('No product found for the matched barcode');
    //             setSelectedProduct(null);
    //             onClose();
    //         }
    //     }
    // }, [isLoading, products, scannedBarcode]);

    // Every scanned barcode is resolved through the barcode service first. The product
    // search is fuzzy and can return an unrelated first row, which previously hid package
    // barcodes (SHRINK/CASE/PALLET) from the resolve call.
    useEffect(() => {
        if (!scannedBarcode) {
            setResolvedScan(null);
            setResolveSettled(null);
            return;
        }
        if (!isOnline) return;

        let cancelled = false;
        setResolvedScan(null);
        setResolveSettled(null);

        (async () => {
            try {
                const resolved = await resolveStockBarcode({
                    barcode: scannedBarcode,
                    scannedPackageQuantity: 1,
                    ...(warehouseId ? { warehouseId } : {}),
                });
                if (cancelled) return;

                const data = resolved?.data;
                if (resolved?.success && data?.companyStockDetailId) {
                    const byId = await companyStockDetailById(data.companyStockDetailId);
                    if (cancelled) return;

                    const product = byId?.data;
                    if (product) {
                        // The resolved base quantity is already in base units. If the resolved row
                        // is itself a pack SKU, the backend converts its selling quantity to base
                        // units, so submit one selling unit per scan instead of multiplying again.
                        const convertedQty = Number(data.baseStockQuantity ?? data.baseQuantityPerScan ?? 1);
                        const sellingQty = isPackSellingUnit(product) ? 1 : Math.max(1, convertedQty || 1);
                        setResolvedScan({ barcode: scannedBarcode, product, quantity: sellingQty });
                        return;
                    }
                }
            } catch {
                // Not a mapped barcode; fall back to the product search below.
            }

            if (!cancelled) setResolveSettled(scannedBarcode);
        })();

        return () => {
            cancelled = true;
        };
    }, [scannedBarcode, warehouseId, isOnline]);

    // Apply the resolved package quantity first; only after resolution settles may the
    // normal product barcode path use the search results.
    useEffect(() => {
        if (!scannedBarcode) {
            processedBarcodeRef.current = null;
            return;
        }
        if (processedBarcodeRef.current === scannedBarcode) return;

        if (resolvedScan?.barcode === scannedBarcode) {
            processedBarcodeRef.current = scannedBarcode;
            handleSelectAndClose(resolvedScan.product, resolvedScan.quantity, true);
            return;
        }

        if (isOnline && resolveSettled !== scannedBarcode) return;
        if (isLoading) return;

        processedBarcodeRef.current = scannedBarcode;
        const rows = products?.data?.rows || [];
        const exactMatch = rows.find((p) => p.barcode === scannedBarcode);
        const product = exactMatch;

        if (product) {
            handleSelectAndClose(product);
            return;
        }

        toast.error('No product found for the matched barcode');
        setSelectedProduct(null);
        onClose();
    }, [scannedBarcode, resolvedScan, resolveSettled, isLoading, products, isOnline]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const container = target.closest('.product-search-container');
            const dropdown = target.closest('.product-dropdown');

            if (popoverOpen && !container && !dropdown) {
                setInternalOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [popoverOpen]);

    // Debouncing

    const [searchInput, setSearchInput] = useState(filters.search);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    return (
        <>
            <div className="relative w-full">
                <Input
                    placeholder="Search by code, description or barcode"
                    value={
                        isFocused
                            ? searchInput
                            : externalSelectedProduct
                              ? `${externalSelectedProduct.description} (${externalSelectedProduct.itemCode})`
                              : ''
                    }
                    onChange={(e) => {
                        const value = e.target.value;
                        setSearchInput(value);

                        if (timerRef.current) clearTimeout(timerRef.current);

                        if (value.length === 1) {
                            setFilters({ ...filters, search: value });
                            if (value) setInternalOpen(true);
                        } else {
                            timerRef.current = setTimeout(() => {
                                setFilters({ ...filters, search: value });
                                if (value) setInternalOpen(true);
                            }, 700);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        setIsFocused(true);
                        setSelectedProduct(null);
                        onSelectProduct(null, null);
                        if (filters.search) setInternalOpen(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                    // autoFocus
                />

                {popoverOpen && (
                    <div className="product-dropdown absolute z-50 mt-1 w-[400px] rounded-md border bg-white shadow-lg">
                        <div className="h-[300px] overflow-auto">
                            {isLoading || isPriceLoading ? (
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-muted-foreground ml-2 text-sm">
                                        {isPriceLoading ? 'Loading pricing...' : 'Loading products...'}
                                    </span>
                                </div>
                            ) : products?.data?.rows && products.data.rows.length > 0 ? (
                                <div className="p-0">
                                    {products.data.rows.map((product) => {
                                        const stockOnHand = product?.availableStock ?? +product?.stockOnHand;
                                        return (
                                            <div
                                                key={product.id}
                                                className={cn(
                                                    'hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center justify-between border-b px-2 py-1 text-sm',
                                                    selectedProduct?.id === product.id &&
                                                        'bg-accent text-accent-foreground',
                                                )}
                                                onClick={() => handleSelectAndClose(product)}
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium">
                                                        {product.description} ({product.itemCode})
                                                    </div>

                                                    <div className="item-center flex justify-between">
                                                        <div
                                                            className={`text-xs font-semibold ${stockOnHand <= 5 ? 'text-red-500' : 'text-green-700'}`}
                                                        >
                                                            {stockOnHand} in inventory
                                                        </div>

                                                        {product.barcode && (
                                                            <div className="text-muted-foreground text-xs">
                                                                {product.barcode}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {externalSelectedProduct?.id === product.id && (
                                                    <Check className="h-4 w-4" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-muted-foreground p-4 text-center text-sm">No product found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showItemOnHoldDialog && (
                <ConfirmDialog
                    open={showItemOnHoldDialog}
                    title="Item on Hold"
                    description={`Item with code ${selectedDefectiveProduct?.itemCode} is on hold. Please try different item.`}
                    setOpen={setShowItemOnHoldDialog}
                    onConfirm={() => {
                        setShowItemOnHoldDialog(false);
                        setSelectedDefectiveProduct(null);
                    }}
                    confirmBtnTitle="Ok"
                    hideCancel={true}
                />
            )}

            {showEmptyStockDialog && (
                <ConfirmDialog
                    open={showEmptyStockDialog}
                    title="Empty Stock"
                    description={`Item with code ${selectedDefectiveProduct?.itemCode} is not available. Please try again after restocking this item.`}
                    setOpen={setShowEmptyStockDialog}
                    onConfirm={() => {
                        setShowEmptyStockDialog(false);
                        setSelectedDefectiveProduct(null);
                    }}
                    confirmBtnTitle="Ok"
                    hideCancel={true}
                    variant="destructive"
                />
            )}

            {showPackBlockedDialog && (
                <ConfirmDialog
                    open={showPackBlockedDialog}
                    title="Pack Item Selected"
                    description={`"${selectedDefectiveProduct?.description}" is a pack item. Please select the unit item for store billing.`}
                    setOpen={setShowPackBlockedDialog}
                    onConfirm={
                        selectedDefectiveProduct?.baseStockDetailId || selectedDefectiveProduct?.baseInventoryItemId
                            ? handleSelectUnitItem
                            : () => setShowPackBlockedDialog(false)
                    }
                    confirmBtnTitle={
                        selectedDefectiveProduct?.baseStockDetailId || selectedDefectiveProduct?.baseInventoryItemId
                            ? 'Select Unit Item'
                            : 'Ok'
                    }
                    hideCancel={
                        !(
                            selectedDefectiveProduct?.baseStockDetailId ||
                            selectedDefectiveProduct?.baseInventoryItemId
                        )
                    }
                />
            )}
        </>
    );
}
