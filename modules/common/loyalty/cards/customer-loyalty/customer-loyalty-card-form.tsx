import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types

import {
    CustomerLoyaltyCardDetails,
    CustomerLoyaltyCardCreateSchema,
    CustomerLoyaltyCardUpdateSchema,
    customerLoyaltyCardCreateSchema,
    customerLoyaltyCardUpdateSchema,
    useCreateCustomerLoyaltyCard,
    useUpdateCustomerLoyaltyCard,
} from '@/api-queries/loyalty/customer-cards';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { useDebtorList } from '@/api-queries/debtor';
import { MembershipDetails, useGetMemberships } from '@/api-queries/loyalty/memberships';
import { LoyaltyCardDetails, useGetLoyaltyCards } from '@/api-queries/loyalty/loyalty-cards';
import SelectPopover from '@/components/select-popover';
import { CompanyCreditor } from '@/types';
import { B2CCustomerDetails, useGetB2CCustomers } from '@/api-queries/b2c-customers';

interface CustomerLoyaltyCardFormProps {
    open: boolean;
    onClose: () => void;
    editData: CustomerLoyaltyCardDetails | null;
}

const CustomerLoyaltyCardForm = ({ open, editData, onClose }: CustomerLoyaltyCardFormProps) => {
    const customers = useGetB2CCustomers({})?.data?.data?.rows;
    const memberships = useGetMemberships({})?.data?.data?.rows;
    const loyaltyCards = useGetLoyaltyCards({})?.data?.data?.rows;

    const createItemData = useCreateCustomerLoyaltyCard();
    const updateItemData = useUpdateCustomerLoyaltyCard();

    const isEditing = !!editData;

    const form = useForm<CustomerLoyaltyCardCreateSchema | CustomerLoyaltyCardUpdateSchema>({
        resolver: zodResolver(isEditing ? customerLoyaltyCardUpdateSchema : customerLoyaltyCardCreateSchema),
        defaultValues: {
            customerId: editData?.customerId || '',
            loyaltyCardId: editData?.loyaltyCardId || '',
            membershipId: editData?.membershipId || '',
            availablePoints: editData?.availablePoints || 0,
            issueDate: editData?.issueDate ? moment(editData?.issueDate).format('yyyy-MM-DD') : '',
            expiryDate: editData?.expiryDate ? moment(editData?.expiryDate).format('yyyy-MM-DD') : '',
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess() }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: CustomerLoyaltyCardCreateSchema | CustomerLoyaltyCardUpdateSchema) {
        if (editData) {
            if (!editData.id) return toast.error('Customer Card ID is required');

            return updateItemData.mutate(values as CustomerLoyaltyCardUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Customer Card updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Customer Card updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(values as CustomerLoyaltyCardCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Customer Card created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Customer Card creation failed');
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
            <DialogContent className="sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">
                        {isEditing ? 'Edit Customer Card' : 'Add New Customer Card'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                    >
                        <div className="max-h-[70vh] overflow-auto">
                            <div className="grid grid-cols-2 items-start gap-3">
                                <FormField
                                    control={control}
                                    name="membershipId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Membership <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                {memberships && (
                                                    <SelectPopover
                                                        options={memberships.map((data: MembershipDetails) => ({
                                                            label: `${data.name} (${data.code})`,
                                                            value: data.id,
                                                        }))}
                                                        title="membership"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="loyaltyCardId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Loyalty Card <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                {loyaltyCards && (
                                                    <SelectPopover
                                                        options={loyaltyCards.map((data: LoyaltyCardDetails) => ({
                                                            label: `${data.name} (${data.cardNumber})`,
                                                            value: data.id,
                                                        }))}
                                                        title="loyalty card"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="customerId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                B2C Customers <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                {customers && (
                                                    <SelectPopover
                                                        options={customers.map((data: B2CCustomerDetails) => ({
                                                            label: `${data.name} (${data.phone})`,
                                                            value: data.id,
                                                        }))}
                                                        title="customer"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="availablePoints"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Bonus Points <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.valueAsNumber;
                                                        field.onChange(value);
                                                    }}
                                                    type="number"
                                                    className="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="issueDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Issue Date</Label>

                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="date"
                                                    className="h-7 text-xs"
                                                    min={moment().format('YYYY-MM-DD')}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="expiryDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Expiry Date</Label>

                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="date"
                                                    className="h-7 text-xs"
                                                    min={moment().format('YYYY-MM-DD')}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
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
                                {isEditing ? 'Update Customer Card' : 'Create Customer Card'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CustomerLoyaltyCardForm;
