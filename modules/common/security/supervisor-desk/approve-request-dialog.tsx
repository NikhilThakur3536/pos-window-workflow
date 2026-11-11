'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInboxApprove } from '@/api-queries/security';
import type { AuthMethod, InboxApproveInput } from '@/api-queries/security';
import { Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const approvalSchema = z
    .object({
        authenticationMethod: z.enum(['PASSWORD', 'FINGERPRINT']),
        password: z.string().optional(),
        templateReference: z.string().optional(),
        deviceId: z.string().optional(),
        reason: z.string().optional(),
    })
    .superRefine((value, ctx) => {
        if (value.authenticationMethod === 'PASSWORD' && !value.password?.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password is required' });
        }
        if (value.authenticationMethod === 'FINGERPRINT') {
            if (!value.templateReference?.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['templateReference'],
                    message: 'Scan a fingerprint first',
                });
            }
            if (!value.deviceId?.trim()) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deviceId'], message: 'Device id is required' });
            }
        }
    });

type ApprovalFormValues = z.infer<typeof approvalSchema>;

interface ApproveRequestDialogProps {
    open: boolean;
    onClose: () => void;
    approvalId: string;
    actionLabel?: string;
    requesterName?: string;
    allowedMethods?: AuthMethod[];
    onApproved?: () => void;
}

const FALLBACK_METHODS: AuthMethod[] = ['PASSWORD', 'FINGERPRINT'];

const ApproveRequestDialog = ({
    open,
    onClose,
    approvalId,
    actionLabel,
    requesterName,
    allowedMethods,
    onApproved,
}: ApproveRequestDialogProps) => {
    const methods = allowedMethods?.length ? allowedMethods : FALLBACK_METHODS;
    const [fingerprintStatus, setFingerprintStatus] = useState<'idle' | 'scanning' | 'scanned' | 'error'>('idle');
    const [fingerprintError, setFingerprintError] = useState<string | null>(null);
    const approveMutation = useInboxApprove();

    const form = useForm<ApprovalFormValues>({
        resolver: zodResolver(approvalSchema),
        defaultValues: {
            authenticationMethod: methods.includes('PASSWORD') ? 'PASSWORD' : 'FINGERPRINT',
            password: '',
            templateReference: '',
            deviceId: '',
            reason: '',
        },
    });

    const method = form.watch('authenticationMethod');

    useEffect(() => {
        if (!open) return;
        const initial = methods.includes('PASSWORD') ? 'PASSWORD' : 'FINGERPRINT';
        form.reset({
            authenticationMethod: initial,
            password: '',
            templateReference: '',
            deviceId: '',
            reason: '',
        });
        setFingerprintStatus('idle');
        setFingerprintError(null);
    }, [open, approvalId, methods.join(',')]);

    const submitApproval = (payload: InboxApproveInput) => {
        approveMutation.mutate(payload, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Request approved');
                    onApproved?.();
                    onClose();
                } else {
                    toast.error(data.message || 'Approval failed');
                }
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Approval failed');
            },
        });
    };

    const handleFingerprintScan = async () => {
        if (approveMutation.isPending) return;

        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.fingerprintCapture) {
            toast.error('Fingerprint scanner is only available in the desktop app.');
            return;
        }

        setFingerprintStatus('scanning');
        setFingerprintError(null);
        try {
            const deviceId = electronAPI.getDeviceId ? await electronAPI.getDeviceId() : undefined;
            if (!deviceId) {
                throw new Error('Scanner device id is unavailable. Restart the desktop app and try again.');
            }

            const result = await electronAPI.fingerprintCapture({ deviceId });
            const templateReference = result?.data?.templateReference || '';
            const resolvedDeviceId = result?.data?.deviceId || deviceId;

            if (!result?.success || !templateReference) {
                setFingerprintStatus('error');
                setFingerprintError(result?.error || 'Fingerprint not recognized');
                return;
            }

            form.setValue('templateReference', templateReference, { shouldValidate: true });
            form.setValue('deviceId', resolvedDeviceId, { shouldValidate: true });
            setFingerprintStatus('scanned');
            toast.success('Fingerprint captured. Approving...');

            submitApproval({
                approvalId,
                authenticationMethod: 'FINGERPRINT',
                templateReference,
                deviceId: resolvedDeviceId,
                reason: form.getValues('reason')?.trim() || undefined,
            });
        } catch (error: any) {
            setFingerprintStatus('error');
            setFingerprintError(error?.message || 'Fingerprint scan failed');
        }
    };

    const onSubmit = (values: ApprovalFormValues) => {
        submitApproval({
            approvalId,
            authenticationMethod: values.authenticationMethod,
            ...(values.authenticationMethod === 'PASSWORD'
                ? { password: values.password?.trim() }
                : { templateReference: values.templateReference, deviceId: values.deviceId }),
            reason: values.reason?.trim() || undefined,
        });
    };

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle>Approve request</DialogTitle>
                    <DialogDescription>
                        {actionLabel || 'This request'} will be approved from your supervisor login.
                        {requesterName ? ` Requested by ${requesterName}.` : ''}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        {methods.length > 1 ? (
                            <FormField
                                control={form.control}
                                name="authenticationMethod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Authentication method</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                setFingerprintStatus('idle');
                                                setFingerprintError(null);
                                                form.setValue('password', '');
                                                form.setValue('templateReference', '');
                                                form.setValue('deviceId', '');
                                            }}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select method" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {methods.includes('PASSWORD') ? (
                                                    <SelectItem value="PASSWORD">Password</SelectItem>
                                                ) : null}
                                                {methods.includes('FINGERPRINT') ? (
                                                    <SelectItem value="FINGERPRINT">Fingerprint</SelectItem>
                                                ) : null}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : null}

                        {method === 'PASSWORD' ? (
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your password</FormLabel>
                                        <FormControl>
                                            <Input type="password" autoComplete="current-password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    variant={fingerprintStatus === 'scanned' ? 'default' : 'outline'}
                                    className={
                                        fingerprintStatus === 'scanned' ? 'w-full bg-green-600 hover:bg-green-700' : 'w-full'
                                    }
                                    onClick={handleFingerprintScan}
                                    disabled={fingerprintStatus === 'scanning' || approveMutation.isPending}
                                >
                                    {fingerprintStatus === 'scanning' ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Place finger on reader…
                                        </>
                                    ) : (
                                        <>
                                            <Fingerprint className="mr-2 h-4 w-4" />
                                            {fingerprintStatus === 'scanned' ? 'Fingerprint captured' : 'Scan fingerprint'}
                                        </>
                                    )}
                                </Button>
                                {fingerprintError ? <p className="text-xs text-red-600">{fingerprintError}</p> : null}
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason (optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Checked and approved" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-green-600 text-white hover:bg-green-700"
                                disabled={
                                    approveMutation.isPending ||
                                    (method === 'FINGERPRINT' && fingerprintStatus !== 'scanned')
                                }
                            >
                                {approveMutation.isPending ? 'Approving…' : 'Approve'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default ApproveRequestDialog;
