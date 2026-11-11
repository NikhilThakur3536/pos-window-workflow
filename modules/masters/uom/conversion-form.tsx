'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

import {
    uomConversionCreateSchema,
    useCreateUomConversion,
    useGetActiveUoms,
    uomLabel,
    UomConversionCreateSchema,
} from '@/api-queries/masters/uom';

interface UomConversionFormProps {
    open: boolean;
    onClose: () => void;
}

const UomConversionForm = ({ open, onClose }: UomConversionFormProps) => {
    const createMutation = useCreateUomConversion();
    const { data: uoms, isLoading: isLoadingUoms } = useGetActiveUoms(open);
    const uomOptions = uoms?.data?.rows || [];

    const form = useForm<UomConversionCreateSchema>({
        resolver: zodResolver(uomConversionCreateSchema),
        defaultValues: {
            mainUomId: '',
            childUomId: '',
            conversionFactor: 1,
        },
    });

    const { handleSubmit, control, reset, watch } = form;

    // A UOM cannot be a conversion of itself, so the main UOM is filtered out of the
    // child dropdown while one is selected.
    const mainUomId = watch('mainUomId');
    const childUomOptions = uomOptions.filter((uom) => uom.id !== mainUomId);

    function onSubmit(values: UomConversionCreateSchema) {
        // The child dropdown already filters the main UOM out, but a stale form value
        // could still submit a self-conversion, so re-check before sending.
        if (values.mainUomId === values.childUomId) {
            toast.error('A UOM cannot be a conversion of itself');
            return;
        }

        createMutation.mutate(values, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('UOM conversion created successfully');
                    onClose();
                }
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Creation failed');
            },
        });
    }

    function onOpenChange() {
        reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Add UOM Conversion</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="mainUomId" className="min-w-[140px] text-sm font-medium">
                                    Main UOM <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="mainUomId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select
                                                        value={field.value || undefined}
                                                        onValueChange={field.onChange}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue
                                                                placeholder={
                                                                    isLoadingUoms
                                                                        ? 'Loading UOMs...'
                                                                        : 'Select main UOM'
                                                                }
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {uomOptions.length === 0 && !isLoadingUoms && (
                                                                <div className="text-muted-foreground px-2 py-2 text-xs">
                                                                    No active UOMs found. Create one first.
                                                                </div>
                                                            )}
                                                            {uomOptions.map((uom) => (
                                                                <SelectItem key={uom.id} value={uom.id}>
                                                                    {uom.name} ({uomLabel(uom)})
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

                            <div className="flex items-start gap-4">
                                <Label htmlFor="childUomId" className="min-w-[140px] text-sm font-medium">
                                    Child UOM <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="childUomId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select
                                                        value={field.value || undefined}
                                                        onValueChange={field.onChange}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue
                                                                placeholder={
                                                                    isLoadingUoms
                                                                        ? 'Loading UOMs...'
                                                                        : 'Select child UOM'
                                                                }
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {childUomOptions.length === 0 && !isLoadingUoms && (
                                                                <div className="text-muted-foreground px-2 py-2 text-xs">
                                                                    {mainUomId
                                                                        ? 'No other active UOMs available.'
                                                                        : 'No active UOMs found. Create one first.'}
                                                                </div>
                                                            )}
                                                            {childUomOptions.map((uom) => (
                                                                <SelectItem key={uom.id} value={uom.id}>
                                                                    {uom.name} ({uomLabel(uom)})
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

                            <div className="flex items-start gap-4">
                                <Label htmlFor="conversionFactor" className="min-w-[140px] text-sm font-medium">
                                    Conversion Factor <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="conversionFactor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="any"
                                                        placeholder="e.g. 6"
                                                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                                        value={field.value ?? ''}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        How many child units make up one main unit.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Saving...' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default UomConversionForm;
