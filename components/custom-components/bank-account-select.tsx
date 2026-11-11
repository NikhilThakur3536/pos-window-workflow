import { useCallback, useEffect, useMemo, useState } from 'react';
import SelectPopover from '@/components/select-popover';
import { useGetEligibleBankAccounts, type BankAccountDetails } from '@/api-queries/bank-account/bank-accounts';

const PAGE_SIZE = 25;

export const bankAccountLabel = (account: Pick<BankAccountDetails, 'name' | 'bankName' | 'accountNumber'>) =>
    `${account.name} — ${account.bankName} — ${account.accountNumber}`;

interface BankAccountSelectProps {
    /** Selected bank account `id` (the value to send as `bankAccountId`). */
    value?: string;
    onChange: (id: string, account?: BankAccountDetails) => void;
    disabled?: boolean;
    enabled?: boolean;
}

/**
 * Cash Office bank account dropdown backed by /api/company/bankAccount/eligible
 * (active accounts only) with server-side search and "Load more" pagination.
 * The selected account's `id` is the only thing ever exposed as the value.
 */
const BankAccountSelect = ({ value, onChange, disabled, enabled = true }: BankAccountSelectProps) => {
    const [search, setSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const [loaded, setLoaded] = useState<BankAccountDetails[]>([]);
    const [selectedCache, setSelectedCache] = useState<BankAccountDetails | undefined>();

    const query = useGetEligibleBankAccounts({ search, limit: PAGE_SIZE, offset }, enabled);
    const rows = query.data?.data?.rows;
    const count = query.data?.data?.count ?? 0;

    // Accumulate pages; reset happens in handleSearch.
    useEffect(() => {
        if (!rows) return;
        setLoaded((prev) => {
            if (offset === 0) return rows;
            const seen = new Set(prev.map((r) => r.id));
            return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
    }, [rows, offset]);

    const handleSearch = useCallback((text: string) => {
        setSearch(text);
        setOffset(0);
        setLoaded([]);
    }, []);

    const options = useMemo(() => {
        const list = [...loaded];
        // Keep the chosen account visible even when a search hides it.
        if (selectedCache && value === selectedCache.id && !list.some((a) => a.id === selectedCache.id)) {
            list.unshift(selectedCache);
        }
        return list.map((a) => ({ value: a.id, label: bankAccountLabel(a) }));
    }, [loaded, selectedCache, value]);

    const isEmpty = !query.isLoading && !query.isFetching && !search && loaded.length === 0 && count === 0;

    return (
        <div className="space-y-1">
            <SelectPopover
                title="Bank Account"
                onlyTitle="Select bank account"
                wrapperClass="min-w-0"
                selectedValue={value || ''}
                options={options}
                disabled={disabled}
                onSearch={handleSearch}
                isSearching={query.isFetching}
                hasMore={loaded.length < count}
                onLoadMore={() => setOffset(loaded.length)}
                onSelect={(id) => {
                    const account = loaded.find((a) => a.id === id) ?? (selectedCache?.id === id ? selectedCache : undefined);
                    setSelectedCache(account);
                    onChange(id ? String(id) : '', account);
                }}
            />
            {isEmpty && (
                <p className="text-xs text-amber-600">No active bank account found. Ask an administrator to add one.</p>
            )}
        </div>
    );
};

export default BankAccountSelect;
