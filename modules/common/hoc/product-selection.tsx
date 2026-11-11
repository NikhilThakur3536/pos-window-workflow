import {
    StockDetails,
    StockDetailsQuery,
    companyStockDetailById,
    useCompanyStockDetailsList,
    useCompanyStockDetailsOffline,
} from '@/api-queries/company/stock-details';
import { CartItemPricingType, getStockPrices, useGetStockPrices } from '@/api-queries/point-of-sale';
import { resolveStockBarcode } from '@/api-queries/company-stock-barcodes';
import { isPackSellingUnit } from '@/utils/selling-unit';
import ConfirmDialog from '@/components/confirm-dialog';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { ListOnlyTable } from '@/components/list-only-table';
// import MultiSelectPopover from '@/components/multi-select-popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Check, Eye, X } from 'lucide-react';
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProductDetailsDialog } from '../point-of-sale/cash-sales/product-details';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';

interface ProductSelectionProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectProduct: (
        product: StockDetails,
        companyStockPrice: CartItemPricingType | null,
        scannedBaseQuantity?: number,
    ) => void;
    companyDebtorId?: string | null;
    // When set, the products list is filtered to this warehouse.
    warehouseId?: string;
    // onSelectSerialNumber?: (serialNumber: SerialNumber, selectedProductForSerialNumber: StockDetails) => void;
    // isSerialNumberOpen?: boolean;
    // setIsSerialNumberOpen?: Dispatch<SetStateAction<boolean>>;
    isOnline: boolean;
    isEmptyStockValidation?: boolean;
    scannedBarcode?: string;
    setScannedBarcode?: Dispatch<SetStateAction<string>>;
    isGRV?: boolean;
    isReportToItem?: boolean;
    autoSelectWithPrice?: boolean;
    companyCreditorId?: string;
}

