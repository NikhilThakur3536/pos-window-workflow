import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

type Option = {
    label: string;
    value: string;
};

type MultiSelectProps = {
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    className?: string;
};

export function MultiSelect({ options, value, onChange, placeholder = 'Select...', className }: MultiSelectProps) {
    const [open, setOpen] = useState(false);

    const toggleValue = (optionValue: string) => {
        if (value.includes(optionValue)) {
            onChange(value.filter((v) => v !== optionValue));
        } else {
            onChange([...value, optionValue]);
        }
    };

    const removeValue = (optionValue: string) => {
        onChange(value.filter((v) => v !== optionValue));
    };

    const selectedOptions = options.filter((o) => value.includes(o.value));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('h-9 min-w-[180px] justify-between font-normal', className)}
                >
                    <div className="flex flex-wrap items-center gap-1 overflow-hidden">
                        {selectedOptions.length === 0 && (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                        {selectedOptions.length > 0 && selectedOptions.length <= 2 && (
                            selectedOptions.map((option) => (
                                <Badge
                                    key={option.value}
                                    variant="secondary"
                                    className="mr-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeValue(option.value);
                                    }}
                                >
                                    {option.label}
                                    <X className="ml-1 h-3 w-3" />
                                </Badge>
                            ))
                        )}
                        {selectedOptions.length > 2 && (
                            <Badge variant="secondary">{selectedOptions.length} selected</Badge>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[240px] p-0">
                <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = value.includes(option.value);
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => toggleValue(option.value)}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                isSelected ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        {option.label}
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