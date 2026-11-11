'use client';

import type React from 'react';
import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Option {
    value: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
}

interface DynamicMultiSelectPopoverProps {
    title: string;
    options: Option[];
    selectedValue?: string[];
    onSelect: (value: string[]) => void;
    showSelectAll?: boolean;
    viewableValues?: number;
    customWidth?: string;
    disabled?: boolean;
}

export default function MultiSelectFormElement({
    title,
    options,
    selectedValue = [],
    onSelect,
    showSelectAll = false,
    viewableValues = 3,
    customWidth,
    disabled = false,
}: DynamicMultiSelectPopoverProps) {
    const selectedValues = new Set(selectedValue);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleClear = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        onSelect([]);
    };

    const allFilteredSelected =
        filteredOptions.length > 0 && filteredOptions.every((option) => selectedValues.has(option.value));

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            const newSelected = Array.from(selectedValues).filter(
                (value) => !filteredOptions.some((option) => option.value === value),
            );
            onSelect(newSelected);
        } else {
            const filteredValues = filteredOptions.map((option) => option.value);
            const newSelected = [...new Set([...Array.from(selectedValues), ...filteredValues])];
            onSelect(newSelected);
        }
    };

    const selectedOptions = options.filter((option) => selectedValues.has(option.value));

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-auto min-h-10 w-full justify-between px-3 py-2"
                    role="combobox"
                    disabled={disabled}
                >
                    <div className="flex flex-1 flex-wrap items-center gap-1">
                        {selectedValues.size === 0 ? (
                            <span className="text-muted-foreground">{title}</span>
                        ) : (
                            <>
                                {selectedOptions.slice(0, viewableValues).map((option) => (
                                    <Badge
                                        variant="secondary"
                                        key={option.value}
                                        className="rounded-sm px-1 font-normal"
                                    >
                                        {option.label}
                                    </Badge>
                                ))}

                                {selectedValues.size > viewableValues && (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        +{selectedValues.size - viewableValues} more
                                    </Badge>
                                )}
                            </>
                        )}
                    </div>

                    <div className="ml-1 flex shrink-0 items-center gap-1">
                        {selectedValues.size > 0 && (
                            <div className="cursor-pointer" onClick={handleClear}>
                                <X className="text-muted-foreground hover:text-foreground h-4 w-4" />
                            </div>
                        )}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </div>
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className={`p-0" align="start ${customWidth || 'w-[300px]'}`}
                onWheel={(e) => e.stopPropagation()}
            >
                <Command shouldFilter={false}>
                    <CommandInput placeholder={title} value={searchQuery} onValueChange={setSearchQuery} />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {showSelectAll && filteredOptions.length > 0 && (
                                <div
                                    className="border-border hover:bg-accent flex cursor-pointer items-center border-b px-2 py-1.5"
                                    onClick={toggleSelectAll}
                                >
                                    <div
                                        className={cn(
                                            'border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                                            allFilteredSelected
                                                ? 'bg-primary text-primary-foreground'
                                                : 'opacity-50 [&_svg]:invisible',
                                        )}
                                    >
                                        <Check className="h-3 w-3" />
                                    </div>
                                    <span className="font-medium">
                                        {allFilteredSelected ? 'Unselect All' : 'Select All'}
                                    </span>
                                </div>
                            )}

                            {filteredOptions.map((option) => {
                                const isSelected = selectedValues.has(option.value);
                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        onSelect={() => {
                                            if (isSelected) {
                                                selectedValues.delete(option.value);
                                            } else {
                                                selectedValues.add(option.value);
                                            }
                                            onSelect(Array.from(selectedValues));
                                        }}
                                    >
                                        <div
                                            className={cn(
                                                'border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'opacity-50 [&_svg]:invisible',
                                            )}
                                        >
                                            <Check className="h-3 w-3" />
                                        </div>
                                        {option.icon && <option.icon className="text-muted-foreground mr-2 h-4 w-4" />}
                                        <span>{option.label}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
