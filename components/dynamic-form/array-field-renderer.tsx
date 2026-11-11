'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ArrayItemField, FormFieldConfig } from '@/types/form.types';
import { Plus, Trash2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';

interface ArrayFieldRendererProps {
    field: FormFieldConfig;
    form: UseFormReturn<any>;
    disabled?: boolean;
}

export function ArrayFieldRenderer({ field, form, disabled }: ArrayFieldRendererProps) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: field.id,
    });

    const arrayConfig = field.arrayConfig;
    if (!arrayConfig) return null;

    const addItem = () => {
        const newItem: Record<string, any> = {};
        arrayConfig.itemSchema.forEach((itemField) => {
            switch (itemField.type) {
                case 'number':
                case 'currency':
                case 'percentage':
                    newItem[itemField.id] = 0;
                    break;
                case 'checkbox':
                    newItem[itemField.id] = false;
                    break;
                case 'multiselect':
                    newItem[itemField.id] = [];
                    break;
                default:
                    newItem[itemField.id] = '';
            }
        });
        append(newItem);
    };

    const removeItem = (index: number) => {
        remove(index);
    };

    const canAddMore = !arrayConfig.maxItems || fields.length < arrayConfig.maxItems;
    const canRemove = !arrayConfig.minItems || fields.length > arrayConfig.minItems;

    const renderArrayItemField = (itemField: ArrayItemField, index: number) => {
        const fieldName = `${field.id}.${index}.${itemField.id}`;

        switch (itemField.type) {
            case 'text':
                return (
                    <FormField
                        key={`${fieldName}-${index}`}
                        control={form.control}
                        name={fieldName}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{itemField.label}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={itemField.placeholder}
                                        disabled={disabled}
                                        value={formField.value || ''}
                                        onChange={formField.onChange}
                                        onBlur={formField.onBlur}
                                        name={formField.name}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'number':
                return (
                    <FormField
                        key={`${fieldName}-${index}`}
                        control={form.control}
                        name={fieldName}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{itemField.label}</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder={itemField.placeholder}
                                        disabled={disabled}
                                        value={formField.value || ''}
                                        onChange={formField.onChange}
                                        onBlur={formField.onBlur}
                                        name={formField.name}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'currency':
                return (
                    <FormField
                        key={`${fieldName}-${index}`}
                        control={form.control}
                        name={fieldName}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{itemField.label}</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder={itemField.placeholder}
                                        disabled={disabled}
                                        value={formField.value || ''}
                                        onChange={formField.onChange}
                                        onBlur={formField.onBlur}
                                        name={formField.name}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'percentage':
                return (
                    <FormField
                        key={`${fieldName}-${index}`}
                        control={form.control}
                        name={fieldName}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{itemField.label}</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder={itemField.placeholder}
                                        disabled={disabled}
                                        value={formField.value || ''}
                                        onChange={formField.onChange}
                                        onBlur={formField.onBlur}
                                        name={formField.name}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'checkbox':
                return (
                    <FormField
                        key={`${fieldName}-${index}`}
                        control={form.control}
                        name={fieldName}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{itemField.label}</FormLabel>
                                <FormControl>
                                    <input
                                        type="checkbox"
                                        disabled={disabled}
                                        checked={formField.value}
                                        onChange={formField.onChange}
                                        onBlur={formField.onBlur}
                                        name={formField.name}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'multiselect':
                return (
                    <FormField
                        key={`${fieldName}-${index}`}
                        control={form.control}
                        name={fieldName}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{itemField.label}</FormLabel>
                                <FormControl>
                                    <Select
                                        disabled={disabled}
                                        value={formField.value}
                                        onValueChange={formField.onChange}
                                        name={formField.name}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={itemField.placeholder} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* @ts-ignore */}
                                            {itemField.options.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <Card className={cn('w-full', field.className)}>
            <CardHeader>
                <CardTitle>{field.label}</CardTitle>
            </CardHeader>
            <CardContent>
                {fields.map((fieldItem, index) => (
                    <div key={fieldItem.id} className="flex items-center gap-4">
                        {arrayConfig.itemSchema.map((itemField) => renderArrayItemField(itemField, index))}
                        {canRemove && (
                            <Button variant="destructive" onClick={() => removeItem(index)} disabled={disabled}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
                {canAddMore && (
                    <Button onClick={addItem} disabled={disabled}>
                        <Plus className="h-4 w-4" />
                        Add Item
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
