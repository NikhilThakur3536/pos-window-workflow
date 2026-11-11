import React, { useState } from 'react';
import { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { PromotionCreateSchema, PromotionUpdateSchema } from '@/api-queries/promotions';
import { Button } from '@/components/ui/button';
import { ProductSelection } from '@/modules/common/hoc/product-selection';
import { useNetworkStore } from '@/stores/network.store';
import { toast } from 'sonner';
import { StockDetails } from '@/api-queries/company/stock-details';
import BarcodeScanner from '@/modules/common/hoc/bar-code-scanner';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CommonItemsSelection {
    watch: UseFormWatch<PromotionCreateSchema | PromotionUpdateSchema>;
    setValue: UseFormSetValue<PromotionCreateSchema | PromotionUpdateSchema>;
    isQuantityCol?: boolean;
}

const CommonItemsSelection = ({ watch, setValue, isQuantityCol = false }: CommonItemsSelection) => {
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
    const handleSelectItem = (product: StockDetails) => {
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
                        <th className="w-1/4 p-1 px-2 text-left font-medium">Code</th>
                        <th className="w-3/4 p-1 px-2 text-left font-medium">Description</th>
                        {isQuantityCol && <th className="p-1 px-2 text-left font-medium">Quantity</th>}
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
                            <td colSpan={isQuantityCol ? 4 : 3} className="p-4 text-center">
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

export default CommonItemsSelection;
