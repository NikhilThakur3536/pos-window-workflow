import React, { Dispatch, SetStateAction, useState } from 'react';
import DateFilter from './date-filter';

export interface TableDateFilterProps<T extends object> {
    filters: T;
    setFilters: Dispatch<SetStateAction<T>>;
}

const TableDateFilter = <T extends { fromDate?: string; toDate?: string }>({
    filters,
    setFilters,
}: TableDateFilterProps<T>) => {
    const [clearDate, setClearDate] = useState(false);

    function onDateClear() {
        setFilters({ ...filters, fromDate: '', toDate: '' });
    }

    return (
        <DateFilter
            from={filters?.fromDate}
            to={filters?.toDate}
            onRangeChange={(val) => setFilters({ ...filters, fromDate: val?.from || '', toDate: val?.to || '' })}
            clearDate={clearDate}
            setClearDate={setClearDate}
            onClear={onDateClear}
        />
    );
};

export default TableDateFilter;
