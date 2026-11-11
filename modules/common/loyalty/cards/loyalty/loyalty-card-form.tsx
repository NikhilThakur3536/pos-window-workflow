import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types
import {
    LoyaltyCardDetails,
    LoyaltyCardCreateSchema,
    LoyaltyCardUpdateSchema,
    loyaltyCardCreateSchema,
    loyaltyCardUpdateSchema,
    useCreateLoyaltyCard,
    useUpdateLoyaltyCard,
} from '@/api-queries/loyalty/loyalty-cards';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { useAuthUser } from '@/stores/auth-user.store';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

interface LoyaltyCardFormProps {
    open: boolean;
    onClose: () => void;
    editData: LoyaltyCardDetails | null;
}

const LoyaltyCardForm = ({ open, editData, onClose }: LoyaltyCardFormProps) => {
    const createItemData = useCreateLoyaltyCard();
    const updateItemData = useUpdateLoyaltyCard();
    const companyId = useAuthUser((state) => state?.user?.companyId);
    const domainId = useAuthUser((state) => state?.user?.domainId);

    const isEditing = !!editData;

    const form = useForm<LoyaltyCardCreateSchema | LoyaltyCardUpdateSchema>({
        resolver: zodResolver(isEditing ? loyaltyCardUpdateSchema : loyaltyCardCreateSchema),
        defaultValues: {
            name: editData?.name || '',
            cardNumber: editData?.cardNumber || '',
            barcode: editData?.barcode || '',
            description: editData?.description || '',
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess(), companyId, domainId }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: LoyaltyCardCreateSchema | LoyaltyCardUpdateSchema) {
        if (editData) {
            if (!editData.id) return toast.error('Loyalty Card ID is required');

            return updateItemData.mutate(values as LoyaltyCardUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Loyalty Card updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Loyalty Card updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(values as LoyaltyCardCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Loyalty Card created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Loyalty Card creation failed');
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
                    <DialogTitle>{isEditing ? 'Edit Loyalty Card' : 'Add New Loyalty Card'}</DialogTitle>
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
                                <Label htmlFor="cardNumber" className="min-w-[120px] text-sm font-medium">
                                    Card Number <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="cardNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="eg : AHH1 123H 1H11 HWSG" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="barcode" className="min-w-[120px] text-sm font-medium">
                                    Bar Code
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="barcode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="eg : LYEH12301" {...field} />
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
                                                        placeholder="Please enter Description of the loyalty card"
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
                                {editData ? 'Update Loyalty Card' : 'Create Loyalty Card'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default LoyaltyCardForm;
