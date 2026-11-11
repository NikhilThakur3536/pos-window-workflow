import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { endOfDay, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import React, { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

export type DateRange = {
    from: Date | undefined;
    to: Date | undefined;
};

export type DateRangeOption = 'today' | 'week' | 'month' | '3months' | 'custom';

interface DateRangeSelectorProps {
    from?: string;
    to?: string;
    onRangeChange: (range: { from: string; to: string }) => void;
    clearDate: boolean;
    setClearDate: Dispatch<SetStateAction<boolean>>;
    onClear: () => void;
}

const DateFilter: React.FC<DateRangeSelectorProps> = ({
    from,
    to,
    onRangeChange,
    clearDate,
    setClearDate,
    onClear,
}) => {
    const [selectedOption, setSelectedOption] = useState<DateRangeOption | ''>('');
    const [dateRange, setDateRange] = useState<DateRange>({
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
    });
    const [fromOpen, setFromOpen] = useState(false);
    const [toOpen, setToOpen] = useState(false);

    useEffect(() => {
        if (from && to) {
            setDateRange({
                from: new Date(from),
                to: new Date(to),
            });
            detectPresetFromDates(new Date(from), new Date(to));
        }
    }, [from, to]);

    useEffect(() => {
        if (clearDate) {
            setSelectedOption('');
            setClearDate(false);
        }
    }, [clearDate]);

    const detectPresetFromDates = (fromDate: Date, toDate: Date) => {
        // Today
        const today = new Date();
        if (
            format(fromDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') &&
            format(toDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
        ) {
            setSelectedOption('today');
            return;
        }

        // This week
        const weekStart = startOfWeek(today);
        const weekEnd = endOfWeek(today);
        if (
            format(fromDate, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd') &&
            format(toDate, 'yyyy-MM-dd') === format(weekEnd, 'yyyy-MM-dd')
        ) {
            setSelectedOption('week');
            return;
        }

        // This month
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        if (
            format(fromDate, 'yyyy-MM-dd') === format(monthStart, 'yyyy-MM-dd') &&
            format(toDate, 'yyyy-MM-dd') === format(monthEnd, 'yyyy-MM-dd')
        ) {
            setSelectedOption('month');
            return;
        }

        const threeMonthsAgo = startOfDay(subMonths(today, 3));
        if (
            format(fromDate, 'yyyy-MM-dd') === format(threeMonthsAgo, 'yyyy-MM-dd') &&
            format(toDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
        ) {
            setSelectedOption('3months');
            return;
        }

        setSelectedOption('custom');
    };

    const handleOptionChange = (value: DateRangeOption) => {
        setSelectedOption(value);
        let newRange: DateRange = { from: undefined, to: undefined };

        const today = new Date();

        switch (value) {
            case 'today':
                newRange = {
                    from: startOfDay(today),
                    to: endOfDay(today),
                };
                break;
            case 'week':
                newRange = {
                    from: startOfWeek(today),
                    to: endOfWeek(today),
                };
                break;
            case 'month':
                newRange = {
                    from: startOfMonth(today),
                    to: endOfMonth(today),
                };
                break;
            case '3months':
                newRange = {
                    from: startOfDay(subMonths(today, 3)),
                    to: endOfDay(today),
                };
                break;
            case 'custom':
                newRange = { from: undefined, to: undefined };
                break;
        }

        setDateRange(newRange);

        onRangeChange({
            from: newRange.from ? format(newRange.from, 'yyyy-MM-dd') : '',
            to: newRange.to ? format(newRange.to, 'yyyy-MM-dd') : '',
        });
    };

    const handleFromDateChange = (date: Date | undefined) => {
        const newRange = { ...dateRange, from: date };
        setDateRange(newRange);
        setFromOpen(false);

        if (newRange.from && newRange.to) {
            onRangeChange({
                from: format(newRange.from, 'yyyy-MM-dd'),
                to: format(newRange.to, 'yyyy-MM-dd'),
            });
        }
    };

    const handleToDateChange = (date: Date | undefined) => {
        const newRange = { ...dateRange, to: date };
        setDateRange(newRange);
        setToOpen(false);

        if (newRange.from && newRange.to) {
            onRangeChange({
                from: format(newRange.from, 'yyyy-MM-dd'),
                to: format(newRange.to, 'yyyy-MM-dd'),
            });
        }
    };

    return (
        <div className="relative flex items-end gap-3">
            <div className="w-[140px]">
                <Select value={selectedOption} onValueChange={(value) => handleOptionChange(value as DateRangeOption)}>
                    <SelectTrigger className="h-7 pr-5 text-xs font-semibold">
                        <SelectValue placeholder="Select Day" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="3months">3 Months</SelectItem>
                        <SelectItem value="custom">Date Range</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {selectedOption === 'custom' && (
                <>
                    <Popover open={fromOpen} onOpenChange={setFromOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                id="from-date"
                                variant="outline"
                                className={cn(
                                    'justify-start gap-2 px-3 text-left text-xs font-semibold',
                                    !dateRange.from && 'text-muted-foreground',
                                )}
                            >
                                <CalendarIcon className="h-4 w-4" />
                                {dateRange.from ? format(dateRange.from, 'PPP') : <span>Select from date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={dateRange.from}
                                onSelect={handleFromDateChange}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    <Popover open={toOpen} onOpenChange={setToOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                id="to-date"
                                variant="outline"
                                className={cn(
                                    'w-[165px] justify-start gap-2 px-3 text-left text-xs font-semibold',
                                    !dateRange.to && 'text-muted-foreground',
                                )}
                            >
                                <CalendarIcon className="h-4 w-4" />
                                {dateRange.to ? format(dateRange.to, 'PPP') : <span>Select to date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={dateRange.to}
                                onSelect={handleToDateChange}
                                initialFocus
                                disabled={(date) => (dateRange.from ? date < dateRange.from : false)}
                            />
                        </PopoverContent>
                    </Popover>
                </>
            )}

            {selectedOption && (
                <div
                    className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer"
                    onClick={() => {
                        setSelectedOption('');
                        onClear();
                    }}
                >
                    <X className="h-4 w-4 text-red-500 hover:text-red-700" />
                </div>
            )}
        </div>
    );
};

export default DateFilter;
