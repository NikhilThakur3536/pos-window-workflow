'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useInboxReject } from '@/api-queries/security';
import { toast } from 'sonner';

const rejectSchema = z.object({
    reason: z
        .string()
        .trim()
        .min(1, 'A reason is required')
        .max(500, 'Reason must be 500 characters or less'),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

interface RejectRequestDialogProps {
    open: boolean;
    onClose: () => void;
    approvalId: string;
    actionLabel?: string;
    requesterName?: string;
    onRejected?: () => void;
}

const RejectRequestDialog = ({
    open,
    onClose,
    approvalId,
    actionLabel,
    requesterName,
    onRejected,
}: RejectRequestDialogProps) => {
    const rejectMutation = useInboxReject();
    const form = useForm<RejectFormValues>({
        resolver: zodResolver(rejectSchema),
        defaultValues: { reason: '' },
    });

    useEffect(() => {
        if (open) form.reset({ reason: '' });
    }, [open, approvalId]);

    const onSubmit = (values: RejectFormValues) => {
        rejectMutation.mutate(
            { approvalId, reason: values.reason.trim() },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Request rejected');
                        onRejected?.();
                        onClose();
                    } else {
                        toast.error(data.message || 'Rejection failed');
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Rejection failed');
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle>Reject request</DialogTitle>
                    <DialogDescription>
                        {actionLabel || 'This request'} will be rejected.
                        {requesterName ? ` The requester (${requesterName}) will see your reason.` : ''}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            rows={4}
                                            maxLength={500}
                                            placeholder="Why is this request being rejected?"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={rejectMutation.isPending}>
                                {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default RejectRequestDialog;
