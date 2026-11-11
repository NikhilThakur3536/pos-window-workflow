import { Button } from '@/components/ui/button';
import { DUMMY_STOCK_DETAILS } from '../../../../../dummy-data/product-details-dummy-data';
import { StockDetails } from '@/api-queries/company/stock-details';

interface StockDetailProps {
    product: StockDetails | null;
}

export default function StockDetail({ product }: StockDetailProps) {
    const displayData = product
        ? {
              itemCode: product.itemCode,
              description: product.description,
              retailPrice: 'R 40.00',
              onhand: 'On Hand',
              packSize: '1',
              packDescription: 'Single Unit',
              department: '001',
              groupCode: 'GRP001',
              salesOrders: 0,
              purchaseOrders: 0,
              deliveriesCollections: 0,
              currentStock: 'Current Stock',
              wholesalePrice: 'R 36.00',
              alternativePrice1: 0.0,
              alternativePrice2: 0.0,
              alternativePrice3: 0.0,
              averageCost: 0.0,
              latestCost: 0.0,
              //   futureCost: 0.0,
              //   managerCost: 0.0,
              posSales: 0.0,
              availableOnhand: product.availableStock ?? 0,
          }
        : DUMMY_STOCK_DETAILS;

    const renderField = (label: string, value: string | number) => (
        <div className="flex items-center justify-between rounded border bg-gray-50 px-3 py-2 text-xs">
            <span className="text-gray-500">{label}</span>
            <span className="text-right font-medium">{value}</span>
        </div>
    );

    return (
        <div className="flex h-full flex-col overflow-auto pr-3 text-xs">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {renderField('Item Code', displayData.itemCode)}
                {renderField('Description', displayData.description)}
                {renderField('Pack Size', displayData.packSize)}
                {renderField('Pack Description', displayData.packDescription)}
                {renderField('Retail Price', displayData.retailPrice)}
                {renderField('Wholesale Price', displayData.wholesalePrice)}
                {renderField('Department', displayData.department)}
                {renderField('Group Code', displayData.groupCode)}
                {renderField('Alternative Price 1', displayData.alternativePrice1.toFixed(2))}
                {renderField('Alternative Price 2', displayData.alternativePrice2.toFixed(2))}
                {renderField('Alternative Price 3', displayData.alternativePrice3.toFixed(2))}
                {renderField('Sales Orders', displayData.salesOrders)}
                {renderField('Purchase Orders', displayData.purchaseOrders)}
                {renderField('Deliveries & Collections', displayData.deliveriesCollections)}
                {renderField('Current Stock', displayData.currentStock)}
                {renderField('Available Onhand', displayData.availableOnhand.toFixed(2))}
                {renderField('Average Cost', displayData.averageCost.toFixed(2))}
                {renderField('Latest Cost', displayData.latestCost.toFixed(2))}
                {/* {renderField('Future Cost', displayData.futureCost.toFixed(2))}
                {renderField('Manager Cost', displayData.managerCost.toFixed(2))} */}
                {renderField('Regular Supplier', '')}
            </div>

            <div className="mt-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2 text-xs">
                    <Button variant="outline" className="h-7 bg-transparent px-3 text-xs">
                        Calculate
                    </Button>
                    <span className="text-gray-500">POS Sales:</span>
                    <span className="font-medium">{displayData.posSales.toFixed(2)}</span>
                </div>

                <div className="flex flex-col items-center justify-center rounded-md border p-4 text-center text-xs">
                    <img
                        src="/assets/images/no-image-placeholder.jpg"
                        alt="Product Image Placeholder"
                        className="mb-2 h-20 w-20 object-contain"
                    />
                    <span>Double-Click to display Stock Image</span>
                </div>
            </div>
        </div>
    );
}
