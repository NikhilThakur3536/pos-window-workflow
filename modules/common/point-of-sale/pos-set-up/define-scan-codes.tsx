import React from 'react';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';

interface ScanCodeFormData {
    types: Record<string, string>;
    priceOrWeight: 'Price' | 'Weight';
    decimalQuantity: number;
    notes: string;
}

const defaultTypes = {
    type20: '20IIIIIDPPPPC',
    type21: '21IIIIIDPPPPC',
    type22: '22IIIIIDPPPPC',
    type23: '23IIIIIDPPPPC',
    type24: '24IIIIIDPPPPC',
    type25: '25IIIIIDPPPPC',
    type26: '26IIIIIDPPPPC',
    type27: '27IIIIIDPPPPC',
    type28: '28IIIIIDPPPPC',
    type29: '29IIIIIDPPPPC',
};

const defaultNotes = `I is the item identifier, D is a price check digit, P is the price of the item and C is the overall check digit.
Type 21 to 24 must be specified by the retailer and type 25 to 27 is not yet specified.
The item to be captured as an instore number is the first 2 digits of the barcode followed by 5 zeros followed by the item identifier (zero padded on the left).

NOTE: By replacing the P with W will override the Price/Weight setting and default the Type to a weight based barcode.`;

const DefineScanCodes = () => {
    const { register, handleSubmit, setValue, watch } = useForm<ScanCodeFormData>({
        defaultValues: {
            types: defaultTypes,
            priceOrWeight: 'Price',
            decimalQuantity: 0,
            notes: defaultNotes,
        },
    });

    const onSubmit = (data: ScanCodeFormData) => {
        console.log('Scan form Data submitted:', data);
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for slip details');
    };

    const handleAccept = () => {
        handleSubmit(onSubmit)();
    };
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 !py-0">
            <AcceptHintActions
                onShowHints={handleShowHints}
                onAccept={handleAccept}
                containerClassName="flex-none !p-0 !py-2 border-t-0"
            />

            <div className="flex gap-8">
                <div className="grid grid-cols-1 space-y-2">
                    {Object.entries(defaultTypes).map(([key, value], idx) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                            <Label className="w-28 text-[13px] font-medium">
                                {String.fromCharCode(65 + idx)} Type {20 + idx}
                            </Label>
                            <Input
                                type="text"
                                {...register(`types.${key}`)}
                                defaultValue={value}
                                className="h-8 w-[220px] self-end bg-white text-[13px]"
                            />
                        </div>
                    ))}

                    <div className="flex items-center justify-between gap-2">
                        <Label className="w-[max] text-[13px] font-medium">Price or Weight based barcode:</Label>
                        <Select
                            onValueChange={(val) => setValue('priceOrWeight', val as 'Price' | 'Weight')}
                            defaultValue={watch('priceOrWeight')}
                        >
                            <SelectTrigger className="h-8 w-[140px] bg-white text-[13px]">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Price">Price</SelectItem>
                                <SelectItem value="Weight">Weight</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Label className="w-[max] text-[13px] font-medium">Decimal Quantity for Price/Weight:</Label>
                        <Input
                            type="number"
                            {...register('decimalQuantity', { valueAsNumber: true })}
                            className="h-8 w-[100px] bg-white text-end text-[13px]"
                        />
                    </div>
                </div>

                <div className="flex-1">
                    <Label className="mb-1 block text-[13px] font-medium">Notes</Label>
                    <Textarea
                        {...register('notes')}
                        defaultValue={defaultNotes}
                        className="min-h-[70vh] w-full resize-none bg-white p-4 text-[13px]"
                    />
                </div>
            </div>
        </form>
    );
};

export default DefineScanCodes;
