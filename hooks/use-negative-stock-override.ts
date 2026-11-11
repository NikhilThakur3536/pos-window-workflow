import { useCallback, useRef, useState } from 'react';

export interface NegativeStockOverrideResult {
    /** True when the cashier confirmed selling below available stock. */
    proceed: boolean;
    /** Only set when the security action is configured with requireReason: true. */
    reason?: string;
}

// A line is a negative-stock candidate when the cart quantity is greater than the
// available stock for that stock detail. `availableStock` is the raw value copied
// from the product when the line was added to the cart, so it is compared directly.
export const getNegativeStockLines = <T extends { quantity: number; availableStock?: number; stockOnHand?: number }>(
    items: T[],
): T[] =>
    items.filter((item) => {
        const available = item.availableStock ?? item.stockOnHand;
        if (available == null) return false;
        return item.quantity > available;
    });

// When the cart would drive stock negative the cashier is asked to confirm the
// override. If the POS_NEGATIVE_STOCK_OVERRIDE security action is configured with
// requireReason: true a reason is mandatory and is sent with the create payload.
export const useNegativeStockOverride = () => {
    const [open, setOpen] = useState(false);
    const [requireReason, setRequireReason] = useState(false);
    const [lines, setLines] = useState<Array<{ id: string; name: string; quantity: number; available: number }>>([]);
    const resolverRef = useRef<((value: NegativeStockOverrideResult | null) => void) | null>(null);

    const askNegativeStockOverride = useCallback(
        (
            stockLines: Array<{ id: string; name: string; quantity: number; available: number }>,
            needsReason: boolean,
        ) => {
            return new Promise<NegativeStockOverrideResult | null>((resolve) => {
                resolverRef.current = resolve;
                setLines(stockLines);
                setRequireReason(needsReason);
                setOpen(true);
            });
        },
        [],
    );

    const closeNegativeStockOverride = useCallback((value?: NegativeStockOverrideResult | null) => {
        resolverRef.current?.(value ?? null);
        resolverRef.current = null;
        setOpen(false);
    }, []);

    return {
        negativeStockOverrideOpen: open,
        negativeStockRequireReason: requireReason,
        negativeStockLines: lines,
        askNegativeStockOverride,
        closeNegativeStockOverride,
    };
};
