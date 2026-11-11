export interface DocAmountItem {
    lineTotal?: string | number | null;
    taxAmount?: string | number | null;
    orderedQuantity?: string | number | null;
    quotedQuantity?: string | number | null;
    quantity?: string | number | null;
    receivedQuantity?: string | number | null;
    agreedUnitCost?: string | number | null;
    quotedUnitPrice?: string | number | null;
    netCost?: string | number | null;
    unitPrice?: string | number | null;
    unitCost?: string | number | null;
    discountPercentage?: string | number | null;
    discountPct?: string | number | null;
}

export interface DocAmounts {
    grandTotal?: string | number | null;
    goodsTotal?: string | number | null;
}

const toNumber = (value: string | number | null | undefined): number => {
    const num = Number(value ?? 0);
    return Number.isFinite(num) ? num : 0;
};

export function docLineItems<T>(doc: T): DocAmountItem[] {
    const record = (doc ?? {}) as Record<string, unknown>;
    for (const key of [
        'items',
        'PurchaseOrderItems',
        'orderItems',
        'SupplierQuotationItems',
        'SupplierInvoiceItems',
    ]) {
        const arr = record[key];
        if (Array.isArray(arr)) return arr as unknown as DocAmountItem[];
    }
    return [];
}

const itemLineTotal = (item: DocAmountItem): number => {
    const line = toNumber(item.lineTotal);
    if (line > 0) return line;
    const qty = toNumber(item.orderedQuantity ?? item.quotedQuantity ?? item.quantity ?? item.receivedQuantity);
    const unit = toNumber(item.agreedUnitCost ?? item.netCost ?? item.quotedUnitPrice ?? item.unitPrice ?? item.unitCost);
    const discount = toNumber(item.discountPercentage ?? item.discountPct);
    return qty * unit * (1 - discount / 100);
};

// Returns the document total, preferring the server-computed grandTotal and falling
// back to a per-line summation when the document carries items but no total.
export function docTotal(doc: DocAmounts, items?: DocAmountItem[]): number {
    const grand = toNumber(doc.grandTotal);
    if (grand > 0) return grand;

    if (items && items.length > 0) {
        const fromItems = items.reduce((sum, item) => sum + itemLineTotal(item), 0);
        if (fromItems > 0) return fromItems;
    }

    return grand;
}