// components/company/company-multi-select.tsx
import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useGetCompanies } from '@/api-queries/company-details'; // adjust to your actual hook/path
import { useDebounce } from '../hooks/usedebounce';

interface CompanyOption {
    id: string;
    companyName: string;
}

interface CompanyMultiSelectProps {
    value: string[];
    onChange: (ids: string[]) => void;
    excludeIds?: string[]; // e.g. exclude the company currently being edited
    placeholder?: string;
    disabled?: boolean;
}

const PAGE_SIZE = 20;

export function CompanyMultiSelect({
    value,
    onChange,
    excludeIds = [],
    placeholder = 'Select destination companies...',
    disabled,
}: CompanyMultiSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(search, 300);

    const [accumulated, setAccumulated] = useState<Record<string, CompanyOption>>({});

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
        setAccumulated({});
    };

    const { data, isFetching, isLoading } = useGetCompanies({
        limit: PAGE_SIZE,
        search: debouncedSearch,
    });

    const rows: CompanyOption[] = data?.data ?? [];
    const totalPages: number = data?.count ?? 1;

    useMemo(() => {
        if (rows.length) {
            setAccumulated((prev) => {
                const next = { ...prev };
                rows.forEach((r) => (next[r.id] = r));
                return next;
            });
        }
    }, [data]);

    const options = Object.values(accumulated).filter((c) => !excludeIds.includes(c.id));
    const selectedCompanies = value.map((id) => accumulated[id]).filter(Boolean) as CompanyOption[];

    function toggle(id: string) {
        onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    }

    function remove(id: string) {
        onChange(value.filter((v) => v !== id));
    }

    const canLoadMore = page < totalPages;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="!h-auto min-h-7 w-full justify-between text-xs font-normal"
                >
                    <div className="flex flex-wrap gap-1">
                        {selectedCompanies.length ? (
                            selectedCompanies.map((c) => (
                                <Badge key={c.id} variant="secondary" className="flex items-center gap-1 text-[10px]">
                                    {c.companyName}
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            remove(c.id);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <X className="h-3 w-3" />
                                    </span>
                                </Badge>
                            ))
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search companies..."
                        value={search}
                        onValueChange={handleSearchChange}
                        className="text-xs"
                    />
                    <CommandList>
                        {isLoading && page === 1 ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        ) : (
                            <>
                                <CommandEmpty className="py-4 text-center text-xs">No companies found.</CommandEmpty>
                                <CommandGroup>
                                    {options.map((company) => (
                                        <CommandItem
                                            key={company.id}
                                            value={company.id}
                                            onSelect={() => toggle(company.id)}
                                            className="text-xs"
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-3 w-3',
                                                    value.includes(company.id) ? 'opacity-100' : 'opacity-0'
                                                )}
                                            />
                                            {company.companyName}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                {canLoadMore && (
                                    <div className="border-t p-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs"
                                            disabled={isFetching}
                                            onClick={() => setPage((p) => p + 1)}
                                        >
                                            {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Load more'}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}