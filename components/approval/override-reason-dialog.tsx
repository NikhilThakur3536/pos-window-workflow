'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

export interface OverrideReasonDialogProps {
    open: boolean;
    title?: string;
    description?: string;
    confirmLabel?: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

const OverrideReasonDialog = ({
    open,
    title = 'Override Reason Required',
    description = 'This sale exceeds the allowed discount / price limit and requires a supervisor-approved override. Please provide a reason.',
    confirmLabel = 'Continue',
    onConfirm,
    onCancel,
}: OverrideReasonDialogProps) => {
    const [value, setValue] = useState('');

    useEffect(() => {
        if (open) setValue('');
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-sm font-medium">
                        Reason <MandatoryField />
                    </Label>
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Enter a reason for the override"
                    />
                </div>

                <DialogFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!value.trim()}
                        onClick={() => onConfirm(value.trim())}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default OverrideReasonDialog;