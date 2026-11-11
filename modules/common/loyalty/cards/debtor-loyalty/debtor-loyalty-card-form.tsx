import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types

import {
    DebtorLoyaltyCardDetails,
    DebtorLoyaltyCardCreateSchema,
    DebtorLoyaltyCardUpdateSchema,
    debtorLoyaltyCardCreateSchema,
    debtorLoyaltyCardUpdateSchema,
    useCreateDebtorLoyaltyCard,
    useUpdateDebtorLoyaltyCard,
} from '@/api-queries/loyalty/debtor-cards';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { useDebtorList } from '@/api-queries/debtor';
import { MembershipDetails, useGetMemberships } from '@/api-queries/loyalty/memberships';
import { LoyaltyCardDetails, useGetLoyaltyCards } from '@/api-queries/loyalty/loyalty-cards';
import SelectPopover from '@/components/select-popover';
import { CompanyCreditor } from '@/types';

interface DebtorLoyaltyCardFormProps {
    open: boolean;
    onClose: () => void;
    editData: DebtorLoyaltyCardDetails | null;
}

const DebtorLoyaltyCardForm = ({ open, editData, onClose }: DebtorLoyaltyCardFormProps) => {
    const debtors = useDebtorList({})?.data?.data?.rows;
    const memberships = useGetMemberships({})?.data?.data?.rows;
    const loyaltyCards = useGetLoyaltyCards({})?.data?.data?.rows;

    const createItemData = useCreateDebtorLoyaltyCard();
    const updateItemData = useUpdateDebtorLoyaltyCard();

    const isEditing = !!editData;

    const form = useForm<DebtorLoyaltyCardCreateSchema | DebtorLoyaltyCardUpdateSchema>({
        resolver: zodResolver(isEditing ? debtorLoyaltyCardUpdateSchema : debtorLoyaltyCardCreateSchema),
        defaultValues: {
            debtorId: editData?.debtorId || '',
            loyaltyCardId: editData?.loyaltyCardId || '',
            membershipId: editData?.membershipId || '',
            issueDate: editData?.issueDate ? moment(editData?.issueDate).format('yyyy-MM-DD') : '',
            expiryDate: editData?.expiryDate ? moment(editData?.expiryDate).format('yyyy-MM-DD') : '',
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess(), availablePoints: 0 }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: DebtorLoyaltyCardCreateSchema | DebtorLoyaltyCardUpdateSchema) {
        if (editData) {
            if (!editData.id) return toast.error('Debtor Card ID is required');

            return updateItemData.mutate(values as DebtorLoyaltyCardUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Debtor Card updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Debtor Card updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(values as DebtorLoyaltyCardCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Debtor Card created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Debtor Card creation failed');
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
                        {isEditing ? 'Edit Debtor Card' : 'Add New Debtor Card'}
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
                                    name="debtorId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Company Debtor <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                {debtors && (
                                                    <SelectPopover
                                                        options={debtors.map((data: CompanyCreditor) => ({
                                                            label: `${data.name} (${data.accountNumber})`,
                                                            value: data.id,
                                                        }))}
                                                        title="company debtor"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                {isEditing ? (
                                    <div></div>
                                ) : (
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
                                )}

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
                                {isEditing ? 'Update Debtor Card' : 'Create Debtor Card'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default DebtorLoyaltyCardForm;
