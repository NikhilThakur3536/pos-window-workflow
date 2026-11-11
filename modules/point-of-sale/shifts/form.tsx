import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ShiftDetails,
    ShiftCreateSchema,
    ShiftUpdateSchema,
    shiftCreateSchema,
    shiftUpdateSchema,
    useCreateShift,
    useUpdateShift,
} from '@/api-queries/till-management/shifts';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { useAuthUser } from '@/stores/auth-user.store';
import { TillDetails, useGetTills } from '@/api-queries/masters/tills';
import { useDebtorList } from '@/api-queries/debtor';

interface ShiftFormProps {
    open: boolean;
    onClose: () => void;
    editData: ShiftDetails | null;
}

// Reaching onSuccess means the request itself succeeded (HTTP 2xx). Only an
// explicit `success: false` is treated as a business failure, so a create whose
// payload omits the flag still reports green instead of replaying the backend's
// own "created successfully" text through toast.error.
const isBusinessFailure = (data?: { success?: boolean }) => data?.success === false;

const ShiftForm = ({ open, editData, onClose }: ShiftFormProps) => {
    const createItemData = useCreateShift();
    const updateItemData = useUpdateShift();
    const companyDebtorId = useAuthUser((state) => state.user?.companyDebtorId);

    const tillsList = useGetTills({})?.data?.data?.rows;
    const storesList = useDebtorList({ limit: 100, offset: 0 })?.data?.data?.rows;

    const isEditing = !!editData;

    const form = useForm<ShiftCreateSchema | ShiftUpdateSchema>({
        resolver: zodResolver(isEditing ? shiftUpdateSchema : shiftCreateSchema),
        defaultValues: {
            tillNumber: editData?.tillNumber || '',
            currentShiftNumber: editData?.currentShiftNumber ? String(editData.currentShiftNumber) : '',
            storeId: editData?.storeId || companyDebtorId || '',
            ...(editData ? { id: editData.id } : {}),
        },
    });

    const { handleSubmit, control } = form;

    function buildCreatePayload(values: ShiftCreateSchema) {
        const payload: any = {
            tillNumber: values.tillNumber,
        };
        if (values.storeId) payload.storeId = values.storeId;
        if (values.currentShiftNumber !== undefined && values.currentShiftNumber !== '') {
            payload.currentShiftNumber = Number(values.currentShiftNumber);
        }
        return payload;
    }

function onSubmit(values: ShiftCreateSchema | ShiftUpdateSchema) {
    if (editData) {
        if (!editData.id) return toast.error('Shift ID is required');

        return updateItemData.mutate({ ...buildCreatePayload(values as ShiftCreateSchema), id: editData.id } as ShiftUpdateSchema, {
            onSuccess: (data) => {
                if (isBusinessFailure(data)) {
                    toast.error(data?.message || 'Shift updation failed');
                    return;
                }
                toast.success('Shift updated successfully');
                form.reset();
                onClose();
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    createItemData.mutate(buildCreatePayload(values as ShiftCreateSchema) as ShiftCreateSchema, {
        onSuccess: (data) => {
            if (isBusinessFailure(data)) {
                toast.error(data?.message || 'Shift creation failed');
                return;
            }
            toast.success('Shift created successfully');
            form.reset();
            onClose();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
        },
    });
}

    function onOpenChange() {
        form.reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[540px]">
                <DialogHeader className="shrink-0">
                    <DialogTitle>{isEditing ? 'Edit Shift' : 'Add New Shift'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col gap-6">
                        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto py-4 pr-1">
                            <div className="grid gap-1.5 sm:grid-cols-[minmax(0,120px)_minmax(0,1fr)] sm:items-start sm:gap-4">
                                <Label htmlFor="tillNumber" className="mt-2 min-w-0 text-sm font-medium">
                                    Till <MandatoryField />
                                </Label>
                                <div className="min-w-0">
                                    <FormField
                                        control={control}
                                        name="tillNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a till" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {tillsList?.map((data: TillDetails) => (
                                                                <SelectItem key={data.id} value={data.tillNumber}>
                                                                    {data.name} ({data.tillNumber})
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

                            <div className="grid gap-1.5 sm:grid-cols-[minmax(0,120px)_minmax(0,1fr)] sm:items-start sm:gap-4">
                                <Label htmlFor="storeId" className="mt-2 min-w-0 text-sm font-medium">
                                    Store <MandatoryField />
                                </Label>
                                <div className="min-w-0">
                                    <FormField
                                        control={control}
                                        name="storeId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a store" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {storesList?.map((store) => (
                                                                <SelectItem key={store.id} value={store.id}>
                                                                    {store.name}
                                                                    {store.accountNumber ? ` (${store.accountNumber})` : ''}
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

                            <div className="grid gap-1.5 sm:grid-cols-[minmax(0,120px)_minmax(0,1fr)] sm:items-start sm:gap-4">
                                <Label htmlFor="currentShiftNumber" className="min-w-0 text-sm font-medium">
                                    Current Shift Number
                                </Label>
                                <div className="min-w-0">
                                    <FormField
                                        control={control}
                                        name="currentShiftNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="Enter current shift number" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editData ? 'Update Shift' : 'Create Shift'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default ShiftForm;
