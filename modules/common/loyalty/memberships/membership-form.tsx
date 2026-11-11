import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types
import {
    MembershipDetails,
    MembershipCreateSchema,
    MembershipUpdateSchema,
    membershipCreateSchema,
    membershipUpdateSchema,
    useCreateMembership,
    useUpdateMembership,
} from '@/api-queries/loyalty/memberships';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { useAuthUser } from '@/stores/auth-user.store';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

interface MembershipFormProps {
    open: boolean;
    onClose: () => void;
    editData: MembershipDetails | null;
}

const MembershipForm = ({ open, editData, onClose }: MembershipFormProps) => {
    const createItemData = useCreateMembership();
    const updateItemData = useUpdateMembership();
    const companyId = useAuthUser((state) => state?.user?.companyId);
    const domainId = useAuthUser((state) => state?.user?.domainId);

    const isEditing = !!editData;

    const form = useForm<MembershipCreateSchema | MembershipUpdateSchema>({
        resolver: zodResolver(isEditing ? membershipUpdateSchema : membershipCreateSchema),
        defaultValues: {
            name: editData?.name || '',
            code: editData?.code || '',
            pointsPerSpending: editData?.pointsPerSpending || 0,
            redeemRate: editData?.redeemRate || 0,
            description: editData?.description || '',
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess(), companyId, domainId }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: MembershipCreateSchema | MembershipUpdateSchema) {
        if (editData) {
            if (!editData.id) return toast.error('Membership ID is required');

            return updateItemData.mutate(values as MembershipUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Membership updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Membership updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(values as MembershipCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Membership created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Membership creation failed');
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
                    <DialogTitle>{isEditing ? 'Edit Membership' : 'Add New Membership'}</DialogTitle>
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
                                                    <Input placeholder="eg : Gold" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                                    Code <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="eg : GOLD_PREMIUM" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="pointsPerSpending" className="min-w-[120px] text-sm font-medium">
                                    Points <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="pointsPerSpending"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="Points per spending"
                                                        {...field}
                                                        value={field.value || ''}
                                                        onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="redeemRate" className="min-w-[120px] text-sm font-medium">
                                    Redeem Rate <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="redeemRate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="Redeem Rate"
                                                        {...field}
                                                        value={field.value || ''}
                                                        onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="description" className="mt-2 min-w-[120px] text-sm font-medium">
                                    Description :
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Please enter Description of the membership"
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
                                {editData ? 'Update Membership' : 'Create Membership'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default MembershipForm;
