import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StockPerformance from './prduct-details-tabs/stock-performance';
import TransactionHistory from './prduct-details-tabs/transaction-history';
import RateOfSales from './prduct-details-tabs/rate-of-sales';
import { RefreshCcwIcon, XIcon } from 'lucide-react';
import StockDetail from './prduct-details-tabs/stock-detail';
import { type StockDetails } from '@/api-queries/company/stock-details';

interface ProductDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: StockDetails | null;
}

const productDetailsMenu = [
    { value: 'details', label: 'Stock Details' },
    { value: 'performance', label: 'Stock Performance' },
    { value: 'transaction', label: 'Transaction History' },
    { value: 'rate', label: 'Rate of Sales' },
];

export function ProductDetailsDialog({ isOpen, onClose, product }: ProductDetailsDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <DialogHeader className="flex-none px-4 py-2">
                    <DialogTitle>Product Details</DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 flex-col overflow-auto px-4">
                    <Tabs defaultValue="details" className="flex flex-1 flex-col overflow-hidden">
                        <TabsList className="mb-4 flex h-7 flex-none rounded-none border-b border-gray-200 bg-gray-50 p-0">
                            {productDetailsMenu.map((tab) => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className="cursor-pointer rounded-none px-3 text-[12px] font-medium text-gray-600 transition-colors hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-gray-900"
                                >
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <TabsContent value="details" className="flex-1 overflow-hidden">
                            <StockDetail product={product} />
                        </TabsContent>

                        <TabsContent value="performance" className="flex-1 overflow-auto">
                            <StockPerformance />
                        </TabsContent>

                        <TabsContent value="transaction" className="flex-1 overflow-auto">
                            <TransactionHistory />
                        </TabsContent>

                        <TabsContent value="rate" className="flex-1 overflow-auto">
                            <RateOfSales product={product} />
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter className="flex-none px-4 py-2">
                    <Button variant="outline" size="sm" className="h-8 bg-transparent text-sm">
                        <RefreshCcwIcon className="mr-1 h-4 w-4" />
                        Refresh
                    </Button>

                    <Button onClick={onClose} size="sm" className="h-8 text-sm">
                        <XIcon className="mr-1 h-4 w-4" />
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