export function ProductSelection({
    isOpen,
    onClose,
    onSelectProduct,
    companyDebtorId = null,
    warehouseId,
    // isSerialNumberOpen,
    // setIsSerialNumberOpen,
    // onSelectSerialNumber,
    isOnline,
    autoSelectWithPrice,
    isEmptyStockValidation = false,
    scannedBarcode,
    setScannedBarcode,
    isGRV = false,
    isReportToItem = false,
}: ProductSelectionProps) {
    const initialFilters = {
        search: scannedBarcode || '',
        // selectedCategories: [] as string[],
        // selectedSubcategories: [] as string[],
    };

    const [selectedProductInModal, setSelectedProductInModal] = useState<StockDetails | null>(null);
    const processedBarcodeRef = useRef<string | null>(null);
    // Every scanned barcode is resolved through the barcode service before the fuzzy
    // product search, so package barcodes (SHRINK/CASE/PALLET) are not missed.
    const [resolvedScan, setResolvedScan] = useState<{
        barcode: string;
        product: StockDetails;
        quantity: number;
        price: CartItemPricingType | null;
    } | null>(null);
    const [resolveSettled, setResolveSettled] = useState<string | null>(null);

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<StockDetailsQuery>(initialFilters);

    const productSelectionColumns = useMemo(
        () => [
            { key: 'itemCode', label: 'Item Code', className: 'w-[80px]' },
            { key: 'generalCode', label: 'General Code', className: 'w-[80px]' },
            { key: 'description', label: 'Description', className: 'max-w-[200px] truncate' },
            {
                key: 'stock',
                label: 'Stock',
                className: 'text-center',
                render: (item: StockDetails) => {
                    const stockOnHand = item?.availableStock ?? +item?.stockOnHand;

                    // if (item.reportToItemChildren && item.reportToItemChildren?.length !== 0) {
                    //     stockOnHand -= item.reportToItemChildren?.reduce(
                    //         (sum, prod) => sum + (prod.stockOnHand || 0) * (prod.packSize || 0),
                    //         0,
                    //     );
                    // }

                    return (
                        <div className={`font-semibold ${stockOnHand <= 5 ? 'text-red-600' : 'text-green-700'}`}>
                            {stockOnHand}
                        </div>
                    );
                },
            },
            { key: 'barcode', label: 'Barcode', className: 'w-[100px]' },
        ],
        [],
    );

    const [showItemOnHoldDialog, setShowItemOnHoldDialog] = useState(false);
    const [showEmptyStockDialog, setShowEmptyStockDialog] = useState(false);

    const { data: products, isLoading } = isOnline
        ? useCompanyStockDetailsList({
              limit: pagination.pageSize,
              offset: pagination.pageIndex * pagination.pageSize,
              ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
              ...(isGRV ? {} : { pricing: true }),
              ...(isReportToItem ? { isReportToItem: false } : {}),
              ...(companyDebtorId ? { companyCreditorId: companyDebtorId } : {}),
              ...(warehouseId ? { warehouseId } : {}),
          })
        : useCompanyStockDetailsOffline(isOnline);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
        scannedBarcode && setScannedBarcode && setScannedBarcode('');
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    useEffect(() => {
        if (isOpen) {
            clearFilters();
        }
    }, [isOpen]);

    useEffect(() => {
        setFilters(initialFilters);
        handleFilters(initialFilters);
        if (!scannedBarcode) {
            clearFilters();
        }
    }, [scannedBarcode]);

    // Resolve the scanned barcode first so package mappings are used even when the fuzzy
    // product search returns an unrelated row.
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
                        // baseStockQuantity is already in base units. A pack SKU converts its
                        // own selling quantity, so it is submitted as one selling unit.
                        const convertedQty = Number(data.baseStockQuantity ?? data.baseQuantityPerScan ?? 1);
                        const quantity = isPackSellingUnit(product) ? 1 : Math.max(1, convertedQty || 1);

                        // Price the resolved product exactly like a manually selected one.
                        let price: CartItemPricingType | null = null;
                        if (!isGRV) {
                            try {
                                const priceRes = await getStockPrices({
                                    companyStockDetailId: product.id,
                                    ...(companyDebtorId ? { companyDebtorId } : {}),
                                });
                                const priceRows = priceRes?.data?.rows || [];
                                price =
                                    priceRows.length > 0 && priceRows[0].pricingTypes.length > 0
                                        ? priceRows[0].pricingTypes[0]
                                        : (product.pricingTypes?.find((p) => p.isDefault) ??
                                          product.pricingTypes?.[0] ??
                                          null);
                            } catch {
                                price = null;
                            }
                            if (cancelled) return;
                        }

                        setResolvedScan({ barcode: scannedBarcode, product, quantity, price });
                        return;
                    }
                }
            } catch {
                // Not a mapped barcode; fall back to the product search.
            }

            if (!cancelled) setResolveSettled(scannedBarcode);
        })();

        return () => {
            cancelled = true;
        };
    }, [scannedBarcode, warehouseId, isOnline, companyDebtorId, isGRV]);

    useEffect(() => {
        if (!scannedBarcode) {
            processedBarcodeRef.current = null;
            return;
        }
        if (processedBarcodeRef.current === scannedBarcode) return;

        if (resolvedScan?.barcode === scannedBarcode) {
            processedBarcodeRef.current = scannedBarcode;
            onSelectProduct(resolvedScan.product, isGRV ? null : resolvedScan.price, resolvedScan.quantity);
            setScannedBarcode?.('');
            onClose();
            return;
        }

        if (isOnline && resolveSettled !== scannedBarcode) return;
        if (isLoading) return;

        processedBarcodeRef.current = scannedBarcode;
        const rows = products?.data?.rows || [];
        const product = rows.find((row) => row.barcode === scannedBarcode);
        if (!product) return;

        const defaultPrice =
            product.pricingTypes?.find((p) => p.isDefault) ?? product.pricingTypes?.[0] ?? null;
        onSelectProduct(product, isGRV ? null : defaultPrice);
        setScannedBarcode?.('');
        onClose();
    }, [scannedBarcode, resolvedScan, resolveSettled, isLoading, products?.data?.rows, isOnline, isGRV]);

    const { refetch } = useGetStockPrices(
        {
            companyStockDetailId: selectedProductInModal?.id,
            ...(companyDebtorId ? { companyDebtorId } : {}),
        },
        false,
    );

    const handleSelectAndClose = () => {
        if (!selectedProductInModal) return;

        console.log('MANUAL SELECT PRODUCT:', selectedProductInModal);

        if (selectedProductInModal.itemOnHold && !isGRV) {
            setShowItemOnHoldDialog(true);
            return;
        }

        let productOnHand = selectedProductInModal.availableStock ?? selectedProductInModal.stockOnHand;
        // if (selectedProductInModal.reportToItemChildren && selectedProductInModal.reportToItemChildren?.length !== 0) {
        //     productOnHand -= selectedProductInModal.reportToItemChildren?.reduce(
        //         (sum, prod) => sum + (prod.stockOnHand || 0) * (prod.packSize || 0),
        //         0,
        //     );
        // }

        if (isEmptyStockValidation && productOnHand <= 0) {
            setShowEmptyStockDialog(true);
            return;
        }

        const fallbackPriceType: CartItemPricingType = {
            id: '',
            companyStockPricingTypeId: '',
            priceExclusive: 0,
            priceInclusive: 0,
            type: {
                name: 'Default',
            },
        };

        if (isGRV) {
            onSelectProduct(selectedProductInModal, null);
            return;
        }

        if (isOnline) {
            refetch()
                .then((res) => {
                    const rows = res.data?.data?.rows || [];
                    const defaultPriceType =
                        rows.length > 0 && rows[0].pricingTypes.length > 0
                            ? rows[0].pricingTypes[0]
                            : fallbackPriceType;

                    onSelectProduct({ ...selectedProductInModal, stockOnHand: productOnHand }, defaultPriceType);
                })
                .catch(() => {
                    onSelectProduct({ ...selectedProductInModal, stockOnHand: productOnHand }, fallbackPriceType);
                });
        } else {
            let defaultPriceType = fallbackPriceType;

            const rows = products?.data?.rows?.find((row) => row.id === selectedProductInModal?.id)?.pricingTypes;

            defaultPriceType =
                rows && rows?.length > 0 ? rows?.find((type) => type?.isDefault) || rows?.[0] : fallbackPriceType;

            onSelectProduct({ ...selectedProductInModal, stockOnHand: productOnHand }, defaultPriceType);
        }
    };

    // Product Details
    const [isProductDetailsModalOpen, setIsProductDetailsModalOpen] = useState(false);
    const [productDetailsModalContent, setProductDetailsModalContent] = useState<StockDetails | null>(null);

    const handleOpenProductDetailsModal = useCallback((product: StockDetails) => {
        setProductDetailsModalContent(product);
        setIsProductDetailsModalOpen(true);
    }, []);

    const handleViewDetailsAndKeepOpen = () => {
        if (selectedProductInModal) {
            handleOpenProductDetailsModal(selectedProductInModal);
        }
    };

    // Serial Number
    // const [selectedProductForSerialNumber, setSelectedProductForSerialNumber] = useState<StockDetails | null>(null);

    // const handleSelectSerialNumber = useCallback(
    //     (serialNumber: SerialNumber) => {
    //         if (selectedProductForSerialNumber && setIsSerialNumberOpen && onSelectSerialNumber) {
    //             onSelectSerialNumber(serialNumber, selectedProductForSerialNumber);
    //             setIsSerialNumberOpen(false);
    //             setSelectedProductForSerialNumber(null);
    //         }
    //     },
    //     [selectedProductForSerialNumber],
    // );

    // useEffect(() => {
    //     if (isSerialNumberOpen) {
    //         setSelectedProductForSerialNumber(selectedProductInModal);
    //     }
    // }, [isSerialNumberOpen]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent
                    className="h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0"
                    style={{ display: 'flex', maxHeight: 'calc(100vh - 0.5rem)' }}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    {/* <PageLoader isLoading={isLoading && !scannedBarcode} width="w-[80vw]" height="h-[95vh]"> */}
                        <DialogHeader className="mb-2 shrink-0 p-4 pb-0">
                            <DialogTitle>Select Product</DialogTitle>

                            <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                    {/* <MultiSelectPopover
                                    title="Select Categories"
                                    options={categoryOptions}
                                    selectedValue={filters?.selectedCategories}
                                    onSelect={(value) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            selectedCategories: value,
                                        }))
                                    }
                                /> */}

                                    {/* <MultiSelectPopover
                                    title="Select Subcategories"
                                    options={subcategoryOptions}
                                    selectedValue={filters?.selectedSubcategories}
                                    onSelect={(value) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            selectedSubcategories: value,
                                        }))
                                    }
                                /> */}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Search by code, description, barcode"
                                        value={filters.search || ''}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        onKeyDown={handleKeyDown}
                                        className="max-w-sm"
                                    />

                                    <FilterActionButtons
                                        onApplyFilters={handleApplyFilters}
                                        onClearClick={handleClearSearch}
                                        showClearButton={showClearButton}
                                    />
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="min-h-0 flex-1 overflow-hidden px-4">
                            <div className="h-full overflow-y-auto">
                                <ListOnlyTable
                                    columns={productSelectionColumns}
                                    data={products?.data?.rows || []}
                                    onRowClick={setSelectedProductInModal}
                                    onRowDoubleClick={handleOpenProductDetailsModal}
                                    selectedRowKey={selectedProductInModal?.id}
                                    rowKeyExtractor={(row) => row.id}
                                    pagination={pagination}
                                    setPagination={setPagination}
                                    totalCount={products?.data?.count}
                                    isLoading={isLoading}
                                />
                            </div>
                        </div>

                        {showItemOnHoldDialog && (
                            <ConfirmDialog
                                open={showItemOnHoldDialog}
                                title="Item on Hold"
                                description={`Item with code ${selectedProductInModal?.itemCode} is on hold. Please try different item.`}
                                setOpen={setShowItemOnHoldDialog}
                                onConfirm={() => setShowItemOnHoldDialog(false)}
                                confirmBtnTitle="Ok"
                                hideCancel={true}
                            />
                        )}

                        {showEmptyStockDialog && (
                            <ConfirmDialog
                                open={showEmptyStockDialog}
                                title="No Stock Alert"
                                description={`Item with code ${selectedProductInModal?.itemCode} is not available. Please try again after restocking this item.`}
                                setOpen={setShowEmptyStockDialog}
                                onConfirm={() => setShowEmptyStockDialog(false)}
                                confirmBtnTitle="Ok"
                                hideCancel={true}
                                variant="destructive"
                            />
                        )}

                        <DialogFooter className="flex shrink-0 justify-between px-6 pt-2 pb-6">
                            <Button variant="outline" onClick={onClose} className="h-8 gap-2 px-6 text-base">
                                <X className="h-5 w-5" />
                                Cancel
                            </Button>

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleViewDetailsAndKeepOpen}
                                    disabled={!selectedProductInModal}
                                    className="h-8 gap-2 px-6 text-base"
                                >
                                    <Eye className="h-5 w-5" />
                                    See Details
                                </Button>

                                <Button
                                    onClick={handleSelectAndClose}
                                    disabled={!selectedProductInModal}
                                    className="h-8 gap-2 px-6 text-base"
                                >
                                    <Check className="h-5 w-5" />
                                    Select Item
                                </Button>
                            </div>
                        </DialogFooter>
                    {/* </PageLoader> */}
                </DialogContent>
            </Dialog>

            {isProductDetailsModalOpen && (
                <ProductDetailsDialog
                    isOpen={isProductDetailsModalOpen}
                    onClose={() => setIsProductDetailsModalOpen(false)}
                    product={productDetailsModalContent}
                />
            )}

            {/* {isSerialNumberOpen && setIsSerialNumberOpen && (
                <SerialNumberSelection
                    isOpen={isSerialNumberOpen}
                    setIsOpen={setIsSerialNumberOpen}
                    onRowClick={handleSelectSerialNumber}
                />
            )} */}
        </>
    );
}