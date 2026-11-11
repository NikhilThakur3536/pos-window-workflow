import React, { useState } from 'react';
import { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { PromotionCreateSchema, PromotionUpdateSchema } from '@/api-queries/promotions';
import { Button } from '@/components/ui/button';
import { ProductSelection } from '@/modules/common/hoc/product-selection';
import { useNetworkStore } from '@/stores/network.store';
import { toast } from 'sonner';
import { StockDetails } from '@/api-queries/company/stock-details';
import { CartItemPricingType } from '@/api-queries/point-of-sale';
import BarcodeScanner from '@/modules/common/hoc/bar-code-scanner';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthUser } from '@/stores/auth-user.store';

interface SPItemsSelection {
    watch: UseFormWatch<PromotionCreateSchema | PromotionUpdateSchema>;
    setValue: UseFormSetValue<PromotionCreateSchema | PromotionUpdateSchema>;
    isQuantityCol?: boolean;
}

const SPItemsSelection = ({ watch, setValue, isQuantityCol = false }: SPItemsSelection) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const isOnline = useNetworkStore((state) => state?.online);

    const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);

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

    // Product Selection
    const handleSelectItem = (product: StockDetails, companyStockPrice: CartItemPricingType | null) => {
        if (!companyStockPrice) {
            toast.error('Invalid pricing! Please choose another product.');
            return;
        }

        const currentItems = qualifyingItems || [];

        const itemExists = currentItems.some((item: any) => item.companyStockDetailId === product.id);

        if (itemExists) {
            toast.error('Item already added');
            setIsProductSelectionOpen(false);
            setScannedBarcode('');
            return;
        }

        const newItem = {
            companyStockDetailId: product.id,
            code: product.itemCode,
            description: product.description,
            onHand: product.stockOnHand,
            price: companyStockPrice?.priceInclusive,
            priceExclusive: companyStockPrice?.priceExclusive,
            promotionalPrice: 0,
            ...(isQuantityCol && { quantityGiven: 0 }),
        };

        setValue('qualifyingItems', [...currentItems, newItem]);
        setIsProductSelectionOpen(false);
        setScannedBarcode('');
    };

    const handleRemoveItem = (index: number) => {
        const currentItems = qualifyingItems || [];
        const updatedItems = currentItems.filter((_: any, i: number) => i !== index);
        setValue('qualifyingItems', updatedItems);
    };

    const handleUpdatePromotionPrice = (index: number, promotionalPrice: number) => {
        const currentItems = [...(qualifyingItems || [])];
        currentItems[index] = { ...currentItems[index], promotionalPrice };
        setValue('qualifyingItems', currentItems);
    };

    const handleUpdateQuantity = (index: number, quantity: number) => {
        const currentItems = [...(qualifyingItems || [])];
        currentItems[index] = { ...currentItems[index], quantityGiven: quantity };
        setValue('qualifyingItems', currentItems);
    };

    const qualifyingItems = watch('qualifyingItems');

    return (
        <>
            <table className="w-full text-xs">
                <thead className="sticky top-0 border-b bg-gray-50">
                    <tr>
                        <th className="w-2/8 p-1 px-2 text-left font-medium">Code</th>
                        <th className="w-3/8 p-1 px-2 text-left font-medium">Description</th>
                        <th className="w-1/8 p-1 px-2 text-left font-medium">On Hand</th>
                        <th className="w-1/8 p-1 px-2 text-left font-medium">Price (incl./excl.)</th>
                        {isQuantityCol && <th className="p-1 px-2 text-left font-medium">Required Quantity</th>}
                        <th className="w-1/8 p-1 px-2 text-left font-medium">Promotion Price</th>
                        {isQuantityCol && <th className="p-1 px-2 text-left font-medium">Row Total</th>}
                        <th className="w-10 p-1 px-2 text-right font-medium">
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-max !p-0 text-xs"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsProductSelectionOpen(true);
                                }}
                            >
                                <Plus className="h-3 w-3" />
                                Add Item
                            </Button>
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {!qualifyingItems || qualifyingItems.length === 0 ? (
                        <tr>
                            <td colSpan={isQuantityCol ? 8 : 6} className="p-4 text-center">
                                <p className="text-xs text-gray-500 italic">No items added yet</p>
                                <Button
                                    type="button"
                                    className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsProductSelectionOpen(true);
                                    }}
                                >
                                    Add Items
                                </Button>
                            </td>
                        </tr>
                    ) : (
                        qualifyingItems.map((item: any, index: number) => (
                            <tr key={index} className="border-b bg-white hover:bg-gray-50">
                                <td className="p-1 px-2 text-xs">{item.code}</td>
                                <td className="p-1 px-2 text-xs">{item.description}</td>
                                <td
                                    className={`p-1 px-2 text-xs font-bold ${item.onHand <= 5 ? 'text-red-600' : 'text-green-700'}`}
                                >
                                    {item.onHand}
                                </td>
                                <td className="p-1 px-2 text-xs">
                                    <div>
                                        {currencySymbol} {Number(item.price ?? 0).toFixed(2)}
                                    </div>
                                    {item.priceExclusive != null && (
                                        <div className="text-[10px] text-gray-500">
                                            excl {currencySymbol} {Number(item.priceExclusive).toFixed(2)}
                                        </div>
                                    )}
                                </td>
                                {isQuantityCol && (
                                    <td className="p-1 px-2">
                                        <Input
                                            type="number"
                                            step={1}
                                            min={0}
                                            className="h-5 w-20 text-[11px]"
                                            value={item.quantityGiven || 0}
                                            onChange={(e) => handleUpdateQuantity(index, e.target.valueAsNumber || 0)}
                                        />
                                    </td>
                                )}
                                <td className="p-1 px-2">
                                    <div className="relative w-24">
                                        <div className="absolute top-1/2 left-0 flex h-full -translate-y-1/2 items-center justify-center rounded-l-sm bg-gray-200 px-1 text-[11px] font-bold">
                                            {currencySymbol}
                                        </div>

                                        <Input
                                            type="number"
                                            step={1}
                                            min={0}
                                            className="h-6 w-full pl-5 text-[11px]"
                                            value={item.promotionalPrice || ''}
                                            onChange={(e) =>
                                                handleUpdatePromotionPrice(index, e.target.valueAsNumber || 0)
                                            }
                                        />
                                    </div>
                                </td>
                                {isQuantityCol && (
                                    <td className="p-1 px-2 text-xs font-medium">
                                        {currencySymbol}{' '}
                                        {(
                                            (Number(item.quantityGiven) || 0) * (Number(item.promotionalPrice) || 0)
                                        ).toFixed(2)}
                                    </td>
                                )}

                                <td className="p-1 px-2 text-right">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveItem(index)}
                                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {isProductSelectionOpen && (
                <ProductSelection
                    isOpen={isProductSelectionOpen}
                    onClose={onProductSelectionClose}
                    isOnline={isOnline}
                    onSelectProduct={handleSelectItem}
                    scannedBarcode={scannedBarcode}
                    setScannedBarcode={setScannedBarcode}
                />
            )}

            <BarcodeScanner onScan={handleScannedProduct} active={true} />
        </>
    );
};

export default SPItemsSelection;
