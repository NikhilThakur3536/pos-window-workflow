import React, { useState } from 'react';
import { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { PromotionCreateSchema, PromotionUpdateSchema } from '@/api-queries/promotions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PromotionGroupDialog } from '@/modules/common/hoc/promotion-group-dialog';
import { PromotionGroupsDetails } from '@/api-queries/promotions/groups';

interface CommonGroupsSelection {
    watch: UseFormWatch<PromotionCreateSchema | PromotionUpdateSchema>;
    setValue: UseFormSetValue<PromotionCreateSchema | PromotionUpdateSchema>;
}

const CommonGroupsSelection = ({ watch, setValue }: CommonGroupsSelection) => {
    const [isPromotionGroupDialogOpen, setIsPromotionGroupDialogOpen] = useState(false);

    // Group Selection
    const handleSelectPromotionGroup = (group: PromotionGroupsDetails) => {
        const currentGroups = qualifyingGroups || [];

        const groupExists = currentGroups.some((data: any) => data.companyStockDetailId === group.id);

        if (groupExists) {
            toast.error('Group already added');
            setIsPromotionGroupDialogOpen(false);

            return;
        }

        const newGroup = {
            companyStockPromotionId: group.id,
            colorCode: group.colorCode,
            groupName: group.groupName,
            quantityGiven: 0,
        };

        setValue('qualifyingGroups', [...currentGroups, newGroup]);
        setIsPromotionGroupDialogOpen(false);
    };

    const handleRemoveGroup = (index: number) => {
        const currentGroups = qualifyingGroups || [];
        const updatedGroups = currentGroups.filter((_: any, i: number) => i !== index);
        setValue('qualifyingGroups', updatedGroups);
    };

    const handleUpdateQuantity = (index: number, quantity: number) => {
        const currentGroups = [...(qualifyingGroups || [])];
        currentGroups[index] = { ...currentGroups[index], quantityGiven: quantity };
        setValue('qualifyingGroups', currentGroups);
    };

    const qualifyingGroups = watch('qualifyingGroups');

    return (
        <>
            <table className="w-full text-xs">
                <thead className="sticky top-0 border-b bg-gray-50">
                    <tr>
                        <th className="w-1/4 p-1 px-2 text-left font-medium">Code</th>
                        <th className="w-3/4 p-1 px-2 text-left font-medium">Name</th>
                        <th className="p-1 px-2 text-left font-medium">Quantity</th>
                        <th className="w-10 p-1 px-2 text-right font-medium">
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-max !p-0 text-xs"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsPromotionGroupDialogOpen(true);
                                }}
                            >
                                <Plus className="h-3 w-3" />
                                Add Group
                            </Button>
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {!qualifyingGroups || qualifyingGroups.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="p-4 text-center">
                                <p className="text-xs text-gray-500 italic">No Groups added yet</p>
                                <Button
                                    type="button"
                                    className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsPromotionGroupDialogOpen(true);
                                    }}
                                >
                                    Add Groups
                                </Button>
                            </td>
                        </tr>
                    ) : (
                        qualifyingGroups.map((group: any, index: number) => (
                            <tr key={index} className="border-b bg-white hover:bg-gray-50">
                                <td className="p-1 px-2 text-xs">{group.colorCode}</td>
                                <td className="p-1 px-2 text-xs">{group.groupName}</td>
                                <td className="p-1 px-2">
                                    <Input
                                        type="number"
                                        step={1}
                                        min={0}
                                        className="h-5 w-20 text-[11px]"
                                        value={group.quantityGiven || 0}
                                        onChange={(e) => handleUpdateQuantity(index, e.target.valueAsNumber || 0)}
                                    />
                                </td>
                                <td className="p-1 px-2 text-right">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveGroup(index)}
                                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {isPromotionGroupDialogOpen && (
                <PromotionGroupDialog
                    isOpen={isPromotionGroupDialogOpen}
                    onClose={() => setIsPromotionGroupDialogOpen(false)}
                    onSelectPromotionGroup={handleSelectPromotionGroup}
                />
            )}
        </>
    );
};

export default CommonGroupsSelection;
