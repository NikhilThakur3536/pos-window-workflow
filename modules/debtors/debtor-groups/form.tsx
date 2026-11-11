import { useForm, type Resolver } from 'react-hook-form';
import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
    CompanyDebtorGroupDetails,
    DEBTOR_GROUP_STATUSES,
    DebtorGroupStatus,
    debtorGroupCreateSchema,
    debtorGroupUpdateSchema,
    useCreateDebtorGroup,
    useUpdateDebtorGroup,
} from '@/api-queries/debtor/company-debtor-group';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import moment from 'moment-timezone';

interface DebtorGroupFormProps {
    open: boolean;
    onClose: () => void;
    editData: CompanyDebtorGroupDetails | null;
}

const DebtorGroupForm = ({ open, editData, onClose }: DebtorGroupFormProps) => {
    const createItemData = useCreateDebtorGroup();
    const updateItemData = useUpdateDebtorGroup();

    const isEditing = !!editData;

    type DebtorGroupFormValues = {
        groupId: string;
        description: string;
        timezone: string;
        status?: DebtorGroupStatus;
        id?: string;
    };

    const form = useForm<DebtorGroupFormValues>({
        resolver: zodResolver(
            isEditing ? debtorGroupUpdateSchema : debtorGroupCreateSchema,
        ) as Resolver<DebtorGroupFormValues>,
        defaultValues: {
            groupId: editData?.groupId || '',
            description: editData?.description || '',
            timezone: editData?.timezone || moment.tz.guess(),
            status: (editData?.status as DebtorGroupStatus) || 'ACTIVE',
            ...(editData ? { id: editData.id } : {}),
        },
    });

    const { handleSubmit, control, setValue, watch, getValues } = form;

    const watchedTimezone = watch('timezone');
    const watchedStatus = watch('status');

    // Moment ships the full IANA list; default to the terminal's own zone.
    const timezones = useMemo(() => moment.tz.names(), []);

    useEffect(() => {
        if (!getValues('timezone')) setValue('timezone', moment.tz.guess());
    }, [open, getValues, setValue]);

    const onSubmit = (values: DebtorGroupFormValues) => {
        // `groupId` is the user-typed code, `id` the generated primary key.
        const payload = {
            groupId: values.groupId,
            description: values.description,
            timezone: values.timezone,
        };

        if (isEditing) {
            if (!values.id) return toast.error('Debtor group ID is required');

            return updateItemData.mutate(
                {
                    ...payload,
                    id: values.id,
                    status: values.status || 'ACTIVE',
                },
                {
                    onSuccess: (data) => {
                        if (data.success) {
                            toast.success('Debtor group updated successfully');
                            form.reset();
                            onClose();
                        } else {
                            toast.error(data.message || 'Debtor group update failed');
                        }
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    },
                },
            );
        }

        createItemData.mutate(payload, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Debtor group created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error(data.message || 'Debtor group creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    function onOpenChange() {
        form.reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Debtor Group' : 'Add New Debtor Group'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid gap-4 py-2">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="groupId" className="min-w-[120px] text-sm font-medium">
                                    Group ID <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="groupId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. GROUP-TEST"
                                                        {...field}
                                                        // The code is the group's natural key, so it is
                                                        // fixed once assigned to avoid orphaning debtors.
                                                        disabled={isEditing}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="description" className="min-w-[120px] text-sm font-medium">
                                    Description <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Describe the group"
                                                        className="min-h-[80px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="timezone" className="min-w-[120px] text-sm font-medium">
                                    Timezone <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="timezone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a timezone" />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-72">
                                                            {timezones.map((tz) => (
                                                                <SelectItem key={tz} value={tz}>
                                                                    {tz}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex items-start gap-4">
                                    <Label htmlFor="status" className="min-w-[120px] text-sm font-medium">
                                        Status
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {DEBTOR_GROUP_STATUSES.map((status) => (
                                                                    <SelectItem key={status} value={status}>
                                                                        {status}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={
                                    createItemData.isPending ||
                                    updateItemData.isPending ||
                                    !watchedTimezone ||
                                    !watchedStatus
                                }
                            >
                                {isEditing ? 'Update Debtor Group' : 'Create Debtor Group'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default DebtorGroupForm;
