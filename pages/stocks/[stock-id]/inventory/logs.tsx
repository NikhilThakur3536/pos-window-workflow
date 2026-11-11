import { NextPageWithLayout } from '@/types';
import { useRouter } from 'next/router';
import StockInventoryLogs from '@/modules/common/stocks/inventories/logs';

const StockInventoryLogsPage: NextPageWithLayout = () => {
    const router = useRouter();
    const stockId = Array.isArray(router.query['stock-id'])
        ? router.query['stock-id'][0]
        : router.query['stock-id'] || '';

    return stockId && <StockInventoryLogs stockId={stockId} />;
};

StockInventoryLogsPage.layoutType = 'dashboard';

export default StockInventoryLogsPage;
