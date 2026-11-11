import { StockDetails } from '@/api-queries/company/stock-details';

export interface CartItem extends StockDetails {
    companyStockDetailId: string;
    companyStockPricingTypeId?: string;
    quantity: number;
    selectedSerialNumber?: string;
    unitPrice: number;
    discount: number;
    lineTotal: number;
    comment?: string;
    lineComment?: string;
    stockDispositionId?: string;
    stockDispositionVersion?: number;
}

export interface SerialNumber {
    serial: string;
    description: string;
}
