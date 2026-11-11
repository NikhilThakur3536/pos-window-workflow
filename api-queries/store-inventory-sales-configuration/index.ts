import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- 3229 STORE INVENTORY & SALES CONFIGURATION ---------------------------------------
//
// Per-store settings that control how the store orders stock and when inventory is posted.
//   orderMode                  - MANUAL / AUTOMATED_RECOMMENDATION / HYBRID ordering behaviour.
//   salesLookbackDays          - window of sales history feeding replenishment recommendations.
//   targetStockDays            - desired days of stock cover on hand.
//   safetyStockDays            - extra buffer held on top of the target cover.
//   seasonalUpliftPercent      - seasonal increase applied to the target cover.
//   inventoryPostingTrigger    - ACCOUNT_SALE or DELIVERY_CONFIRMATION. Defaults to DELIVERY_CONFIRMATION.
//   invoiceCreationMode        - MANUAL_DC_CASHIER is currently the only supported mode.
//
// The posting trigger is snapshotted onto each Store Order when it is created, so editing this
// configuration later never re-triggers or suppresses posting for orders that already exist.

export const STORE_ORDER_MODES = ['MANUAL', 'AUTOMATED_RECOMMENDATION', 'HYBRID'] as const;
export type StoreOrderMode = (typeof STORE_ORDER_MODES)[number];

export const STORE_INVENTORY_POSTING_TRIGGERS = ['ACCOUNT_SALE', 'DELIVERY_CONFIRMATION'] as const;
export type StoreInventoryPostingTrigger = (typeof STORE_INVENTORY_POSTING_TRIGGERS)[number];

export const STORE_INVOICE_CREATION_MODES = ['MANUAL_DC_CASHIER'] as const;
export type StoreInvoiceCreationMode = (typeof STORE_INVOICE_CREATION_MODES)[number];

export const DEFAULT_STORE_INVENTORY_POSTING_TRIGGER: StoreInventoryPostingTrigger = 'DELIVERY_CONFIRMATION';

const numberField = (fallback: number) =>
    z.coerce.number().min(0, 'Cannot be negative').default(fallback);

export const storeInventorySalesConfigurationSchema = z.object({
    companyDebtorId: z.string().min(1, 'Select a store'),
    orderMode: z.enum(STORE_ORDER_MODES).default('MANUAL'),
    salesLookbackDays: numberField(30),
    targetStockDays: numberField(7),
    safetyStockDays: numberField(2),
    seasonalUpliftPercent: numberField(0),
    inventoryPostingTrigger: z.enum(STORE_INVENTORY_POSTING_TRIGGERS).default(
        DEFAULT_STORE_INVENTORY_POSTING_TRIGGER,
    ),
    invoiceCreationMode: z.enum(STORE_INVOICE_CREATION_MODES).default('MANUAL_DC_CASHIER'),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type StoreInventorySalesConfigurationInput = z.infer<typeof storeInventorySalesConfigurationSchema>;

export interface StoreInventorySalesConfigurationDetails extends StoreInventorySalesConfigurationInput {
    id?: string;
    companyDebtorName?: string;
    updatedAt?: string;
    createdAt?: string;
}

export interface SaveStoreInventorySalesConfigurationResponse {
    success: boolean;
    message: string;
    data?: StoreInventorySalesConfigurationDetails;
}

export async function saveStoreInventorySalesConfiguration(
    data: StoreInventorySalesConfigurationInput,
): Promise<SaveStoreInventorySalesConfigurationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeInventorySalesConfiguration.save.url,
            method: apiUrls.storeInventorySalesConfiguration.save.method,
            data,
        })
    ).data;
}

export const useSaveStoreInventorySalesConfiguration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveStoreInventorySalesConfiguration,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.storeInventorySalesConfiguration)] });
            // The posting trigger is read alongside Store Orders, so refresh those too.
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyDebtorOrder)] });
        },
    });
};
