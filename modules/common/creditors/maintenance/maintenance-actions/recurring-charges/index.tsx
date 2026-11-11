import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { Trash2Icon } from 'lucide-react';
import { ListOnlyTable } from '@/components/list-only-table';

interface RecurringChargeRow {
    id: string;
    description: string;
    print: boolean;
    email: boolean;
    export: boolean;
}

interface RecurringChargesFormData {
    charges: RecurringChargeRow[];
}

const RecurringCharges = () => {
    const { handleSubmit, control } = useForm<RecurringChargesFormData>({
        defaultValues: {
            charges: [
                { id: '1 month', description: 'Monthly Subscription', print: true, email: true, export: false },
                { id: '3 months', description: 'Quarterly Service', print: false, email: true, export: true },
                { id: '6 months', description: 'Bi-Annual Maintenance', print: true, email: false, export: true },
                { id: '12 months', description: 'Annual License Fee', print: false, email: false, export: false },
            ],
        },
    });

    const { fields, remove } = useFieldArray({
        control,
        name: 'charges',
    });

    const columns = [
        {
            key: 'id',
            label: 'Invoice ID',
            className: 'text-sm w-[100px]',
        },
        {
            key: 'description',
            label: 'Description',
            className: 'text-sm',
        },
        {
            key: 'print',
            label: 'Print',
            className: 'text-center text-sm w-[50px]',
            render: (row: any, index: number) => {
                const fieldIndex = fields.findIndex((field) => field.id === row.id);
                return (
                    <div className="flex justify-center">
                        <Controller
                            name={`charges.${fieldIndex}.print`}
                            control={control}
                            render={({ field }) => (
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-4 w-4" />
                            )}
                        />
                    </div>
                );
            },
        },
        {
            key: 'email',
            label: 'Email',
            className: 'text-center text-sm w-[50px]',
            render: (row: any, index: number) => {
                const fieldIndex = fields.findIndex((field) => field.id === row.id);
                return (
                    <div className="flex justify-center">
                        <Controller
                            name={`charges.${fieldIndex}.email`}
                            control={control}
                            render={({ field }) => (
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-4 w-4" />
                            )}
                        />
                    </div>
                );
            },
        },
        {
            key: 'export',
            label: 'Export',
            className: 'text-center text-sm w-[50px]',
            render: (row: any, index: number) => {
                const fieldIndex = fields.findIndex((field) => field.id === row.id);
                return (
                    <div className="flex justify-center">
                        <Controller
                            name={`charges.${fieldIndex}.export`}
                            control={control}
                            render={({ field }) => (
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-4 w-4" />
                            )}
                        />
                    </div>
                );
            },
        },
        {
            key: 'remove',
            label: '',
            className: 'w-[40px]',
            render: (row: any, index: number) => {
                const fieldIndex = fields.findIndex((field) => field.id === row.id);
                return (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(fieldIndex)}
                        className="h-7 w-7"
                    >
                        <Trash2Icon className="h-4 w-4 text-red-500" />
                    </Button>
                );
            },
        },
    ];

    const onSubmit = (data: RecurringChargesFormData) => {
        console.log('Recurring Charges Submitted:', data);
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for Recurring Charges');
    };

    const handleAccept = () => {
        handleSubmit(onSubmit)();
    };

    return (
        <div onSubmit={handleSubmit(onSubmit)} className="relative flex h-full overflow-hidden">
            <div className="absolute inset-0 bottom-16 overflow-auto">
                <ListOnlyTable columns={columns} data={fields} />
            </div>

            <div className="absolute right-0 bottom-0 left-0">
                <AcceptHintActions onShowHints={handleShowHints} onAccept={handleAccept} />
            </div>
        </div>
    );
};

export default RecurringCharges;
