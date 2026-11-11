import z from 'zod';
import moment from 'moment-timezone';

const validTimezones = moment.tz.names();

export const taxItemSchema = z.object({
    companyTaxRateId: z.string(),
    priority: z.number().min(1, 'Priority must be at least 1').optional(),
    isCompound: z.boolean(),
    taxRateId: z.string().optional().nullable(),
});

export type TaxItemSchema = z.infer<typeof taxItemSchema>;

export const createStockBaseSchema = z.object({
    // Codes
    itemCode: z.string().min(1, { message: 'Item Code is required' }),
    unitCode: z.string().optional(),
    caseCode: z.string().optional(),
    shrinkCode: z.string().optional(),

    description: z.string({ error: 'Description is required' }).min(1, { message: 'Description is required' }),
    alternativeDescription: z.string().optional(),
    barcode: z.string().optional(),
    generalCode: z.string().optional(),
    stockType: z.string().optional(),
    categoryId: z.string().min(1, 'Category is Required'),
    subCategoryId: z.string().min(1, 'Sub Category is Required'),
    genericType: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    technicalSpecifications: z.string().optional(),
    supplierHierarchy: z.string().optional(),
    supplierDepartment: z.string().optional(),
    tariffCode: z.string().optional(),
    material: z.string().optional(),
    assemblyType: z.string().optional(),
    importType: z.string().optional(),
    colourDetailed: z.string().optional(),
    incoTerms: z.string().optional(),
    guaranteeTerms: z.string().optional(),
    buyer: z.string().optional(),
    underBatchControl: z.boolean().optional(),
    disallowDecimals: z.boolean().optional(),
    section7Exempt: z.boolean().optional(),
    domesticReverseCharge: z.boolean().optional(),
    abcClassification: z.string().optional(),
    overrideGrvLabelQty: z.boolean().optional(),
    overrideQty: z.string().optional(),
    excludeFromExtraCharge: z.boolean().optional(),
    ignoreQuantityChange: z.boolean().optional(),
    majorDepartment: z.string().optional(),
    minorDepartment: z.string().optional(),
    categories: z.string().optional(),
    ranges: z.string().optional(),
    rangeId: z.string().optional(),
    variantId: z.string().optional(),
    cycle: z.string().optional(),
    taxRate: z.string().optional(),
    dcItemCode: z.string().optional(),
    storageBinLocation: z.string().optional(),
    packSize: z.string().optional(),
    packDescription: z.string().optional(),
    reportToItem: z.string().optional(),
    lifeTimeDays: z.string().optional(),
    defaultLineRep: z.string().optional(),
    unitOfMeasureHolding: z.string().optional(),
    unitOfMeasureInput: z.string().optional(),
    weight: z.string().optional(),
    length: z.string().optional(),
    width: z.string().optional(),
    allowSellingUnderCost: z.boolean().optional(),
    allowSellingIntoNegative: z.boolean().optional(),
    allowDiscount: z.boolean().optional(),
    itemOnHold: z.boolean().optional(),
    storeSerialNumbers: z.boolean().optional(),
    scaleItem: z.boolean().optional(),
    setDormantDays: z.string().optional(),

    // Taxes

    taxes: z
        .array(taxItemSchema)
        .max(5, 'Maximum 5 taxes allowed')
        .optional()
        .superRefine((val, ctx) => {
            if (!val) return;

            val.forEach((item, index) => {
                const isEmpty = !item.companyTaxRateId && item.priority === undefined && item.isCompound === undefined;

                if (!isEmpty) {
                    if (!item.companyTaxRateId) {
                        ctx.addIssue({
                            path: [index, 'companyTaxRateId'],
                            code: z.ZodIssueCode.custom,
                            message: 'Required',
                        });
                    }
                    if (item.priority === undefined) {
                        ctx.addIssue({
                            path: [index, 'priority'],
                            code: z.ZodIssueCode.custom,
                            message: 'Required',
                        });
                    }
                    if (item.isCompound === undefined) {
                        ctx.addIssue({
                            path: [index, 'isCompound'],
                            code: z.ZodIssueCode.custom,
                            message: 'Required',
                        });
                    }
                }
            });
        }),
});

export const createStockDetailsSchema = createStockBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export const updateStockDetailsSchema = createStockBaseSchema.extend({
    status: z.string({ error: 'Status is required' }),
    id: z.string(),
});

export type CreateStockDetailsSchema = z.infer<typeof createStockDetailsSchema>;
export type UpdateStockDetailsSchema = z.infer<typeof updateStockDetailsSchema>;

export const createStockPricingSchema = z.object({
    companyStockDetailId: z.string(),
    pricingTypes: z.array(
        z.object({
            companyStockPricingTypeId: z.string().optional(),
            priceExclusive: z.coerce.number().optional(),
            priceInclusive: z.coerce.number().optional(),
            markupPercent: z.coerce.number().optional(),
            gpPercent: z.coerce.number().optional(),
            // markupPercentLatestCost: z.coerce.number().default(0),
            // gpPercentLatestCost: z.coerce.number().default(0),
            // markupPercentFutureCost: z.coerce.number().default(0),
            // gpPercentFutureCost: z.coerce.number().default(0),
            enable: z.coerce.boolean().default(false),
        }),
    ),
    costTypes: z
        .object({
            averageCost: z.coerce.number().optional(),
            highestCost: z.coerce.number().optional(),
            previousCost: z.coerce.number().optional(),
            latestCost: z.coerce.number().optional(),
            baseCost: z.coerce.number().optional(),
            // managerCost: z.coerce.number().default(0),
            // futureCost: z.coerce.number().default(0),
        })
        .optional(),
    costLevels: z
        .array(
            z.object({
                companyStockPricingCostLevelTypeId: z.string().optional(),
                value: z.coerce.number().optional(),
                enable: z.coerce.boolean().default(false),
            }),
        )
        .optional(),
    settings: z
        .object({
            recommendedGpPercent: z.coerce.number().optional(),
            sellPriceVariantGroupId: z.string().nullable().optional(),
            unitCost: z.coerce.number().optional(),
            futureCost: z.coerce.number().optional(),
            // SKU-level cost consistency limits. When set they override the category rule.
            minGpPercent: z.coerce.number().nullable().optional(),
            maxGpPercent: z.coerce.number().nullable().optional(),
            gpTolerancePercent: z.coerce.number().nullable().optional(),
            blockingGpVariancePercent: z.coerce.number().nullable().optional(),
            enforceGpPolicy: z.boolean().nullable().optional(),
            overrideCategoryGpPolicy: z.boolean().nullable().optional(),
        })
        .optional(),
    // Cost consistency: /pricingPolicy/validate is a preview and the create/update API makes
    // the final decision. A reason is only required when an approval is needed, so it is
    // optional here and prompted for by the screen at that point.
    reason: z.string().optional(),
    approvalTokens: z.record(z.string(), z.string()).optional(),
    timezone: z.string().default('Asia/Kolkata'),
});

export type CreateStockPricingSchema = z.infer<typeof createStockPricingSchema>;

export const updateStockPricingSchema = z.intersection(
    createStockPricingSchema.partial(),
    z.object({ id: z.string() }),
);

export type UpdateStockPricingSchema = z.infer<typeof updateStockPricingSchema>;
