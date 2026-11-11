import {
    CreateCompanyPricingResponse,
    useCreateCompanyStockPricingType,
} from '@/api-queries/company/stock-pricing-type';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CreateCompanyPricingTypeSchema, createCompanyPricingTypeSchema } from '@/schema/company/pricing-type';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { useForm } from 'react-hook-form';

type AddUserProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type?: string;
    onSucces?: (data: CreateCompanyPricingResponse) => void;
};

export default function PricingTypeDialog({ open, onOpenChange, type = '', onSucces }: AddUserProps) {
    const addPricingType = useCreateCompanyStockPricingType();
    const form = useForm({
        resolver: zodResolver(createCompanyPricingTypeSchema),
        defaultValues: {
            name: type,
            timezone: 'Asia/Kolkata',
            status: 'active',
        },
    });

    function onSubmit(values: CreateCompanyPricingTypeSchema) {
        addPricingType.mutate(values, {
            onSuccess: (data) => {
                onSucces?.(data);
                onOpenChange(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input type="text" placeholder="Enter Pricing Type Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="destructive" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button>Create</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
