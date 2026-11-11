import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetBankAccountTypes } from '@/api-queries/bank-account';
import { bankAccountTypes } from '@/lib/constant';

interface BankAccountTypeSelectProps {
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const BankAccountTypeSelect = ({
    value,
    onValueChange,
    placeholder = 'Select account type',
    className,
}: BankAccountTypeSelectProps) => {
    const query = useGetBankAccountTypes({ status: 'ACTIVE', limit: 200, offset: 0 });
    const rows = query?.data?.data?.rows || [];

    const options = useMemo(() => {
        if (rows.length > 0) {
            return rows.map((row) => ({ value: row.code, label: row.description || row.code }));
        }
        return bankAccountTypes.map((type) => ({ value: type, label: type }));
    }, [rows]);

    return (
        <Select onValueChange={onValueChange} value={value}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default BankAccountTypeSelect;