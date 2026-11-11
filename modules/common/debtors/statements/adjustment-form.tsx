import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import moment from 'moment-timezone';
import {
    DebtorAdjustment,
    DEBTOR_ADJUSTMENT_TYPES,
    debtorAdjustmentCreateSchema,
    DebtorAdjustmentCreateSchema,
    useCreateDebtorAdjustment,
    useUpdateDebtorAdjustment,
} from '@/api-queries/debtor/statements';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { cleanDataPayload } from '@/utils/helpers';
import { toast } from 'sonner';

interface AdjustmentFormProps {
    open: boolean;
    onClose: () => void;
    adjustment?: DebtorAdjustment | null;
    companyDebtorId: string;
    isCompanyDebtorUser: boolean;
}

const AdjustmentForm = ({ open, onClose, adjustment, companyDebtorId, isCompanyDebtorUser }: AdjustmentFormProps) => {
    const { mutate: createAdjustment, isPending: isCreating } = useCreateDebtorAdjustment();
    const { mutate: updateAdjustment, isPending: isUpdating } = useUpdateDebtorAdjustment();

    const form = useForm<DebtorAdjustmentCreateSchema>({
        resolver: zodResolver(debtorAdjustmentCreateSchema),
        defaultValues: {
            companyDebtorId: isCompanyDebtorUser ? '' : companyDebtorId || '',
            referenceNumber: '',
            adjustmentDate: moment().format('YYYY-MM-DD'),
            adjustmentType: 'DEBIT',
            amount: 0,
            description: '',
            timezone: moment.tz.guess(),
        },
    });

    const { handleSubmit, control, reset } = form;

    useEffect(() => {
        if (open) {
            reset({
                companyDebtorId: isCompanyDebtorUser ? '' : adjustment?.companyDebtorId || companyDebtorId || '',
                referenceNumber: adjustment?.referenceNumber || '',
                adjustmentDate: adjustment?.adjustmentDate
                    ? moment(adjustment.adjustmentDate).format('YYYY-MM-DD')
                    : moment().format('YYYY-MM-DD'),
                adjustmentType: adjustment?.adjustmentType || 'DEBIT',
                amount: adjustment?.amount || 0,
                description: adjustment?.description || '',
                timezone: adjustment?.timezone || moment.tz.guess(),
            });
        }
    }, [open, adjustment, companyDebtorId, isCompanyDebtorUser, reset]);

    const onSubmit = (values: DebtorAdjustmentCreateSchema) => {
        const cleaned = cleanDataPayload(values);
        const payload = {
            ...cleaned,
            ...(!isCompanyDebtorUser && companyDebtorId ? { companyDebtorId } : {}),
        } as DebtorAdjustmentCreateSchema;

        if (adjustment?.id) {
            updateAdjustment(
                { ...payload, id: adjustment.id },
                {
                    onSuccess: (data) => {
                        if (data.success) {
                            toast.success('Adjustment updated successfully');
                            onClose();
                        } else {
                            toast.error(data.message || 'Adjustment update failed');
                        }
                    },
                    onError: (error) => {
                        toast.error('Adjustment update failed', {
                            description: error instanceof Error ? error.message : 'Internal Server Error!',
                        });
                    },
                },
            );
        } else {
            createAdjustment(payload, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Adjustment created successfully');
                        onClose();
                    } else {
                        toast.error(data.message || 'Adjustment creation failed');
                    }
                },
                onError: (error) => {
                    toast.error('Adjustment creation failed', {
                        description: error instanceof Error ? error.message : 'Internal Server Error!',
                    });
                },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{adjustment?.id ? 'Edit Adjustment' : 'New Adjustment'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={control}
                                    name="referenceNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Reference Number <MandatoryField />
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. ADJ-00001" className="h-8 text-xs" />
                                            </FormControl>
                                            <FormMessage className="!text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="adjustmentDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Adjustment Date <MandatoryField />
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="date"
                                                    max={moment().format('YYYY-MM-DD')}
                                                    className="h-8 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="!text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={control}
                                    name="adjustmentType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Adjustment Type <MandatoryField />
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {DEBTOR_ADJUSTMENT_TYPES.map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {type === 'DEBIT' ? 'Debit' : 'Credit'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="!text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Amount <MandatoryField />
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="h-8 text-right text-xs"
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                                />
                                            </FormControl>
                                            <FormMessage className="!text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Manual account adjustment"
                                                className="min-h-20 text-xs"
                                            />
                                        </FormControl>
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />

                            <div className="flex items-center gap-2">
                                <Label className="text-xs">Timezone</Label>
                                <Input
                                    value={moment.tz.guess()}
                                    readOnly
                                    className="h-7 bg-muted/40 text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating || isUpdating}>
                                {adjustment?.id ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default AdjustmentForm;