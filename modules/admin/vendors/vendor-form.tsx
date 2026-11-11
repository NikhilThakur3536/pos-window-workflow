import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types
import {
    VendorDetails,
    VendorCreateSchema,
    VendorUpdateSchema,
    vendorCreateSchema,
    vendorUpdateSchema,
    useCreateVendor,
    useUpdateVendor,
} from '@/api-queries/safes/vendors';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

interface VendorFormProps {
    open: boolean;
    onClose: () => void;
    editData: VendorDetails | null;
}

const VendorForm = ({ open, editData, onClose }: VendorFormProps) => {
    const createItemData = useCreateVendor();
    const updateItemData = useUpdateVendor();

    const isEditing = !!editData;

    const form = useForm<VendorCreateSchema | VendorUpdateSchema>({
        resolver: zodResolver(isEditing ? vendorUpdateSchema : vendorCreateSchema),
        defaultValues: {
            name: editData?.name || '',
            companyName: editData?.companyName || '',
            mobileNumber: editData?.mobileNumber || '',
            companyAddress: editData?.companyAddress || '',
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess() }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: VendorCreateSchema | VendorUpdateSchema) {
        if (editData) {
            if (!editData.id) return toast.error('Vendor ID is required');

            return updateItemData.mutate(values as VendorUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Vendor updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Vendor updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(values as VendorCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Vendor created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Vendor creation failed');
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="mb-0 grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                                    Name <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="Enter vendor name" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="companyName" className="min-w-[120px] text-sm font-medium">
                                    Company Name
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="companyName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="Enter vendor company name" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="mobileNumber" className="min-w-[120px] text-sm font-medium">
                                    Mobile Number
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="mobileNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="Enter vendor mobile number" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="companyAddress" className="mt-2 min-w-[120px] text-sm font-medium">
                                    Company Address :
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="companyAddress"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Please enter address of the company"
                                                        rows={5}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editData ? 'Update Vendor' : 'Create Vendor'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default VendorForm;
