import { apiUrls } from '@/api-queries';
import { useInvoiceCountState } from '@/stores/invoice-count.store';

export const getApiKey = (value: any, obj: any = apiUrls, parentKey = ''): string | undefined => {
    for (const key in obj) {
        const currentKey = parentKey ? `${parentKey}.${key}` : key;
        if (obj[key] === value) {
            return currentKey;
        }
        if (typeof obj[key] === 'object') {
            const result = getApiKey(value, obj[key], currentKey);
            if (result) return result;
        }
    }
    return undefined;
};

export const getIDBKey = (value: any) => {
    return `db_${getApiKey(value)}`;
};

export const getMutateIDBKey = (value: any) => {
    return `db_mutate_${getApiKey(value)}`;
};

export function generateUUIDForData(): string {
    const uuid = crypto.randomUUID();
    return uuid;
}

export function generateUniqueUUID(): string {
    return crypto.randomUUID();
}

export function generateUniqueInvoiceId(): string {
    const uuid = crypto.randomUUID();
    const hex = uuid.replace(/-/g, '').slice(0, 12);
    const timestamp = BigInt(Date.now());
    const shortId = (BigInt('0x' + hex) + timestamp).toString(36).toUpperCase();

    return shortId;
}

export function generateInvoiceNumber(type: 'AS' | 'CS' | 'GRV' | 'DN' | 'CN' | 'DR', count: number) {
    const terminalId = useInvoiceCountState.getState().terminalId;
    const paddedCount = count.toString().padStart(6, '0');
    return `${type}-${terminalId}-${paddedCount}`;
}

export function cleanDataPayload<T extends object>(values: T): Partial<T> {
    const cleanedValues: Partial<T> = {};

    (Object.keys(values) as (keyof T)[]).forEach((key) => {
        const val = values[key];
        if (val !== '' && val !== undefined && val !== null) {
            (cleanedValues as T)[key] = val;
        }
    });

    return cleanedValues;
}

export function calculateTaxDetails(inclusivePrice: number, taxPercent: number) {
    const taxRate = taxPercent / 100;
    const exclusivePrice = inclusivePrice / (1 + taxRate);
    const taxAmount = inclusivePrice - exclusivePrice;

    return {
        exclusivePrice,
        taxAmount,
    };
}

export function toFixedNumber(value: number, decimals = 2): number {
    return Number(value.toFixed(decimals));
}

/**
 * Coerce a backend value - which often arrives as a numeric string like "82.90" -
 * into a plain number for edit-dialog number inputs. Blank / NaN / null yields
 * undefined so the field can be left empty, otherwise the value is rounded to
 * `decimals` decimal places (default 2). Never returns NaN.
 */
export function toNumberOrNil(value: unknown, decimals = 2): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(num)) return undefined;
    return Number(num.toFixed(decimals));
}

/** toNumberOrNil with a fallback of 0 - payload-safe for submitted values. */
export function toNumber(value: unknown, decimals = 2): number {
    return toNumberOrNil(value, decimals) ?? 0;
}

export function calculateGpPercent(priceInclusive: number, cost: number): number {
    if (priceInclusive === 0) return 0;
    const result = ((priceInclusive - cost) / priceInclusive) * 100;
    return toFixedNumber(result);
}

export function calculateMarkupPercent(priceInclusive: number, cost: number): number {
    if (cost === 0) return 0;
    const result = ((priceInclusive - cost) / cost) * 100;
    return toFixedNumber(result);
}

export function calculatePriceFromGp(gpPercent: number, cost: number): number {
    if (gpPercent >= 100) return 0;
    const result = cost / (1 - gpPercent / 100);
    return toFixedNumber(result);
}

export function calculatePriceFromMarkup(markupPercent: number, cost: number): number {
    const result = cost * (1 + markupPercent / 100);
    return toFixedNumber(result);
}

export function getLabelFromEnumValue(value: string): string {
    if (!value) return '';

    return value
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
