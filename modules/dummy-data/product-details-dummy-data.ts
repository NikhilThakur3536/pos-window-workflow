export interface StockDetailsData {
    itemCode: string;
    description: string;
    packSize: string;
    packDescription: string;
    department: string;
    groupCode: string;
    salesOrders: number;
    purchaseOrders: number;
    deliveriesCollections: number;
    currentStock: number;
    retailPrice: number;
    wholesalePrice: number;
    alternativePrice1: number;
    alternativePrice2: number;
    alternativePrice3: number;
    averageCost: number;
    latestCost: number;
    // futureCost: number;
    // managerCost: number;
    posSales: number;
    availableOnhand: number;
}

export interface StockPerformanceData {
    date: string;
    quantity: number;
    value: number;
}

export interface TransactionHistoryData {
    date: string;
    account: string;
    accountName: string;
    reference: string;
    code: string;
    priceInc: number;
    priceExc: number;
    quantity: number;
    discount: number;
}

export interface RateOfSalesData {
    itemCode: string;
    description: string;
    netSales30: number;
    netPurchases30: number;
    netSales60: number;
    netPurchases60: number;
    netSales90: number;
    netPurchases90: number;
    netSales120: number;
    netPurchases120: number;
    netSales150: number;
    netPurchases150: number;
    netSales180: number;
    netPurchases180: number;
}

export const DUMMY_STOCK_DETAILS: StockDetailsData = {
    itemCode: '101',
    description: 'Test Item',
    packSize: '1',
    packDescription: 'Single Unit',
    department: '001',
    groupCode: 'GRP001',
    salesOrders: 0,
    purchaseOrders: 0,
    deliveriesCollections: 0,
    currentStock: 0,
    retailPrice: 1150.0,
    wholesalePrice: 1035.0,
    alternativePrice1: 0.0,
    alternativePrice2: 0.0,
    alternativePrice3: 0.0,
    averageCost: 0.0,
    latestCost: 0.0,
    // futureCost: 0.0,
    // managerCost: 0.0,
    posSales: 0.0,
    availableOnhand: 0.0,
};

export const DUMMY_STOCK_PERFORMANCE: StockPerformanceData[] = [
    { date: '2025-07-01', quantity: 10, value: 250.0 },
    { date: '2025-07-02', quantity: 15, value: 375.0 },
    { date: '2025-07-03', quantity: 8, value: 200.0 },
    { date: '2025-07-04', quantity: 20, value: 500.0 },
    { date: '2025-07-05', quantity: 12, value: 300.0 },
];

export const DUMMY_TRANSACTION_HISTORY: TransactionHistoryData[] = [
    {
        date: '2025-07-20',
        account: 'CASH',
        accountName: 'Cash Sale',
        reference: 'INV001',
        code: 'P001',
        priceInc: 25.99,
        priceExc: 24.75,
        quantity: 1,
        discount: 0.0,
    },
    {
        date: '2025-07-19',
        account: '588',
        accountName: 'Joe Bloggs',
        reference: 'INV002',
        code: 'P002',
        priceInc: 79.99,
        priceExc: 76.18,
        quantity: 2,
        discount: 5.0,
    },
    {
        date: '2025-07-18',
        account: 'CASH',
        accountName: 'Cash Sale',
        reference: 'CRN001',
        code: 'P003',
        priceInc: 35.5,
        priceExc: 33.81,
        quantity: -1,
        discount: 0.0,
    },
    {
        date: '2025-07-17',
        account: '589',
        accountName: 'Jane Doe',
        reference: 'INV003',
        code: 'P004',
        priceInc: 120.0,
        priceExc: 114.29,
        quantity: 1,
        discount: 0.0,
    },
];

export const DUMMY_RATE_OF_SALES: RateOfSalesData = {
    itemCode: '101',
    description: 'Test Item',
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
};
