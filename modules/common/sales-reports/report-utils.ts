import { type ReportsType, type SalesReportColumnsType } from '@/api-queries/reports';
import { type ColumnDef } from '@tanstack/react-table';
import getReportsColumns from './reports-columns';

export type TypeHandlerReturnType = {
    title: string;
    columns: ColumnDef<SalesReportColumnsType>[];
};

export function typeHandler(type: ReportsType): TypeHandlerReturnType {
    let title = '';
    let columns: ColumnDef<SalesReportColumnsType>[] = [];

    switch (type) {
        case 'categoryWiseSales':
            title = 'Category';
            columns = getReportsColumns('categoryWiseSales');
            break;
        case 'debtorWiseSales':
            title = 'Debtor';
            columns = getReportsColumns('debtorWiseSales');
            break;
        case 'stockWiseSales':
            title = 'Stock';
            columns = getReportsColumns('stockWiseSales');
            break;
        default:
            title = '';
    }

    return {
        title,
        columns,
    };
}
