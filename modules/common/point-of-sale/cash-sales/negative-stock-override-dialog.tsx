'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

export interface NegativeStockOverrideDialogProps {
    open: boolean;
    /** True when the POS_NEGATIVE_STOCK_OVERRIDE action has requireReason: true. */
    requireReason?: boolean;
    lines?: Array<{ id: string; name: string; quantity: number; available: number }>;
    onConfirm: (result: { proceed: true; reason?: string }) => void;
    onCancel: () => void;
}

const NegativeStockOverrideDialog = ({
    open,
    requireReason = false,
    lines = [],
    onConfirm,
    onCancel,
}: NegativeStockOverrideDialogProps) => {
    const [value, setValue] = useState('');

    useEffect(() => {
        if (open) setValue('');
    }, [open]);

    const reasonMissing = requireReason && !value.trim();

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle>Proceed with Negative Stock?</DialogTitle>
                    <DialogDescription>
                        {lines.length > 0
                            ? 'The following line(s) exceed the available stock. Selling them will reduce stock below zero.'
                            : 'The cart exceeds the available stock. Selling it will reduce stock below zero.'}
                    </DialogDescription>
                </DialogHeader>

                {lines.length > 0 && (
                    <div className="max-h-[140px] space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
                        {lines.map((line) => (
                            <div key={line.id} className="flex items-center justify-between gap-2">
                                <span className="truncate">{line.name}</span>
                                <span className="whitespace-nowrap text-red-600">
                                    {line.quantity} / {line.available} available
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {requireReason && (
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-sm font-medium">
                            Reason <MandatoryField />
                        </Label>
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Enter a reason for the negative stock override"
                        />
                    </div>
                )}

                <DialogFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel Sale
                    </Button>
                    <Button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={reasonMissing}
                        onClick={() => onConfirm({ proceed: true, ...(requireReason ? { reason: value.trim() } : {}) })}
                    >
                        Proceed with Negative Stock
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NegativeStockOverrideDialog;
