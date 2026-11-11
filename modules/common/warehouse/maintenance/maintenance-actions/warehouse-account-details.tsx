'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
    WarehouseCreateSchema,
    useCreateWarehouse,
    useUpdateWarehouse,
} from '@/api-queries/warehouse';

interface Props {
    warehouse?: any;
    onClose: () => void;
}

export default function WarehouseAccountDetails({
    warehouse,
    onClose,
}: Props) {
    const isEditMode = !!warehouse?.id;

    const createWarehouse = useCreateWarehouse();
    const updateWarehouse = useUpdateWarehouse();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<WarehouseCreateSchema>({
        defaultValues: {
            name: '',
            groupCode: '',
            description: '',
            timezone: '',
            companyId: '',
            domainId: '',
        },
    });

    useEffect(() => {
        if (warehouse) {
            reset({
                name: warehouse.name || '',
                groupCode: warehouse.groupCode || '',
                description: warehouse.description || '',
                timezone: warehouse.timezone || '',
                companyId: warehouse.companyId || '',
                domainId: warehouse.domainId || '',
            });
        }
    }, [warehouse, reset]);

    const onSubmit = (values: WarehouseCreateSchema) => {
        if (isEditMode) {
            updateWarehouse.mutate(
                {
                    id: warehouse.id,
                    ...values,
                },
                {
                    onSuccess: () => {
                        toast.success(
                            'Warehouse updated successfully'
                        );
                        onClose();
                    },
                    onError: (error: any) => {
                        toast.error(
                            error?.response?.data?.message ||
                                'Update failed'
                        );
                    },
                }
            );
        } else {
            createWarehouse.mutate(values, {
                onSuccess: () => {
                    toast.success(
                        'Warehouse created successfully'
                    );
                    onClose();
                },
                onError: (error: any) => {
                    toast.error(
                        error?.response?.data?.message ||
                            'Create failed'
                    );
                },
            });
        }
    };

    return (
        <form
    onSubmit={handleSubmit(onSubmit)}
    className="flex h-full flex-col"
>
    <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">
                    Name
                </Label>
                <Input
                    id="name"
                    {...register('name')}
                />
                {errors.name?.message && (
                    <p className="text-xs text-red-500">
                        {errors.name.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="groupCode">
                    Group Code
                </Label>
                <Input
                    id="groupCode"
                    {...register('groupCode')}
                />
                {errors.groupCode?.message && (
                    <p className="text-xs text-red-500">
                        {errors.groupCode.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="timezone">
                    Timezone
                </Label>
                <Input
                    id="timezone"
                    {...register('timezone')}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="companyId">
                    Company ID
                </Label>
                <Input
                    id="companyId"
                    {...register('companyId')}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="domainId">
                    Domain ID
                </Label>
                <Input
                    id="domainId"
                    {...register('domainId')}
                />
            </div>

            <div className="col-span-2 space-y-2">
                <Label htmlFor="description">
                    Description
                </Label>
                <Input
                    id="description"
                    {...register('description')}
                />
            </div>
        </div>
    </div>

    <div className="flex items-center justify-end gap-3 border-t bg-muted/20 px-6 py-4">
        <Button
            type="button"
            variant="outline"
            onClick={onClose}
        >
            Cancel
        </Button>

        <Button
            type="submit"
            disabled={
                createWarehouse.isPending ||
                updateWarehouse.isPending
            }
        >
            {isEditMode
                ? 'Update Warehouse'
                : 'Create Warehouse'}
        </Button>
    </div>
</form>
    );
}