import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import SelectPopover from '@/components/select-popover';
import BankAccountSelect, { bankAccountLabel } from '@/components/custom-components/bank-account-select';
import { AlertCircle, CheckCheck, Landmark, Plus, Undo2 } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import moment from 'moment';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import {
    useGetCashOfficeConfigurations,
    useGetCashOfficeSessionCurrent,
    useGetCashOfficeBankList,
    useCreateCashOfficeBank,
    usePostCashOfficeBank,
    useConfirmCashOfficeWithdrawal,
    useReverseCashOfficeTransaction,
    generateCashOfficeDocumentId,
    type CashOfficeConfiguration,
    type CashOfficeTransaction,
    type CreateCashOfficeBankInput,
} from '@/api-queries/cash-office';
import { useAuthUser } from '@/stores/auth-user.store';
import { CashOfficeStatusBadge, cashOfficeTransactionStatus, formatMoney, formatDate, isCashOfficeSessionOpen, isTransactionRowSessionOpen } from './shared';

const BankingModule = () => {
    const userType = useAuthUser((state) => state.user?.userType);
    const myDebtorId = useAuthUser((state) => state.user?.companyDebtorId) || '';
    const myWarehouseId = useAuthUser((state) => state.user?.warehouseId) || '';
    const isDebtorUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const initialFilters = { cashOfficeId: '', bankType: '', dateFrom: '', dateTo: '' };
    const { filters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<typeof initialFilters>(initialFilters);

    const configsQuery = useGetCashOfficeConfigurations({
        ...(isDebtorUser ? { companyDebtorId: myDebtorId } : {}),
        ...(isWarehouseUser ? { companyWarehouseId: myWarehouseId } : {}),
        limit: 200,
        offset: 0,
    });
    const configs: CashOfficeConfiguration[] = configsQuery?.data?.data?.rows || [];

    const currentSession = useGetCashOfficeSessionCurrent(appliedFilters.cashOfficeId);
    const sessionOpen = isCashOfficeSessionOpen(currentSession?.data?.data?.status);
    const openSessionId = sessionOpen ? currentSession?.data?.data?.id || null : null;

    const listQuery = useGetCashOfficeBankList({
        ...(appliedFilters.cashOfficeId && openSessionId ? { cashOfficeSessionId: openSessionId } : {}),
        ...(appliedFilters.dateFrom ? { dateFrom: appliedFilters.dateFrom } : {}),
        ...(appliedFilters.dateTo ? { dateTo: appliedFilters.dateTo } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });
    const serverRows: CashOfficeTransaction[] = listQuery?.data?.data?.rows || [];
    const serverTotalRowCount = listQuery?.data?.data?.count || 0;
    const rows = appliedFilters.bankType
        ? serverRows.filter((row) => row.transactionType === appliedFilters.bankType)
        : serverRows;
    const totalRowCount = appliedFilters.bankType ? rows.length : serverTotalRowCount;

    const createMut = useCreateCashOfficeBank();
    const postMut = usePostCashOfficeBank();
    const confirmMut = useConfirmCashOfficeWithdrawal();
    const reverseMut = useReverseCashOfficeTransaction();

    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const pendingMetaRef = useRef<Record<string, unknown> | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({
        transactionType: 'BANK_DEPOSIT',
        cashAmount: '',
        chequeAmount: '',
        bankAccountId: '',
        bankReference: '',
        bankTransactionDate: moment().format('YYYY-MM-DD'),
    });

    const runApprovalAware = (
        actionLabel: string,
        payload: Record<string, unknown>,
        mutate: (p: Record<string, unknown>) => Promise<{ success: boolean; message: string }>,
        onSuccess: () => void,
    ) => {
        mutate(payload)
            .then((data) => {
                if (data?.success === false) {
                    toast.error(data?.message || 'Action failed');
                    return;
                }
                onSuccess();
            })
            .catch((error: unknown) => {
                const info = isApprovalRequiredError(error);
                if (info) {
                    pendingMetaRef.current = payload;
                    setApproval({ ...info, actionLabel });
                } else {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const runRetry = (token?: string) => {
        const meta = pendingMetaRef.current;
        if (!meta) {
            closeApproval();
            return;
        }
        const action = meta.__action;
        const payload = token ? ({ ...meta, approvalToken: token } as Record<string, unknown>) : meta;
        delete payload.__action;
        delete payload.__label;
        const mutate = (p: Record<string, unknown>) => {
            if (action === 'post')
                return postMut.mutateAsync({ cashOfficeTransactionId: String(p.cashOfficeTransactionId), approvalToken: p.approvalToken as string | undefined });
            if (action === 'confirm')
                return confirmMut.mutateAsync({ cashOfficeTransactionId: String(p.cashOfficeTransactionId), approvalToken: p.approvalToken as string | undefined });
            if (action === 'reverse')
                return reverseMut.mutateAsync({
                    cashOfficeTransactionId: String(p.cashOfficeTransactionId),
                    reason: p.reason ? String(p.reason) : undefined,
                    // Reuse the reference captured when the action first ran.
                    clientDocumentId: String(p.clientDocumentId),
                    approvalToken: p.approvalToken as string | undefined,
                });
            return Promise.resolve({ success: false, message: 'Unknown action' });
        };
        mutate(payload)
            .then((data) => {
                closeApproval();
                pendingMetaRef.current = null;
                if (data?.success === false) {
                    toast.error(data?.message || 'Action failed');
                    return;
                }
                toast.success(String(meta.__label || 'Action completed'));
            })
            .catch((error: unknown) => {
                const info = isApprovalRequiredError(error);
                if (info) {
                    setApproval({ ...info, actionLabel: String(meta.__label || 'Action') });
                } else {
                    closeApproval();
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleApproved = (token: string) => runRetry(token);

    const handleCreate = () => {
        if (!openSessionId) return toast.error('Open a Cash Office session first.');
        const cashAmount = Number(form.cashAmount) || 0;
        const chequeAmount = Number(form.chequeAmount) || 0;
        const amount = cashAmount + chequeAmount;
        if (amount <= 0) return toast.error('Enter a cash and/or cheque amount');
        if (!form.bankAccountId) return toast.error('Please select a bank account.');
        const payload: CreateCashOfficeBankInput = {
            cashOfficeSessionId: openSessionId,
            transactionType: form.transactionType as 'BANK_DEPOSIT' | 'BANK_WITHDRAWAL',
            cashAmount,
            chequeAmount,
            amount,
            bankAccountId: form.bankAccountId,
            bankReference: form.bankReference.trim() || undefined,
            bankTransactionDate: moment(form.bankTransactionDate).toISOString(),
            clientDocumentId: generateCashOfficeDocumentId(form.transactionType === 'BANK_DEPOSIT' ? 'CO-DEP' : 'CO-WDL'),
        };
        createMut.mutate(payload, {
            onSuccess: (data) => {
                if (data?.success === false) {
                    toast.error(data?.message || 'Create failed');
                    return;
                }
                toast.success(form.transactionType === 'BANK_DEPOSIT' ? 'Bank deposit created' : 'Bank withdrawal created');
                setCreateOpen(false);
                setForm({ ...form, cashAmount: '', chequeAmount: '', bankReference: '', bankAccountId: '' });
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    const postRow = (row: CashOfficeTransaction) => {
        runApprovalAware('Post Bank Entry', { cashOfficeTransactionId: row.id, __action: 'post', __label: 'Bank entry posted' }, (p) => {
            const { __action, __label, approvalToken, ...rest } = p;
            void __action;
            void __label;
            void approvalToken;
            return postMut.mutateAsync(rest as { cashOfficeTransactionId: string });
        }, () => toast.success('Bank entry posted'));
    };

    const confirmRow = (row: CashOfficeTransaction) => {
        runApprovalAware('Confirm Withdrawal', { cashOfficeTransactionId: row.id, __action: 'confirm', __label: 'Withdrawal confirmed' }, (p) => {
            const { __action, __label, approvalToken, ...rest } = p;
            void __action;
            void __label;
            void approvalToken;
            return confirmMut.mutateAsync(rest as { cashOfficeTransactionId: string });
        }, () => toast.success('Withdrawal confirmed'));
    };

    const reverseRow = (row: CashOfficeTransaction) => {
        runApprovalAware('Reverse Bank Entry', {
            cashOfficeTransactionId: row.id,
            clientDocumentId: generateCashOfficeDocumentId('CO-BKREV'),
            __action: 'reverse',
            __label: 'Bank entry reversed',
        }, (p) => {
            const { __action, __label, approvalToken, ...rest } = p;
            void __action;
            void __label;
            void approvalToken;
            return reverseMut.mutateAsync(rest as Parameters<typeof reverseMut.mutateAsync>[0]);
        }, () => toast.success('Bank entry reversed'));
    };

    const columns: ColumnDef<CashOfficeTransaction>[] = [
        { accessorKey: 'clientDocumentId', header: 'Reference', cell: ({ row }) => <div className="font-semibold">{row.original.clientDocumentId || '—'}</div> },
        { accessorKey: 'transactionType', header: 'Type', cell: ({ row }) => <div>{String(row.original.transactionType || '—').replace('_', ' ')}</div> },
        { accessorKey: 'bankAccountId', header: 'Bank Account', cell: ({ row }) => <div className="max-w-[260px] truncate">{row.original.bankAccount ? bankAccountLabel(row.original.bankAccount) : '—'}</div> },
        { accessorKey: 'bankReference', header: 'Bank Ref / Slip', cell: ({ row }) => <div className="max-w-[160px] truncate">{row.original.bankReference || row.original.depositSlipUrl || '—'}</div> },
        { accessorKey: 'cashAmount', header: 'Cash', cell: ({ row }) => <div>{formatMoney(row.original.cashAmount || 0)}</div> },
        { accessorKey: 'chequeAmount', header: 'Cheque', cell: ({ row }) => <div>{formatMoney(row.original.chequeAmount || 0)}</div> },
        { accessorKey: 'amount', header: 'Total', cell: ({ row }) => <div className="font-semibold">{formatMoney(row.original.amount ?? (row.original.cashAmount || 0))}</div> },
        { accessorKey: 'bankTransactionDate', header: 'Bank Date', cell: ({ row }) => <div>{formatDate(row.original.bankTransactionDate)}</div> },
        { id: 'status', header: 'Status', cell: ({ row }) => <CashOfficeStatusBadge status={cashOfficeTransactionStatus(row.original)} /> },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const s = cashOfficeTransactionStatus(row.original);
                const rowSessionOpen = isTransactionRowSessionOpen(row.original, sessionOpen);
                const isWithdrawal = row.original.transactionType === 'BANK_WITHDRAWAL';
                const canDecide =
                    s === 'SUBMITTED' || s === 'DRAFT' || s === 'PENDING_APPROVAL' || s === 'APPROVED';
                return (
                    <div className="flex flex-wrap justify-end gap-1">
                        {canDecide && rowSessionOpen && !isWithdrawal ? (
                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => postRow(row.original)}>
                                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Post
                            </Button>
                        ) : null}
                        {canDecide && rowSessionOpen && isWithdrawal ? (
                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => confirmRow(row.original)}>
                                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Confirm
                            </Button>
                        ) : null}
                        {(s === 'POSTED' || s === 'IN_TRANSIT') && rowSessionOpen ? (
                            <Button variant="destructive" size="sm" className="h-8" onClick={() => reverseRow(row.original)}>
                                <Undo2 className="mr-1 h-3.5 w-3.5" /> Reverse
                            </Button>
                        ) : null}
                    </div>
                );
            },
        },
    ];

    return (
        <PageLoader isLoading={listQuery.isLoading || configsQuery.isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={listQuery}
                    data={rows}
                    columns={columns}
                    totalRowCount={totalRowCount}
                    pagination={pagination}
                    setPagination={setPagination}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <SelectPopover
                                title="Cash Office"
                                onlyTitle="All cash offices"
                                selectedValue={filters.cashOfficeId}
                                options={[
                                    { label: 'All cash offices', value: '' },
                                    ...configs.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
                                ]}
                                onSelect={(val) => handleFilters({ ...filters, cashOfficeId: String(val || '') })}
                            />
                            <SelectPopover
                                title="Type"
                                onlyTitle="All movements"
                                selectedValue={filters.bankType}
                                options={[
                                    { label: 'All movements', value: '' },
                                    { label: 'Bank Deposit', value: 'BANK_DEPOSIT' },
                                    { label: 'Bank Withdrawal', value: 'BANK_WITHDRAWAL' },
                                ]}
                                onSelect={(val) => handleFilters({ ...filters, bankType: String(val || '') })}
                            />
                            <div className="flex items-center gap-1">
                                <Label className="text-xs text-muted-foreground">From</Label>
                                <Input
                                    type="date"
                                    className="h-8 w-[150px]"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilters({ ...filters, dateFrom: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <Label className="text-xs text-muted-foreground">To</Label>
                                <Input
                                    type="date"
                                    className="h-8 w-[150px]"
                                    value={filters.dateTo}
                                    onChange={(e) => handleFilters({ ...filters, dateTo: e.target.value })}
                                />
                            </div>
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={() => clearFilters()}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!sessionOpen}
                            title={sessionOpen ? undefined : 'Open a Cash Office session first.'}
                            onClick={() => setCreateOpen(true)}
                        >
                            <Plus className="mr-1 h-4 w-4" /> New Bank Entry
                        </Button>
                    </div>
                    <div className="text-lg font-bold">Bank Deposits & Withdrawals</div>
                </DataTable>

                {appliedFilters.cashOfficeId && !currentSession.isLoading && !sessionOpen ? (
                    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <AlertCircle className="h-4 w-4" />
                        Open a Cash Office session first.
                    </div>
                ) : null}
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Bank Entry</DialogTitle>
                        <DialogDescription>
                            {openSessionId ? 'Records a deposit or withdrawal against the open session.' : 'Open a Cash Office session first.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Type</Label>
                                <SelectPopover
                                    title="Type"
                                    onlyTitle="Select type"
                                    selectedValue={form.transactionType}
                                    options={[
                                        { label: 'Bank Deposit', value: 'BANK_DEPOSIT' },
                                        { label: 'Bank Withdrawal', value: 'BANK_WITHDRAWAL' },
                                    ]}
                                    onSelect={(val) => setForm({ ...form, transactionType: String(val || 'BANK_DEPOSIT') })}
                                />
                            </div>
                            <div>
                                <Label>Bank Transaction Date</Label>
                                <Input type="date" value={form.bankTransactionDate} onChange={(e) => setForm({ ...form, bankTransactionDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Cash Amount</Label>
                                <Input type="number" value={form.cashAmount} onChange={(e) => setForm({ ...form, cashAmount: e.target.value })} />
                            </div>
                            <div>
                                <Label>Cheque Amount</Label>
                                <Input type="number" value={form.chequeAmount} onChange={(e) => setForm({ ...form, chequeAmount: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Bank Account</Label>
                                <BankAccountSelect
                                    enabled={createOpen}
                                    value={form.bankAccountId}
                                    onChange={(id) => setForm({ ...form, bankAccountId: id })}
                                />
                            </div>
                            <div>
                                <Label>Bank Reference</Label>
                                <Input value={form.bankReference} onChange={(e) => setForm({ ...form, bankReference: e.target.value })} placeholder="Deposit slip / cheque no" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Landmark className="h-4 w-4" /> Total = cash + cheque; withdrawals require confirmation before posting.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" disabled={createMut.isPending || !openSessionId} onClick={handleCreate}>
                            {createMut.isPending ? 'Creating...' : 'Create Bank Entry'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                approverGroupName={approval?.approverGroupName}
                scopeLabel={approval?.scopeLabel}
                expiresAt={approval?.expiresAt}
                onApproved={handleApproved}
            />
        </PageLoader>
    );
};

export default BankingModule;