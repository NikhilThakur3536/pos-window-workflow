import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Check, PlusCircle, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
}

interface MultiSelectPopoverProps {
    title: string;
    options: Option[];
    selectedValue?: string[];
    onSelect: (value: string[]) => void;
}

export default function MultiSelectPopover({ title, options, selectedValue = [], onSelect }: MultiSelectPopoverProps) {
    const selectedValues = new Set(selectedValue);

    const handleClear = () => {
        onSelect([]);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">
                    <PlusCircle />
                    <div className="flex items-center">
                        {title}{' '}
                        {selectedValues?.size > 0 && (
                            <div className="ml-2 cursor-pointer" onClick={handleClear}>
                                <X className="h-4 w-4 text-red-500 hover:text-red-700" />
                            </div>
                        )}
                    </div>
                    {selectedValues.size > 0 && (
                        <>
                            <Separator orientation="vertical" className="h-4" />
                            <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                {selectedValues.size}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {selectedValues.size > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {selectedValues.size} selected
                                    </Badge>
                                ) : (
                                    options
                                        .filter((option) => selectedValues.has(option.value))
                                        .map((option) => (
                                            <Badge
                                                variant="secondary"
                                                key={option.value}
                                                className="rounded-sm px-1 font-normal"
                                            >
                                                {option.label}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={title} />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedValues.has(option.value);
                                return (
                                    <CommandItem
                                        key={option.value}
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
                                            <Check />
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
