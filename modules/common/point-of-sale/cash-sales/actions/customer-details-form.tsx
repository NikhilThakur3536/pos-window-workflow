import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { cashSaleCustomerSchema, CashSaleCustomerSchema } from '@/api-queries/point-of-sale/cash-sales';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

interface CustomerDetailsFormProps {
    onSubmit: (data: CashSaleCustomerSchema) => void;
    onCancel: () => void;
}

const CustomerDetailsForm = ({ onSubmit, onCancel }: CustomerDetailsFormProps) => {
    const form = useForm<CashSaleCustomerSchema>({
        resolver: zodResolver(cashSaleCustomerSchema),
        defaultValues: {
            orderNumber: '',
            name: '',
            address1: '',
            address2: '',
            address3: '',
            telNumber: '',
            vatNumber: '',
            email: '',
        },
    });

    const { handleSubmit, control } = form;

    function onFormSubmit(values: CashSaleCustomerSchema) {
        const cleanedValues = Object.fromEntries(
            Object.entries(values).filter(([_, v]) => v !== undefined && v !== null && v !== ''),
        ) as CashSaleCustomerSchema;

        onSubmit(cleanedValues);
    }

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onFormSubmit)}>
                <Card className="mx-auto min-h-[60vh] w-full overflow-auto rounded-none py-0 pb-2">
                    <CardContent className="grid justify-center gap-2 p-4 py-2">
                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="orderNumber" className="text-right text-sm">
                                Order Number <MandatoryField />
                            </Label>
                            <div className="col-span-2 w-full">
                                <FormField
                                    control={control}
                                    name="orderNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input placeholder="Enter order number" {...field} className="h-8" />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormMessage />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="name" className="text-right text-sm">
                                Name <MandatoryField />
                            </Label>
                            <div className="col-span-2 w-full">
                                <FormField
                                    control={control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input placeholder="Enter your name" {...field} className="h-8" />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormMessage />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="address1" className="text-right text-sm">
                                Address 1 <MandatoryField />
                            </Label>

                            <div className="col-span-2 w-full">
                                <FormField
                                    control={control}
                                    name="address1"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter your address details..."
                                                    {...field}
                                                    className="h-8"
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormMessage />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="address2" className="text-right text-sm">
                                Address 2
                            </Label>

                            <div className="col-span-2 w-full">
                                <FormField
                                    control={control}
                                    name="address2"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter your address details..."
                                                    {...field}
                                                    className="h-8"
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormMessage />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="address3" className="text-right text-sm">
                                Address 3
                            </Label>

                            <div className="col-span-2 w-full">
                                <FormField
                                    control={control}
                                    name="address3"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter your address details..."
                                                    {...field}
                                                    className="h-8"
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormMessage />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="telNumber" className="text-right text-sm">
                                Tel Number <MandatoryField />
                            </Label>
                            <div className="col-span-2 w-full">
                                <FormField
                                    control={control}
                                    name="telNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter your telephone..."
                                                    {...field}
                                                    className="h-8"
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormMessage />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="vatNumber" className="text-right text-sm">
                                Vat Number
                            </Label>
                            <div className="col-span-2 w-full">
                                <FormField
                                    control={control}
                                    name="vatNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input placeholder="Enter vat number..." {...field} className="h-8" />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormMessage />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="email" className="text-right text-sm">
                                Email
                            </Label>
                            <div className="col-span-2 w-full">
                                <FormField
                                    control={control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input placeholder="Enter your email" {...field} className="h-8" />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormMessage />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-none justify-between gap-2 bg-white p-3">
                    <Button
                        type="button"
                        onClick={onCancel}
                        className="flex items-center gap-1 bg-red-600 text-white hover:bg-red-700"
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="flex items-center gap-1 bg-green-600 text-white hover:bg-green-700"
                    >
                        <Check className="h-4 w-4" />
                        Accept
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export default CustomerDetailsForm;
