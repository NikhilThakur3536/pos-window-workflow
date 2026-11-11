import { DUMMY_RATE_OF_SALES } from '../../../../../dummy-data/product-details-dummy-data';
import { RateOfSalesData } from '../../../../../dummy-data/product-details-dummy-data';
import { StockDetails } from '@/api-queries/company/stock-details';

interface RateOfSalesProps {
    product: StockDetails | null;
}

export default function RateOfSales({ product }: RateOfSalesProps) {
    const displayData = product
        ? {
              itemCode: product.itemCode,
              description: product.description,
              netSales30: 15,
              netPurchases30: 10,
              netSales60: 30,
              netPurchases60: 25,
              netSales90: 45,
              netPurchases90: 40,
              netSales120: 60,
              netPurchases120: 55,
              netSales150: 75,
              netPurchases150: 70,
              netSales180: 90,
              netPurchases180: 85,
          }
        : DUMMY_RATE_OF_SALES;

    return (
        <div className="text-xs text-gray-800">
            <div className="mb-3 space-y-1">
                <div className="flex justify-between">
                    <span className="text-gray-500">Item Code:</span>
                    <span className="font-medium">{displayData.itemCode}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Description:</span>
                    <span className="font-medium">{displayData.description}</span>
                </div>
            </div>

            <div className="mt-4 overflow-auto rounded border text-xs">
                <div className="grid grid-cols-[1fr_80px_80px] border-b bg-gray-100 px-2 py-1 font-semibold text-gray-700">
                    <div>Last X Trading Days</div>
                    <div className="text-center">Net Sales</div>
                    <div className="text-center">Net Purchases</div>
                </div>

                {[30, 60, 90, 120, 150, 180].map((days, i) => (
                    <div
                        key={days}
                        className={`grid grid-cols-[1fr_80px_80px] px-2 py-1 ${
                            i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                    >
                        <div className="text-gray-700">{days} Days</div>
                        <div className="text-center">{displayData[`netSales${days}` as keyof RateOfSalesData]}</div>
                        <div className="text-center">{displayData[`netPurchases${days}` as keyof RateOfSalesData]}</div>
                    </div>
                ))}
            </div>

            <div className="mt-4 text-[11px] leading-relaxed text-gray-500">
                <p>* Net Sales Qty = Invoices / POS Sales less Credit notes / POS Refunds</p>
                <p>* Net Purchases Qty = GRV less RTS</p>
                <p>* Last X Trading Days = Linked to 'Skip Saturdays and Sundays' under POS Default Settings</p>
            </div>
        </div>
    );
}
