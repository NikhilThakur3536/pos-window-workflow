'use client';

import { clampDiscount, ManualDiscountType, ManualDiscountValue, roundDiscount } from '@/lib/manual-discount';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ManualDiscountInputProps {
    mode?: ManualDiscountType;
    amount?: number;
    percentage?: number;
    grossAmount: number;
    currencySymbol?: string;
    disabled?: boolean;
    className?: string;
    inputClassName?: string;
    onChange: (value: ManualDiscountValue) => void;
}

const formatValue = (value: number) => (value > 0 ? String(roundDiscount(value)) : '');

export function ManualDiscountInput({
    mode = 'AMOUNT',
    amount = 0,
    percentage = 0,
    grossAmount,
    currencySymbol = '$',
    disabled = false,
    className,
    inputClassName,
    onChange,
}: ManualDiscountInputProps) {
    const gross = Math.max(0, Number.isFinite(grossAmount) ? grossAmount : 0);
    const currentValue = mode === 'PERCENT' ? percentage : amount;
    const [draft, setDraft] = useState(formatValue(currentValue));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) setDraft(formatValue(currentValue));
    }, [currentValue, isFocused, mode]);

    const commit = (rawValue: string, nextMode: ManualDiscountType = mode) => {
        if (disabled) return;

        const parsed = Math.max(0, Number(rawValue) || 0);

        if (nextMode === 'PERCENT') {
            const nextPercentage = roundDiscount(clampDiscount(parsed, 0, 100));
            setDraft(formatValue(nextPercentage));
            onChange({ mode: 'PERCENT', amount: 0, percentage: nextPercentage });
            return;
        }

        const nextAmount = roundDiscount(clampDiscount(parsed, 0, gross));
        setDraft(formatValue(nextAmount));
        onChange({ mode: 'AMOUNT', amount: nextAmount, percentage: 0 });
    };

    const toggleMode = () => {
        if (disabled) return;

        const parsed = Math.max(0, Number(draft) || 0);

        if (mode === 'PERCENT') {
            const nextAmount = roundDiscount((gross * clampDiscount(parsed, 0, 100)) / 100);
            setDraft(formatValue(nextAmount));
            onChange({ mode: 'AMOUNT', amount: nextAmount, percentage: 0 });
            return;
        }

        const nextPercentage = gross > 0 ? roundDiscount((clampDiscount(parsed, 0, gross) / gross) * 100) : 0;
        setDraft(formatValue(nextPercentage));
        onChange({ mode: 'PERCENT', amount: 0, percentage: nextPercentage });
    };

    return (
        <div className={cn('flex min-w-[92px] items-center gap-1', className)}>
            <Input
                type="text"
                inputMode="decimal"
                value={draft}
                disabled={disabled}
                aria-label="Manual discount"
                placeholder="0"
                className={cn('h-6 min-w-0 px-1.5 text-right text-xs tabular-nums', inputClassName)}
                onChange={(event) => {
                    const nextValue = event.target.value;
                    if (/^\d*\.?\d*$/.test(nextValue)) setDraft(nextValue);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    setIsFocused(false);
                    commit(draft);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.currentTarget.blur();
                    } else if (event.key === 'Escape') {
                        setDraft(formatValue(currentValue));
                        event.currentTarget.blur();
                    }
                }}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                title={mode === 'PERCENT' ? 'Switch to amount discount' : 'Switch to percentage discount'}
                aria-label={mode === 'PERCENT' ? 'Switch to amount discount' : 'Switch to percentage discount'}
                className="h-6 w-7 shrink-0 px-0 text-[11px] font-semibold"
                onMouseDown={(event) => event.preventDefault()}
                onClick={toggleMode}
            >
                {mode === 'PERCENT' ? '%' : currencySymbol}
            </Button>
        </div>
    );
}
