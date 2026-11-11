'use client';

import { ArrayFieldRenderer } from '@/components/dynamic-form/array-field-renderer';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FormFieldConfig } from '@/types/form.types';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

interface FieldRendererProps {
    field: FormFieldConfig;
    form: UseFormReturn<any>;
    disabled?: boolean;
}

export function FieldRenderer({ field, form, disabled }: FieldRendererProps) {
    const renderField = () => {
        switch (field.type) {
            case 'array':
                return <ArrayFieldRenderer field={field} form={form} disabled={disabled} />;

            case 'text':
                return (
                    <FormField
                        control={form.control}
                        name={field.id}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{field.label}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...formField}
                                        placeholder={field.placeholder}
                                        disabled={disabled || field.disabled}
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
                        control={form.control}
                        name={field.id}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{field.label}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...formField}
                                        type="number"
                                        placeholder={field.placeholder}
                                        disabled={disabled || field.disabled}
                                        onChange={(e) => formField.onChange(Number(e.target.value))}
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
                        control={form.control}
                        name={field.id}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{field.label}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                                            $
                                        </span>
                                        <Input
                                            {...formField}
                                            type="number"
                                            step="0.01"
                                            className="pl-7"
                                            placeholder={field.placeholder}
                                            disabled={disabled || field.disabled}
                                            onChange={(e) => formField.onChange(Number(e.target.value))}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'percentage':
                return (
                    <FormField
                        control={form.control}
                        name={field.id}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{field.label}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            {...formField}
                                            type="number"
                                            step="0.01"
                                            className="pr-7"
                                            placeholder={field.placeholder}
                                            disabled={disabled || field.disabled}
                                            onChange={(e) => formField.onChange(Number(e.target.value))}
                                        />
                                        <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
                                            %
                                        </span>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'textarea':
                return (
                    <FormField
                        control={form.control}
                        name={field.id}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{field.label}</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...formField}
                                        placeholder={field.placeholder}
                                        disabled={disabled || field.disabled}
                                        rows={4}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'select':
                return (
                    <FormField
                        control={form.control}
                        name={field.id}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{field.label}</FormLabel>
                                <Select
                                    onValueChange={formField.onChange}
                                    defaultValue={formField.value}
                                    disabled={disabled || field.disabled}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={field.placeholder} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {field.options?.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                disabled={option.disabled}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'date':
                return (
                    <FormField
                        control={form.control}
                        name={field.id}
                        render={({ field: formField }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>{field.label}</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'pl-3 text-left font-normal',
                                                    !formField.value && 'text-muted-foreground',
                                                )}
                                                disabled={disabled || field.disabled}
                                            >
                                                {formField.value ? (
                                                    format(formField.value, 'PPP')
                                                ) : (
                                                    <span>{field.placeholder || 'Pick a date'}</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formField.value}
                                            onSelect={formField.onChange}
                                            disabled={disabled || field.disabled}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'checkbox':
                return (
                    <FormField
                        control={form.control}
                        name={field.id}
                        render={({ field: formField }) => (
                            <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                                <FormControl>
                                    <Checkbox
                                        checked={formField.value}
                                        onCheckedChange={formField.onChange}
                                        disabled={disabled || field.disabled}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>{field.label}</FormLabel>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'radio':
                return (
                    <FormField
                        control={form.control}
                        name={field.id}
                        render={({ field: formField }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>{field.label}</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={formField.onChange}
                                        defaultValue={formField.value}
                                        className="flex flex-col space-y-1"
                                        disabled={disabled || field.disabled}
                                    >
                                        {field.options?.map((option) => (
                                            <FormItem
                                                key={option.value}
                                                className="flex items-center space-y-0 space-x-3"
                                            >
                                                <FormControl>
                                                    <RadioGroupItem value={option.value} disabled={option.disabled} />
                                                </FormControl>
                                                <FormLabel className="font-normal">{option.label}</FormLabel>
                                            </FormItem>
                                        ))}
                                    </RadioGroup>
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

    return <div className={cn('space-y-2', field.gridColumn && `col-span-${field.gridColumn}`)}>{renderField()}</div>;
}
