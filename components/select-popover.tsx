import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Option {
    value: string;
    label: string;
}

interface SelectPopoverProps {
    title?: string;
    onlyTitle?: string;
    options: Option[];
    selectedValue?: string | null;
    onSelect: (value: any | null) => void;
    wrapperClass?: string;
    selectClass?: string;
    disabled?: boolean;
    mandatoryField?: boolean;
    onSearch?: (search: string) => void;
    isSearching?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;
}

export default function SelectPopover({
    title = 'Data',
    onlyTitle,
    options,
    selectedValue,
    onSelect,
    wrapperClass,
    selectClass,
    disabled = false,
    mandatoryField = false,
    onSearch,
    isSearching = false,
    hasMore = false,
    onLoadMore,
}: SelectPopoverProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const selectedOption = options.find((opt) => opt.value === selectedValue);

    const filteredOptions = options.filter((option) =>
    String(option.label ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevSearch = useRef<string>('');

    useEffect(() => {
        if (!onSearch) return;
        if (searchQuery === prevSearch.current) return;
        prevSearch.current = searchQuery;
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            onSearch(searchQuery);
        }, 400);
        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current);
        };
    }, [searchQuery, onSearch]);

    const handleClear = () => {
        if (!disabled) onSelect('');
    };

    return (
        <div className={cn('relative min-w-[200px]', wrapperClass || '')}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        disabled={disabled}
                        variant="outline"
                        className={cn('flex w-full items-center justify-between', selectClass || '')}
                    >
                        <div
                            className={`${selectedOption ? '' : 'text-gray-600'} flex items-center gap-2 overflow-hidden font-normal`}
                        >
                            {selectedOption ? selectedOption.label : onlyTitle || `Select ${title}`}
                        </div>
                        <ChevronDown className={`${!mandatoryField && selectedValue ? 'mr-2' : ''} h-4 w-4`} />
                    </Button>
                </PopoverTrigger>

                {!disabled && (
                    <PopoverContent className="p-0" onWheel={(e) => e.stopPropagation()}>
                        <Command>
                            <CommandInput
                                placeholder={`Search ${title || ''}`}
                                onValueChange={(value) => setSearchQuery(value)}
                            />
                            <CommandList>
                                {filteredOptions.length === 0 && !isSearching ? (
                                    <CommandEmpty>No results found.</CommandEmpty>
                                ) : (
                                    <>
                                        {filteredOptions.map((option) => (
                                            <CommandItem
                                                key={option.value}
                                                value={option.label}
                                                onSelect={() => {
                                                    onSelect(option.value);
                                                    setOpen(false);
                                                    setSearchQuery('');
                                                }}
                                                className={selectedValue === option.value ? 'bg-blue-100' : ''}
                                            >
                                                {option.label}
                                            </CommandItem>
                                        ))}
                                        {isSearching && (
                                            <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Searching...</span>
                                            </div>
                                        )}
                                        {filteredOptions.length > 0 && hasMore && onLoadMore && (
                                            <button
                                                type="button"
                                                onClick={onLoadMore}
                                                disabled={isSearching}
                                                className="flex w-full items-center justify-center gap-2 border-t px-2 py-2 text-center text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isSearching && <Loader2 className="h-3 w-3 animate-spin" />}
                                                {isSearching ? 'Loading...' : 'Load more'}
                                            </button>
                                        )}
                                    </>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                )}
            </Popover>

            {!mandatoryField && selectedValue && !disabled && (
                <div className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer" onClick={handleClear}>
                    <X className="h-4 w-4 text-red-500 hover:text-red-700" />
                </div>
            )}
        </div>
    );
}
