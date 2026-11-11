import { useCallback, useRef, useState } from 'react';

// When the pricing-matrix resolve flags a discount/price override, the cashier /
// sale operator is asked to type an override reason that is sent with the create
// payload (mirroring the Account Sales reason + securityRequestReference flow).
export const useOverrideReason = () => {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<string | null>(null);
    const resolverRef = useRef<((value: string | null) => void) | null>(null);

    const askReason = useCallback((): Promise<string | null> => {
        return new Promise<string | null>((resolve) => {
            resolverRef.current = resolve;
            setOpen(true);
        });
    }, []);

    const closeOverrideReason = useCallback((value?: string | null) => {
        resolverRef.current?.(value ?? null);
        resolverRef.current = null;
        if (value) setReason(value);
        setOpen(false);
    }, []);

    const clearReason = useCallback(() => setReason(null), []);

    return {
        overrideReasonOpen: open,
        overrideReason: reason,
        askReason,
        closeOverrideReason,
        clearReason,
    };
};