import { useState } from 'react';
import { Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import DefaultSettings4 from './default-settings-4';
import DefaultSettings3 from './default-settings-3';
import DefaultSettings2 from './default-settings-2';
import DefaultSettings1 from './default-settings-1';
import ComponentSlider from '@/components/utility-components/component-slider';

const formSchema = z.object({
    // Sales Options
    storeSalesDays: z.number().min(0).default(1826),
    maxTransactionValue: z.number().min(0).default(0.0),
    liveUpdatingSales: z.boolean().default(false),
    showAllSellingPrices: z.boolean().default(false),
    allowSwitchingPrinter: z.boolean().default(false),
    disablePromotionalPricing: z.boolean().default(false),
    allowLineComments: z.boolean().default(false),
    enableReturnReason: z.boolean().default(false),
    usePosSlipLayout: z.boolean().default(false),
    lineByLineReturnReasons: z.boolean().default(false),
    enterQuantityBeforeCode: z.boolean().default(true),
    strictDocumentSearch: z.boolean().default(false),
    askNegativeStockOverrides: z.boolean().default(false),
    groupItemsOnPriceCode: z.boolean().default(false),
    askNegativeTotalOverrides: z.boolean().default(false),
    minutesPosMonitorActive: z.number().min(0).default(0),
    automaticallyLogOffSupervisor: z.boolean().default(false),
    warnCashierOnHandAmount: z.boolean().default(false),
    askCashAccountBeforeSale: z.boolean().default(false),
    enableAutoManufacturing: z.boolean().default(false),
    askOriginalDocument: z.boolean().default(true),
    noInitialFocusTenderScreen: z.boolean().default(false),
    autoRestrictAccess: z.boolean().default(false),
    disallowLoyaltyValidation: z.boolean().default(false),
    displayCashierName: z.boolean().default(false),
    strictDebtorSearch: z.boolean().default(false),
    printVoidedSales: z.boolean().default(false),
    postCodDebtorAuditTrail: z.boolean().default(false),
    printSuspendedSales: z.boolean().default(false),
    allowPreviewSavedOrders: z.enum(['no', 'yes', 'prompt']).default('no'),
    skipSaturdays: z.boolean().default(false),
    skipSundays: z.boolean().default(false),
    allowChangingTaxRate: z.boolean().default(false),

    // Till Options
    minLaybyeDeposit: z.number().min(0).default(20.0),
    maxVarianceSellprice: z.number().min(0).default(0.0),
    monthsAllowedLaybyes: z.number().min(0).default(3),
    term1: z.boolean().default(false),
    term2: z.boolean().default(false),
    term3: z.boolean().default(false),
    numberOfTerminals: z.number().min(0).default(1),
    maxLineDiscount: z.number().min(0).default(0.0),
    quantityDecimals: z.number().min(0).default(2),
    defaultSellingPrice: z
        .enum([
            'retail-price',
            'wholesale-price',
            'alternative-price-1',
            'alternative-price-2',
            'alternative-price-3',
            'alternative-price-4',
            'alternative-price-5',
            'alternative-price-6',
        ])
        .default('retail-price'),

    askForOrderNumber: z.boolean().default(false),
    askOnlyDebtorAccounts: z.boolean().default(false),

    cashSaleMessage: z.string().default(''),
    enableCashSaleMessage: z.boolean().default(false),

    askForSalesRep: z.boolean().default(false),
    postCashierNumber: z.boolean().default(true),
    rememberLastRep: z.boolean().default(false),
    defaultSalesRep: z.string().default(''),
    useDebtorRep: z.boolean().default(false),
    autoLockTerminal: z.number().min(0).default(0),

    dutyFree: z.boolean().default(false),

    enforceCustomFields: z.boolean().default(false),
    posTransactionDisplayTotalBreakdown: z.boolean().default(false),

    eftCustomerCopy: z.enum(['always-print', 'never-print']).default('always-print'),
    eftMerchantCopy: z.enum(['always-print', 'never-print']).default('always-print'),

    enablePrintEmailPrompt: z.boolean().default(false),
});

export type SettingFormValues = z.infer<typeof formSchema>;

export default function DefaultSettings() {
    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { isSubmitting },
    } = useForm<SettingFormValues>({
        defaultValues: {
            storeSalesDays: 1826,
            maxTransactionValue: 0.0,
            liveUpdatingSales: false,
            showAllSellingPrices: false,
            allowSwitchingPrinter: false,
            disablePromotionalPricing: false,
            allowLineComments: false,
            enableReturnReason: false,
            usePosSlipLayout: false,
            lineByLineReturnReasons: false,
            enterQuantityBeforeCode: true,
            strictDocumentSearch: false,
            askNegativeStockOverrides: false,
            groupItemsOnPriceCode: false,
            askNegativeTotalOverrides: false,
            minutesPosMonitorActive: 0,
            automaticallyLogOffSupervisor: false,
            warnCashierOnHandAmount: false,
            askCashAccountBeforeSale: false,
            enableAutoManufacturing: false,
            askOriginalDocument: true,
            noInitialFocusTenderScreen: false,
            autoRestrictAccess: false,
            disallowLoyaltyValidation: false,
            displayCashierName: false,
            strictDebtorSearch: false,
            printVoidedSales: false,
            postCodDebtorAuditTrail: false,
            printSuspendedSales: false,
            allowPreviewSavedOrders: 'no',
            skipSaturdays: false,
            skipSundays: false,
            allowChangingTaxRate: false,
            useDebtorRep: true,
            minLaybyeDeposit: 20.0,
            maxVarianceSellprice: 0.0,
            monthsAllowedLaybyes: 3,
            term1: false,
            term2: false,
            term3: false,
            numberOfTerminals: 1,
            maxLineDiscount: 0.0,
            quantityDecimals: 2,
            defaultSellingPrice: 'retail-price',

            askForOrderNumber: false,
            askOnlyDebtorAccounts: false,

            cashSaleMessage: '',
            enableCashSaleMessage: false,

            askForSalesRep: false,
            postCashierNumber: true,
            rememberLastRep: false,
            defaultSalesRep: '',
            autoLockTerminal: 0,

            dutyFree: false,

            enforceCustomFields: false,
            posTransactionDisplayTotalBreakdown: false,

            eftCustomerCopy: 'always-print',
            eftMerchantCopy: 'always-print',

            enablePrintEmailPrompt: false,
        },
    });

    const onSubmit = (data: SettingFormValues) => {
        console.log('Default Settings submitted:', data);
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for default settings');
    };

    const handleAccept = () => {
        handleSubmit(onSubmit)();
    };

    const [currentPage, setCurrentPage] = useState(0);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="settings-form relative p-4 !py-0">
            <AcceptHintActions
                onShowHints={handleShowHints}
                onAccept={handleAccept}
                containerClassName="flex-none !p-0 !py-2 border-t-0"
                SaveButtonIcon={Save}
            />

            <ComponentSlider currentPage={currentPage} setCurrentPage={setCurrentPage} />

            <div className="grid w-full gap-6 md:grid-cols-2">
                {currentPage === 0 && (
                    <>
                        <DefaultSettings1 register={register} control={control} />
                        <DefaultSettings2 register={register} control={control} />
                    </>
                )}

                {currentPage === 1 && (
                    <>
                        <DefaultSettings3 register={register} control={control} />
                        <DefaultSettings4 register={register} control={control} />
                    </>
                )}
            </div>
        </form>
    );
}
