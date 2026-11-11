export type ManualDiscountType = 'AMOUNT' | 'PERCENT';

export interface ManualDiscountValue {
    mode: ManualDiscountType;
    amount: number;
    percentage: number;
}

export interface ManualDiscountSource {
    discount?: number;
    manualDiscountAmount?: number;
    discountPercentage?: number;
    manualDiscountType?: ManualDiscountType;
}

export const roundDiscount = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

export const clampDiscount = (value: number, min: number, max: number) =>
    Math.min(Math.max(Number.isFinite(value) ? value : 0, min), max);

export function getManualDiscountValue(item: ManualDiscountSource): ManualDiscountValue {
    const mode = item.manualDiscountType ?? 'AMOUNT';

    if (mode === 'PERCENT') {
        return {
            mode,
            amount: 0,
            percentage: roundDiscount(clampDiscount(item.discountPercentage ?? 0, 0, 100)),
        };
    }

    return {
        mode: 'AMOUNT',
        amount: roundDiscount(Math.max(0, item.manualDiscountAmount ?? 0)),
        percentage: 0,
    };
}

export function getManualDiscountAmount(item: ManualDiscountSource, grossAmount: number) {
    const value = getManualDiscountValue(item);
    const gross = Math.max(0, Number.isFinite(grossAmount) ? grossAmount : 0);

    return value.mode === 'PERCENT'
        ? roundDiscount((gross * clampDiscount(value.percentage, 0, 100)) / 100)
        : roundDiscount(clampDiscount(value.amount, 0, gross));
}

export function toManualDiscountPayload(item: ManualDiscountSource) {
    const value = getManualDiscountValue(item);

    return {
        manualDiscountAmount: value.mode === 'AMOUNT' ? roundDiscount(Math.max(0, value.amount)) : 0,
        discountPercentage: value.mode === 'PERCENT' ? roundDiscount(clampDiscount(value.percentage, 0, 100)) : 0,
    };
}

export function hasManualDiscount(item: ManualDiscountSource) {
    const value = getManualDiscountValue(item);
    return value.mode === 'PERCENT' ? value.percentage > 0 : value.amount > 0;
}

// The legacy `discount` field may still carry an automatic/quantity-wise discount. Keep
// that value separate from the manual discount so the backend does not receive a combined
// amount in the manual fields (which would subtract the manual part twice).
export function getAutomaticDiscountAmount(item: ManualDiscountSource, grossAmount: number) {
    const totalDiscount = Math.max(0, Number(item.discount) || 0);
    if (!hasManualDiscount(item)) return roundDiscount(totalDiscount);
    return roundDiscount(Math.max(0, totalDiscount - getManualDiscountAmount(item, grossAmount)));
}

export function withManualDiscount<T extends ManualDiscountSource>(
    item: T,
    value: ManualDiscountValue,
    grossAmount: number,
): T {
    const gross = Math.max(0, Number.isFinite(grossAmount) ? grossAmount : 0);
    const mode = value.mode;
    const amount = mode === 'AMOUNT' ? roundDiscount(clampDiscount(value.amount, 0, gross)) : 0;
    const percentage = mode === 'PERCENT' ? roundDiscount(clampDiscount(value.percentage, 0, 100)) : 0;
    const effectiveAmount =
        mode === 'PERCENT' ? roundDiscount((gross * percentage) / 100) : amount;

    return {
        ...item,
        manualDiscountType: mode,
        manualDiscountAmount: amount,
        discountPercentage: percentage,
        discount: effectiveAmount,
        lineTotal: roundDiscount(gross - effectiveAmount),
    };
}
