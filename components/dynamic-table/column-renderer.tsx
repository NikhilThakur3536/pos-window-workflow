import type { ColumnConfig } from '../../types/table.types';
import { Badge } from '../ui/badge';

interface ColumnRendererProps {
    column: ColumnConfig;
    value: any;
    row: any;
    onAction?: (action: string, row: any) => void;
}

export function ColumnRenderer({ column, value, row, onAction }: ColumnRendererProps) {
    switch (column.type) {
        case 'text':
            return <span>{value}</span>;
        case 'number':
            return <span>{value}</span>;
        case 'date':
            return <span>{value ? new Date(value).toLocaleDateString() : ''}</span>;
        case 'currency':
            return (
                <span>
                    {typeof value === 'number'
                        ? value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
                        : value}
                </span>
            );
        case 'percentage':
            return <span>{typeof value === 'number' ? `${value}%` : value}</span>;
        case 'boolean':
            return <span>{value ? 'Yes' : 'No'}</span>;
        case 'badge':
            return <Badge>{value}</Badge>;
        // case "actions":
        //   return <TableActions actions={column.actions || []} row={row} onAction={onAction} />;
        case 'link':
            return value ? (
                <a href={value} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                    {value}
                </a>
            ) : null;
        default:
            return <span>{value}</span>;
    }
}
