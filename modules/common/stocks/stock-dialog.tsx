import { useCompanyStockDetailById } from '@/api-queries/company/stock-details';
import { useCompanyStockPricingList } from '@/api-queries/company/stock-pricing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StockDetailsForm from '@/modules/common/stocks/stock-detail-form';
// import StockItemSupplier from '@/modules/common/stocks/stock-item-supplier';
import StockPricingForm from '@/modules/common/stocks/stock-pricing-form';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PageLoader } from '@/components/custom-components/PageLoader';

type StockDialogProps = {
    stockId: string | null;
    setStockId: (stockId: string | null) => void;
    open: boolean;
    onClose: () => void;
};

const items = [
    {
        label: 'Stock Details',
        value: 'stock-details',
        isInitialDataRequired: false,
        Comp: StockDetailsForm,
    },
    {
        label: 'Stock Pricing',
        value: 'stock-pricing',
        isInitialDataRequired: true,
        Comp: StockPricingForm,
    },
    // {
    //     label: 'Items Suppliers',
    //     value: 'stock-item-supplier',
    //     isInitialDataRequired: true,
    //     Comp: StockItemSupplier,
    // },
];

export default function StockDialog({ open, onClose, stockId, setStockId }: StockDialogProps) {
    // const [stockId, setStockId] = useState<string | null>(null);
    const [action, setAction] = useQueryState('action', parseAsBoolean.withDefault(open));
    // const [stockId, setStockId] = useQueryState('stockId', { defaultValue: '' });
    void useCompanyStockPricingList(stockId!);
    const { data, isLoading } = useCompanyStockDetailById(stockId!);

    const initialDataAvailable = !!data?.data;

    const tabItems = useMemo(
        () =>
            items.map((item) => ({
                ...item,
                isDisabled: item.isInitialDataRequired && !initialDataAvailable,
            })),
        [initialDataAvailable],
    );

    function handleClose() {
        setStockId('');
        setAction(!action);
        onClose();
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="size-full overflow-auto p-2">
                <Tabs defaultValue="stock-details" className="relative">
                    <div className="flex items-center justify-between">
                        <div>
                            {stockId ? (
                                <TabsList>
                                    {tabItems.map((item) => (
                                        <TabsTrigger key={item.value} value={item.value} disabled={item.isDisabled}>
                                            {item.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            ) : (
                                <TabsList>
                                    <TabsTrigger value="stock-details">Stock Details</TabsTrigger>
                                </TabsList>
                            )}
                        </div>
                    </div>

                    {stockId && isLoading
                        ? null
                        : tabItems.map((item) => (
                              <TabsContent key={item.value} value={item.value}>
                                  {/* @ts-ignore */}
                                  <item.Comp
                                      stockId={stockId || ''}
                                      backButton={
                                          <Button onClick={handleClose} variant="outline" className="h-auto px-6">
                                              <ArrowLeft className="h-5 w-5" />
                                              <span>Back</span>
                                          </Button>
                                      }
                                      onClose={onClose}
                                  />
                              </TabsContent>
                          ))}
                </Tabs>
            </div>
        </PageLoader>
    );
}
