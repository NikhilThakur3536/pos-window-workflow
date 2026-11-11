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
import { useAuthUser } from '@/stores/auth-user.store';

// Second item grid for Buy-X-Get-Y promotions.
// - Buy-X-Get-Y free (e.g. B1G1): every line here is handed over free and marked isFree.
// - Buy-X-Get-Y percent (BIAGDPB): the line is sold at the promotion percentage, so it
//   keeps a normal quantity and is NOT marked free.
interface RewardItemsSelectionProps {
    watch: UseFormWatch<PromotionCreateSchema | PromotionUpdateSchema>;
    setValue: UseFormSetValue<PromotionCreateSchema | PromotionUpdateSchema>;
    isDiscountedItems?: boolean;
}

const RewardItemsSelection = ({
    watch,
    setValue,
    isDiscountedItems = false,
}: RewardItemsSelectionProps) => {
    const isOnline = useNetworkStore((state) => state?.online);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState<string>('');

    const rewardItems = watch('rewardItems');

    const handleScannedProduct = (barcode: string) => {
        setIsProductSelectionOpen(true);
        setScannedBarcode(String(barcode));
    };

    function onProductSelectionClose() {
        setIsProductSelectionOpen(false);
        setScannedBarcode('');
    }

    const handleSelectItem = (product: StockDetails) => {
        const currentItems = rewardItems || [];

        const itemExists = currentItems.some((item) => item.companyStockDetailId === product.id);

        if (itemExists) {
            toast.error('Item already added');
            setIsProductSelectionOpen(false);
            setScannedBarcode('');
            return;
        }

        const defaultPricing = product.pricingTypes?.find((pricing) => (pricing.priceInclusive ?? 0) > 0);

        const newItem = {
            companyStockDetailId: product.id,
            code: product.itemCode,
            description: product.description,
            onHand: product.stockOnHand,
            price: product.priceInclusive ?? defaultPricing?.priceInclusive,
            priceExclusive: product.priceExclusive ?? defaultPricing?.priceExclusive,
            quantity: 1,
            // BIAGDPB's second item is discounted, not free; only free offers carry the flag.
            ...(isDiscountedItems ? {} : { isFree: true }),
            companyTaxRateId: product.companyTaxRateId || undefined,
        };

        setValue('rewardItems', [...currentItems, newItem] as PromotionCreateSchema['rewardItems']);
        setIsProductSelectionOpen(false);
        setScannedBarcode('');
    };

    const handleRemoveItem = (index: number) => {
        const currentItems = rewardItems || [];
        setValue('rewardItems', currentItems.filter((_, i) => i !== index) as PromotionCreateSchema['rewardItems']);
    };

    const handleUpdateQuantity = (index: number, quantity: number) => {
        const currentItems = [...(rewardItems || [])];
        // Discounted items are normal basket lines: only whole quantities of 1 or more.
        // Free rewards keep the legacy 0-or-more behaviour.
        if (isDiscountedItems && (!Number.isInteger(quantity) || quantity < 1)) return;
        currentItems[index] = { ...currentItems[index], quantity };
        setValue('rewardItems', currentItems as PromotionCreateSchema['rewardItems']);
    };

    return (
        <>
            <table className="w-full text-xs">
                <thead className="sticky top-0 border-b bg-gray-50">
                    <tr>
                        <th className="w-1/4 p-1 px-2 text-left font-medium">Code</th>
                        <th className="w-2/4 p-1 px-2 text-left font-medium">Description</th>
                        <th className="p-1 px-2 text-left font-medium">Value (incl.)</th>
                        <th className="p-1 px-2 text-left font-medium">{isDiscountedItems ? 'Qty' : 'Free Qty'}</th>
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
                                {isDiscountedItems ? 'Add Item' : 'Add Reward'}
                            </Button>
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {!rewardItems || rewardItems.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-4 text-center">
                                <p className="text-xs text-gray-500 italic">
                                    {isDiscountedItems
                                        ? 'No discounted items added yet'
                                        : 'No reward items added yet'}
                                </p>
                                <Button
                                    type="button"
                                    className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsProductSelectionOpen(true);
                                    }}
                                >
                                    {isDiscountedItems ? 'Add Discounted Items' : 'Add Reward Items'}
                                </Button>
                            </td>
                        </tr>
                    ) : (
                        rewardItems.map((item, index) => (
                            <tr key={index} className="border-b bg-white hover:bg-gray-50">
                                <td className="p-1 px-2 text-xs">{(item as any).code}</td>
                                <td className="p-1 px-2 text-xs">{(item as any).description}</td>
                                <td className="p-1 px-2 text-xs">
                                    {currencySymbol}{' '}
                                    {((item as any)?.price != null ? Number((item as any).price) : 0).toFixed(2)}
                                </td>
                                <td className="p-1 px-2">
                                    <Input
                                        type="number"
                                        step={1}
                                        min={isDiscountedItems ? 1 : 0}
                                        className="h-5 w-20 text-[11px]"
                                        value={item.quantity || 0}
                                        onChange={(e) =>
                                            handleUpdateQuantity(
                                                index,
                                                isDiscountedItems
                                                    ? e.target.valueAsNumber
                                                    : e.target.valueAsNumber || 0,
                                            )
                                        }
                                    />
                                </td>
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

export default RewardItemsSelection;
