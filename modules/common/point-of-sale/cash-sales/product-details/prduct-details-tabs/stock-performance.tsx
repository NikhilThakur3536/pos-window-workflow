import { useMemo } from 'react';
import { ListOnlyTable } from '@/components/list-only-table';
import { DUMMY_STOCK_PERFORMANCE } from '../../../../../dummy-data/product-details-dummy-data';

type StockPerformanceProps = {};

export default function StockPerformance({}: StockPerformanceProps) {
    const performanceColumns = useMemo(
        () => [
            { key: 'date', label: 'Date', className: 'w-[120px]' },
            { key: 'quantity', label: 'Quantity', className: 'w-[100px] text-right' },
            { key: 'value', label: 'Value', className: 'w-[100px] text-right' },
        ],
        [],
    );

    return <ListOnlyTable columns={performanceColumns} data={DUMMY_STOCK_PERFORMANCE} />;
}
