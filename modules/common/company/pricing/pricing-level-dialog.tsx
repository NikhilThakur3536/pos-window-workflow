import {
    CreateCompanyPricingLevelResponse,
    useCreateCompanyStockPricingLevel,
} from '@/api-queries/company/stock-level';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createCompanyPricingLevelSchema, CreateCompanyPricingLevelSchema } from '@/schema/company/pricing-level';

import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { useForm } from 'react-hook-form';

interface AddLevelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    level?: string;
    onSuccess?: (data: CreateCompanyPricingLevelResponse) => void;
}

export function PricingLevelDialog({ open, onOpenChange, level = '', onSuccess }: AddLevelProps) {
    const addPricingLevel = useCreateCompanyStockPricingLevel();
    const form = useForm({
        resolver: zodResolver(createCompanyPricingLevelSchema),
        defaultValues: {
            name: level,
            status: 'active',
            timezone: 'Asia/Kolkata',
            enable: false,
        },
    });

    function onSubmit(values: CreateCompanyPricingLevelSchema) {
        addPricingLevel.mutate(values, {
            onSuccess: (data) => {
                onSuccess?.(data);
                onOpenChange(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Pricing Level</DialogTitle>
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
                                        <Input type="text" placeholder="Enter Pricing Level Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="destructive" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default PricingLevelDialog;
