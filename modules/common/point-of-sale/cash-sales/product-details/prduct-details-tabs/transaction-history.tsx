import { useMemo } from 'react';
import { ListOnlyTable } from '@/components/list-only-table';
import {
    type TransactionHistoryData,
    DUMMY_TRANSACTION_HISTORY,
} from '../../../../../dummy-data/product-details-dummy-data';
import { useAuthUser } from '@/stores/auth-user.store';

type TransactionHistoryProps = {};

export default function TransactionHistory({}: TransactionHistoryProps) {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const transactionColumns = useMemo(
        () => [
            { key: 'date', label: 'Date', className: 'w-[100px]' },
            { key: 'account', label: 'Account', className: 'w-[80px]' },
            { key: 'accountName', label: 'Account Name', className: 'flex-1' },
            { key: 'reference', label: 'Reference', className: 'w-[100px]' },
            { key: 'code', label: 'Code', className: 'w-[80px]' },
            {
                key: 'priceInc',
                label: 'Price(Inc)',
                className: 'w-[80px] text-right',
                render: (row: TransactionHistoryData) => `${currencySymbol} ${row.priceInc.toFixed(2)}`,
            },
            {
                key: 'priceExc',
                label: 'Price(Exc)',
                className: 'w-[80px] text-right',
                render: (row: TransactionHistoryData) => `${currencySymbol} ${row.priceExc.toFixed(2)}`,
            },
            { key: 'quantity', label: 'Quantity', className: 'w-[70px] text-right' },
            {
                key: 'discount',
                label: 'Discount %',
                className: 'w-[80px] text-right',
                render: (row: TransactionHistoryData) => `${row.discount.toFixed(2)}%`,
            },
        ],
        [],
    );

    return <ListOnlyTable columns={transactionColumns} data={DUMMY_TRANSACTION_HISTORY} />;
}
