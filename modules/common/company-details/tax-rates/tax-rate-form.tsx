import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// APIs & Types

import {
    TaxRateDetails,
    TaxRateCreateSchema,
    TaxRateUpdateSchema,
    taxRateCreateSchema,
    taxRateUpdateSchema,
    useCreateTaxRate,
    useUpdateTaxRate,
} from '@/api-queries/company-details/tax-rates';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { useAuthUser } from '@/stores/auth-user.store';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
    TaxReportPositionDetails,
    useGetTaxReportPositions,
} from '@/api-queries/company-details/tax-rates/tax-report-positions';
import { useGetTaxControlAccounts } from '@/api-queries/company-details/tax-rates/tax-control-accounts';
import { TaxAgencyDetails, useGetTaxAgencies } from '@/api-queries/company-details/tax-rates/tax-agencies';
import { cleanDataPayload, toNumberOrNil } from '@/utils/helpers';

interface TaxRateFormProps {
    open: boolean;
    onClose: () => void;
    editData: TaxRateDetails | null;
}

const TaxRateForm = ({ open, editData, onClose }: TaxRateFormProps) => {
    const taxReportPositions = useGetTaxReportPositions({})?.data?.data;
    const taxControlAccounts = useGetTaxControlAccounts({})?.data?.data;
    const taxAgencies = useGetTaxAgencies({})?.data?.data;

    const createItemData = useCreateTaxRate();
    const updateItemData = useUpdateTaxRate();
    const companyId = useAuthUser((state) => state?.user?.companyId);
    const domainId = useAuthUser((state) => state?.user?.domainId);

    const isEditing = !!editData;

    const form = useForm<TaxRateCreateSchema | TaxRateUpdateSchema>({
        resolver: zodResolver(isEditing ? taxRateUpdateSchema : taxRateCreateSchema),
        defaultValues: {
            internalTaxId: editData?.internalTaxId || 0,
            type: 'TAX-RATE',
            taxRateId: editData?.taxRateId || 0,
            description: editData?.description || '',
            taxRatePercent: editData?.taxRatePercent || 0,
            taxOnly: editData?.taxOnly || false,
            priorityRate: editData?.priorityRate || false,
            default: editData?.default || false,
            userSelectable: editData?.userSelectable || false,
            positionTaxReportOutput: editData?.positionTaxReportOutput || '',
            positionTaxReportInput: editData?.positionTaxReportInput || '',
            startDate: editData?.startDate ? moment(editData?.startDate).format('yyyy-MM-DD') : '',
            endDate: editData?.endDate ? moment(editData?.endDate).format('yyyy-MM-DD') : '',
            taxInputControlAccountId: editData?.taxInputControlAccountId || '',
            taxOutputControlAccountId: editData?.taxOutputControlAccountId || '',
            taxAgencyId: editData?.taxAgencyId || '',
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess(), companyId, domainId }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: TaxRateCreateSchema | TaxRateUpdateSchema) {
        const payload = cleanDataPayload(values);

        if (editData) {
            if (!editData.id) return toast.error('Tax Rate ID is required');

            return updateItemData.mutate(payload as TaxRateUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Tax Rate updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Tax Rate updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(payload as TaxRateCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Tax Rate created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Tax Rate creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response.data.message || 'Internal Server Error!');
            },
        });
    }

    function onOpenChange() {
        form.reset();
        onClose();
    }

    const checkboxItems = [
        { value: 'taxOnly', label: 'Tax Only' },
        { value: 'priorityRate', label: 'Priority Rate' },
        { value: 'default', label: 'Default Rate' },
        { value: 'userSelectable', label: 'User Selectable' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">
                        {isEditing ? 'Edit Tax Rate' : 'Add New Tax Rate'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                    >
                        <div className="max-h-[70vh] overflow-auto">
                            <div className="grid grid-cols-3 items-start gap-3 space-y-2">
                                <FormField
                                    control={control}
                                    name="internalTaxId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Internal Tax ID <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    onChange={(e) => field.onChange(toNumberOrNil(e.target.value))}
                                                    className="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="taxRateId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Tax Rate ID <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    onChange={(e) => field.onChange(toNumberOrNil(e.target.value))}
                                                    className="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="taxRatePercent"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Tax Rate Percentage <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    onChange={(e) => field.onChange(toNumberOrNil(e.target.value))}
                                                    className="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 items-start gap-3">
                                <FormField
                                    control={control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Description <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                <Input {...field} className="h-7 text-xs" />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="taxAgencyId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Tax Agency <MandatoryField visibilityHidden />
                                            </Label>

                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="!h-7 text-xs">
                                                        <SelectValue placeholder="Select tax agency" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {taxAgencies &&
                                                            taxAgencies.map((data: TaxAgencyDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.description} ({data.code})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="my-2 space-y-2">
                                <Separator />

                                <div className="flex flex-wrap justify-between gap-6">
                                    {checkboxItems?.map((item) => (
                                        <FormField
                                            key={item.value}
                                            control={control}
                                            name={item.value as keyof TaxRateCreateSchema}
                                            render={({ field }) => (
                                                <FormItem className="flex items-center">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={!!field.value}
                                                            onCheckedChange={field.onChange}
                                                            className="h-4 w-4"
                                                        />
                                                    </FormControl>
                                                    <Label className="text-xs capitalize">{item.label}</Label>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>

                                <Separator />
                            </div>

                            <div className="grid grid-cols-2 items-start gap-3">
                                <FormField
                                    control={control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Start Date</Label>
                                            <FormControl>
                                                <Input type="date" {...field} className="h-7 text-xs" />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">End Date</Label>
                                            <FormControl>
                                                <Input type="date" {...field} className="h-7 text-xs" />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="positionTaxReportInput"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Position - Tax Report Input</Label>

                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="!h-7 text-xs">
                                                        <SelectValue placeholder="Select input tax report position" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {taxReportPositions &&
                                                            taxReportPositions.map((data: TaxReportPositionDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.description} ({data.code})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="positionTaxReportOutput"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Position - Tax Report Output</Label>

                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="!h-7 text-xs">
                                                        <SelectValue placeholder="Select output tax report position" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {taxReportPositions &&
                                                            taxReportPositions.map((data: TaxAgencyDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.description} ({data.code})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="!-mt-2 !text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="taxInputControlAccountId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Tax Input Control Account</Label>

                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="!h-7 text-xs">
                                                        <SelectValue placeholder="Select tax input control account" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {taxControlAccounts &&
                                                            taxControlAccounts.map((data: TaxAgencyDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.description} ({data.code})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="!-mt-2 !text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="taxOutputControlAccountId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Tax Output Control Account</Label>

                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="!h-7 text-xs">
                                                        <SelectValue placeholder="Select tax output control account" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {taxControlAccounts &&
                                                            taxControlAccounts.map((data: TaxAgencyDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.description} ({data.code})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="!-mt-2 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                {isEditing ? 'Update Tax Rate' : 'Create Tax Rate'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default TaxRateForm;
