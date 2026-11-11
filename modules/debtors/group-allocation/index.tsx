'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/dynamic-table/data-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useAuthUser } from '@/stores/auth-user.store';
import SelectPopover from '@/components/select-popover';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import {
    useGetGroupEligibleInvoices,
    toGroupEligibleInvoices,
    useAllocateReceiptToGroup,
    useGetGroupAllocationHistory,
    toGroupAllocationBatches,
    useGetGroupAllocationBatch,
    useReverseGroupAllocationBatch,
    GroupEligibleInvoice,
    GroupAllocationBatch,
} from '@/api-queries/debtor-receipt-allocation';
import { useGetDebtorReceipts, DebtorReceiptDetails } from '@/api-queries/debtor/receipts';
import { useGetActiveDebtorGroups } from '@/api-queries/debtor/company-debtor-group';
import type { ColumnDef } from '@tanstack/react-table';
import { TableHeaderToggle } from '@/components/table';
import {
    ArrowRightLeft,
    Calendar as CalendarIcon,
    CheckCircle2,
    Eye,
    Landmark,
    RotateCcw,
    UsersRound,
    Wallet,
} from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import { generateUUIDForData } from '@/utils/helpers';

const DatePickerField = ({
    value,
    onChange,
    placeholder = 'Select date',
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) => {
    const [open, setOpen] = useState(false);
    const selected = value ? moment(value, 'YYYY-MM-DD').toDate() : undefined;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'h-8 w-40 justify-start gap-2 px-3 text-left text-xs font-normal',
                        !value && 'text-muted-foreground',
                    )}
                >
                    <CalendarIcon className="h-4 w-4 text-blue-600" />
                    {value ? moment(value).format('DD/MM/YYYY') : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(date) => {
                        onChange(date ? moment(date).format('YYYY-MM-DD') : '');
                        setOpen(false);
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
};

// The batch endpoints embed receipt / sourceDebtor / group / user objects but may
// also fall back to flat strings, so read them defensively.
const party = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const text = (value: unknown, ...keys: string[]): string => {
    if (typeof value === 'string') return value;
    const record = party(value);
    if (!record) return '';
    for (const key of keys) {
        const field = record[key];
        if (field !== undefined && field !== null && field !== '') return String(field);
    }
    return '';
};

const personLabel = (value: unknown): string => {
    const direct = text(value, 'name', 'displayName', 'email');
    if (direct) return direct;
    const record = party(value);
    const name = [record?.firstName, record?.surname].filter(Boolean).join(' ');
    return name;
};

const groupLabel = (value: unknown, fallback?: unknown): string => {
    const code = text(value, 'groupId', 'groupCode', 'code');
    const description = text(value, 'description', 'name') || text(fallback);
    if (code && description) return `${code} - ${description}`;
    return code || description;
};

const GroupAllocationModule = () => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    // Receipt selection
    const [selectedReceipt, setSelectedReceipt] = useState<DebtorReceiptDetails | null>(null);
    const [receiptSearch, setReceiptSearch] = useState('');

    // Eligible group invoices + allocation amounts
    const [allocationMap, setAllocationMap] = useState<Record<string, number>>({});
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    // Confirmation dialog
    const [allocateOpen, setAllocateOpen] = useState(false);
    const [allocationDate, setAllocationDate] = useState(() => moment().format('YYYY-MM-DD'));

    // Result + batch detail / reversal
    const [lastBatch, setLastBatch] = useState<GroupAllocationBatch | null>(null);
    const [detailId, setDetailId] = useState<string | null>(null);
    const [reverseTarget, setReverseTarget] = useState<GroupAllocationBatch | null>(null);
    const [reverseReason, setReverseReason] = useState('');

    // History filters
    const [historyFrom, setHistoryFrom] = useState('');
    const [historyTo, setHistoryTo] = useState('');
    const [historyStatus, setHistoryStatus] = useState('');
    const [historyDebtorReceiptId, setHistoryDebtorReceiptId] = useState<string | null>(null);
    const [historyCompanyDebtorGroupId, setHistoryCompanyDebtorGroupId] = useState<string | null>(null);

    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const allocateMut = useAllocateReceiptToGroup();
    const reverseMut = useReverseGroupAllocationBatch();
    const debtorGroupsQuery = useGetActiveDebtorGroups();
    const debtorGroupOptions = (debtorGroupsQuery.data?.data?.rows || []).map((g: any) => ({
        value: g.id,
        label: g.groupId ? `${g.groupId}${g.description ? ' - ' + g.description : ''}` : g.description || g.id,
    }));

    // Candidate receipts with unallocated balance
    const receiptsQuery = useGetDebtorReceipts({
        isAllocationPending: true,
        limit: 100,
        search: receiptSearch || undefined,
    });
    const receiptOptions = (receiptsQuery.data?.data?.rows || []).filter((r) => (r.unallocatedAmount || 0) > 0);
    const allReceiptsQuery = useGetDebtorReceipts({ limit: 200 });
    const receiptFilterOptions = (allReceiptsQuery.data?.data?.rows || []).map((r: any) => {
        const receiptNumber =
            r.receiptNumber ||
            r.referenceNumber ||
            r.number ||
            r.receipt?.referenceNumber ||
            r.receipt?.receiptNumber ||
            r.reference;
        const label = receiptNumber ? `${receiptNumber}` : r.id;
        return { value: r.id, label };
    });

    // Eligible invoices in the receipt's debtor group
    const eligibleQuery = useGetGroupEligibleInvoices(
        selectedReceipt ? { debtorReceiptId: selectedReceipt.id, limit: 200 } : null,
    );
    const eligibleData = eligibleQuery.data?.data;
    const eligibleInvoices = useMemo(() => toGroupEligibleInvoices(eligibleData), [eligibleData]);

    const backendGroup = useMemo(() => {
        if (!eligibleData || Array.isArray(eligibleData)) return null;
        return (eligibleData as any).group || null;
    }, [eligibleData]);

    const activeDebtors = useMemo(() => {
        if (!eligibleData || Array.isArray(eligibleData)) return [];
        return (eligibleData as any).activeDebtors || [];
    }, [eligibleData]);

    // Resolve the debtor group to allocate against
    const groupOptions = useMemo(() => {
        const groups = new Map<string, string>();
        if (backendGroup?.id) {
            groups.set(
                backendGroup.id,
                backendGroup.groupId
                    ? `${backendGroup.groupId}${backendGroup.description ? ` - ${backendGroup.description}` : ''}`
                    : backendGroup.description || backendGroup.id,
            );
        }
        eligibleInvoices.forEach((invoice) => {
            const groupId = invoice.companyDebtorGroupId || invoice.debtorGroupId;
            if (groupId) {
                const existing = groups.get(groupId);
                const debtorLabel = invoice.debtorName ? `${invoice.debtorName}` : '';
                groups.set(groupId, existing ? `${existing}, ${debtorLabel}` : debtorLabel || groupId);
            }
        });
        return Array.from(groups.entries()).map(([value, label]) => ({ value, label: label || value }));
    }, [eligibleInvoices, backendGroup]);

    const effectiveGroupId =
        selectedGroupId ||
        backendGroup?.id ||
        groupOptions[0]?.value ||
        selectedReceipt?.CompanyDebtor?.companyDebtorGroupId ||
        selectedReceipt?.CompanyDebtor?.CompanyCreditorSetting?.debtorGroupId ||
        '';
    const effectiveGroupName = eligibleData?.groupName;

    // Authoritative receipt unallocated amount: backend /eligible endpoint can provide the current balance
    const receiptUnallocated = useMemo(() => {
        if (eligibleData && !Array.isArray(eligibleData)) {
            if (typeof (eligibleData as any).unallocatedAmount === 'number') {
                return Number((eligibleData as any).unallocatedAmount);
            }
            if (typeof (eligibleData as any).receipt?.unallocatedAmount === 'number') {
                return Number((eligibleData as any).receipt.unallocatedAmount);
            }
        }
        return Number(selectedReceipt?.unallocatedAmount || 0);
    }, [eligibleData, selectedReceipt]);

    // Allocation totals
    const totalAllocated = useMemo(
        () =>
            eligibleInvoices.reduce((sum, invoice) => {
                const invoiceId = invoice.debtorInvoicingOrderId || invoice.id;
                return sum + (invoiceId ? Number(allocationMap[invoiceId] || 0) : 0);
            }, 0),
        [eligibleInvoices, allocationMap],
    );
    const isOverAllocated = totalAllocated > receiptUnallocated;

    const setInvoiceAmount = (invoiceId: string, value: string) => {
        const parsed = Number(value);
        setAllocationMap((prev) => {
            const next = { ...prev };
            if (isNaN(parsed) || parsed <= 0) delete next[invoiceId];
            else next[invoiceId] = parsed;
            return next;
        });
    };

    const resetFlow = () => {
        setSelectedReceipt(null);
        setAllocationMap({});
        setSelectedGroupId(null);
        setLastBatch(null);
        setAllocationDate(moment().format('YYYY-MM-DD'));
    };

    // History. The two ids are always sent to the backend: explicit filter
    // selection wins, falling back to the receipt / debtor group currently in
    // context from the allocation steps above.
    const historyQuery = useGetGroupAllocationHistory({
        status: historyStatus || undefined,
        fromDate: historyFrom || undefined,
        toDate: historyTo || undefined,
        debtorReceiptId: historyDebtorReceiptId || selectedReceipt?.id || undefined,
        companyDebtorGroupId: historyCompanyDebtorGroupId || effectiveGroupId || undefined,
        limit: 50,
        offset: 0,
    });
    const historyRows = useMemo(() => toGroupAllocationBatches(historyQuery.data?.data), [historyQuery.data]);
    // The backend list only guarantees limit/offset/status, so apply the remaining
    // filter controls on the returned page as well to keep them honest.
    const filteredHistoryRows = useMemo(() => {
        return historyRows.filter((row) => {
            if (historyDebtorReceiptId) {
                const receiptId = row.debtorReceiptId || text(party(row.receipt)?.id);
                if (receiptId !== historyDebtorReceiptId) return false;
            }
            if (historyCompanyDebtorGroupId) {
                const groupId =
                    row.companyDebtorGroupId || text(party(row.group)?.id) || text(party(row.group)?.groupId);
                if (groupId !== historyCompanyDebtorGroupId) return false;
            }
            if (historyFrom || historyTo) {
                const date = row.allocationDate ? moment(row.allocationDate).format('YYYY-MM-DD') : '';
                if (!date) return false;
                if (historyFrom && date < historyFrom) return false;
                if (historyTo && date > historyTo) return false;
            }
            return true;
        });
    }, [historyRows, historyDebtorReceiptId, historyCompanyDebtorGroupId, historyFrom, historyTo]);
    const detailQuery = useGetGroupAllocationBatch(detailId);
    const allocationDetail = detailQuery.data?.data;
    // /group/get returns the allocation lines under rows[] (items[] kept as fallback).
    const detailRows = allocationDetail?.rows ?? allocationDetail?.items ?? [];
    // The get payload flags a reversed batch with `reversed` instead of status.
    const detailStatus =
        allocationDetail?.reversed === true
            ? 'REVERSED'
            : String(allocationDetail?.status || 'ACTIVE').toUpperCase();
    const detailCanReverse =
        !!allocationDetail && detailStatus === 'ACTIVE' && !allocationDetail.reversedAt;
    const detailBatchNumber = allocationDetail?.batchNumber || allocationDetail?.allocationNumber || '';

    const runAllocatePayload = (approvalToken?: string) => {
        if (!selectedReceipt) return;
        const allocations = eligibleInvoices
            .filter((invoice) => {
                const id = invoice.debtorInvoicingOrderId || invoice.id;
                return id && Number(allocationMap[id] || 0) > 0;
            })
            .map((invoice) => ({
                debtorInvoicingOrderId: (invoice.debtorInvoicingOrderId || invoice.id) as string,
                allocatedAmount: Number(allocationMap[(invoice.debtorInvoicingOrderId || invoice.id) as string] || 0),
            }));

        return {
            debtorReceiptId: selectedReceipt.id,
            // Unique per submission so a retry cannot double-post the batch.
            clientDocumentId: generateUUIDForData(),
            allocations,
            ...(effectiveGroupId ? { companyDebtorGroupId: effectiveGroupId } : {}),
            allocationDate: allocationDate || moment().format('YYYY-MM-DD'),
            ...(approvalToken ? { approvalToken } : {}),
        };
    };

    const handleAllocateConfirm = () => {
        const payload = runAllocatePayload();
        if (!payload || payload.allocations.length === 0) return;
        allocateMut.mutate(payload, {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success('Group allocation completed');
                    setLastBatch(data?.data || null);
                    setAllocateOpen(false);
                    eligibleQuery.refetch();
                    receiptsQuery.refetch();
                    historyQuery.refetch();
                } else {
                    toast.error(data?.message || 'Allocation failed');
                }
            },
            onError: (error) => handleApproval(error, 'Group Payment Allocation'),
        });
    };

    const runAllocate = (approvalToken: string) => {
        const payload = runAllocatePayload(approvalToken);
        if (!payload || payload.allocations.length === 0) return;
        allocateMut.mutate(payload, {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success('Group allocation completed');
                    setLastBatch(data?.data || null);
                    setAllocateOpen(false);
                    eligibleQuery.refetch();
                    receiptsQuery.refetch();
                    historyQuery.refetch();
                } else {
                    toast.error(data?.message || 'Allocation failed');
                }
            },
            onError: (error) => handleApproval(error, 'Group Payment Allocation'),
        });
    };

    const handleReverseConfirm = () => {
        if (!reverseTarget) return;
        const batchId = reverseTarget.allocationBatchId || reverseTarget.id;
        if (!batchId) return;
        const reason = reverseReason.trim();
        if (!reason) {
            toast.error('Reversal reason is required');
            return;
        }
        reverseMut.mutate(
            {
                allocationBatchId: batchId,
                reason,
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Allocation batch reversed');
                        setReverseTarget(null);
                        setReverseReason('');
                        historyQuery.refetch();
                        if (detailId) detailQuery.refetch();
                        if (selectedReceipt) {
                            eligibleQuery.refetch();
                            receiptsQuery.refetch();
                        }
                    } else {
                        toast.error(data?.message || 'Reverse failed');
                    }
                },
                onError: (error) => handleApproval(error, 'Reverse Group Allocation'),
            },
        );
    };

    const runReverse = (approvalToken: string) => {
        if (!reverseTarget) return;
        const batchId = reverseTarget.allocationBatchId || reverseTarget.id;
        if (!batchId) return;
        const reason = reverseReason.trim();
        if (!reason) {
            toast.error('Reversal reason is required');
            return;
        }
        reverseMut.mutate(
            {
                allocationBatchId: batchId,
                reason,
                approvalToken,
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Allocation batch reversed');
                        setReverseTarget(null);
                        setReverseReason('');
                        historyQuery.refetch();
                        if (detailId) detailQuery.refetch();
                        if (selectedReceipt) {
                            eligibleQuery.refetch();
                            receiptsQuery.refetch();
                        }
                    } else {
                        toast.error(data?.message || 'Reverse failed');
                    }
                },
                onError: (error) => handleApproval(error, 'Reverse Group Allocation'),
            },
        );
    };

    const handleApproval = (error: unknown, actionLabel: string) => {
        const info = isApprovalRequiredError(error);
        if (info) {
            setApproval({ ...info, actionLabel });
        } else {
            // @ts-ignore
            toast.error(error?.response?.data?.message || error?.message || 'Internal Server Error!');
        }
    };

    const eligibleColumns: ColumnDef<GroupEligibleInvoice>[] = [
        {
            accessorKey: 'invoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>Invoice No</TableHeaderToggle>,
        },
        {
            accessorKey: 'createdAt',
            header: (data) => <TableHeaderToggle {...data}>Invoice Date</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.getValue('createdAt') ? moment(String(row.getValue('createdAt'))).format('DD/MM/YYYY') : 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'debtorName',
            header: (data) => <TableHeaderToggle {...data}>Debtor</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.original.debtor?.name || 'N/A'}{' '}
                    {row.original?.debtor?.accountNumber ? (
                        <span className="text-muted-foreground">({row.original.debtor?.accountNumber})</span>
                    ) : null}
                </div>
            ),
        },
        {
            accessorKey: 'outstandingAmount',
            header: (data) => <TableHeaderToggle {...data}>Outstanding</TableHeaderToggle>,
            cell: ({ row }) => {
                const outstanding = Number(
                    row.original.outstandingAmount ?? row.original.unallocatedAmount ?? row.original.unpaidBalance ?? 0,
                );
                return (
                    <div className="font-semibold text-red-700">
                        {currencySymbol} {outstanding.toFixed(2)}
                    </div>
                );
            },
        },
        {
            id: 'allocatedAmount',
            header: () => <div>Allocation Amount</div>,
            cell: ({ row }) => {
                const invoiceId = row.original.debtorInvoicingOrderId || row.original.id;
                if (!invoiceId) return <div>-</div>;
                const outstanding = Number(
                    row.original.outstandingAmount ?? row.original.unallocatedAmount ?? row.original.unpaidBalance ?? 0,
                );
                return (
                    <Input
                        type="number"
                        min={0}
                        max={outstanding}
                        step="0.01"
                        className="h-8 w-32 text-xs"
                        placeholder="0.00"
                        value={allocationMap[invoiceId] || ''}
                        onChange={(e) => setInvoiceAmount(invoiceId, e.target.value)}
                    />
                );
            },
        },
    ];

    const historyColumns: ColumnDef<GroupAllocationBatch>[] = [
        {
            accessorKey: 'allocationNumber',
            header: (data) => <TableHeaderToggle {...data}>Batch No</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="font-medium">
                    {row.original.batchNumber || row.original.allocationBatchId || row.original.id || 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'receiptNumber',
            header: (data) => <TableHeaderToggle {...data}>Receipt</TableHeaderToggle>,
            cell: ({ row }) => {
                const number =
                    text(row.original.receipt, 'referenceNumber', 'receiptNumber') ||
                    text(row.original.receiptNumber) ||
                    'N/A';
                const date = text(row.original.receipt, 'receiptDate') || text(row.original.receiptDate);
                return (
                    <div>
                        <div className="font-medium">{number}</div>
                        {date ? (
                            <div className="text-muted-foreground text-xs">
                                {moment(date).format('DD/MM/YYYY')}
                            </div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            id: 'sourceDebtor',
            header: () => <div>Source Debtor</div>,
            cell: ({ row }) => {
                const name =
                    text(row.original.sourceDebtor, 'name', 'debtorName') ||
                    text(row.original.debtorName) ||
                    'N/A';
                const account =
                    text(row.original.sourceDebtor, 'accountNumber') || text(row.original.accountNumber);
                return (
                    <div>
                        {name} {account ? <span className="text-muted-foreground">({account})</span> : null}
                    </div>
                );
            },
        },
        {
            id: 'group',
            header: () => <div>Debtor Group</div>,
            cell: ({ row }) => (
                <div>{groupLabel(row.original.group, row.original.groupName) || 'N/A'}</div>
            ),
        },
        {
            id: 'invoiceCount',
            header: () => <div>Invoice Count</div>,
            cell: ({ row }) => {
                const count =
                    typeof row.original.allocationCount === 'number'
                        ? row.original.allocationCount
                        : typeof row.original.invoiceCount === 'number'
                          ? row.original.invoiceCount
                          : (row.original.rows?.length ?? row.original.items?.length ?? null);
                return <div>{count ?? 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'totalAllocated',
            header: (data) => <TableHeaderToggle {...data}>Total Allocated</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="font-semibold">
                    {currencySymbol} {Number(row.getValue('totalAllocated') || 0).toFixed(2)}
                </div>
            ),
        },
        {
            accessorKey: 'allocationDate',
            header: (data) => <TableHeaderToggle {...data}>Allocation Date</TableHeaderToggle>,
            cell: ({ row }) =>
                row.getValue('allocationDate') ? (
                    <div>{moment(String(row.getValue('allocationDate'))).format('DD/MM/YYYY')}</div>
                ) : (
                    <div>N/A</div>
                ),
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = String(row.original.status || 'ACTIVE').toUpperCase();
                const reversed = !!row.original.reversedAt || status === 'REVERSED';
                return (
                    <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            reversed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                    >
                        {reversed ? 'REVERSED' : status || 'ACTIVE'}
                    </span>
                );
            },
        },
        {
            id: 'allocatedBy',
            header: () => <div>Allocated By</div>,
            cell: ({ row }) => (
                <div>{personLabel(row.original.allocatedByUser) || text(row.original.allocatedBy) || 'N/A'}</div>
            ),
        },
        {
            id: 'actions',
            header: () => <div>Actions</div>,
            cell: ({ row }) => {
                const batchId = row.original.allocationBatchId || row.original.id;
                const status = String(row.original.status || 'ACTIVE').toUpperCase();
                const canReverse = status === 'ACTIVE' && !row.original.reversedAt;
                return (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailId(batchId || null)}
                            className="flex items-center gap-1"
                        >
                            <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        {canReverse ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => {
                                    setReverseTarget(row.original);
                                    setReverseReason('');
                                }}
                            >
                                <RotateCcw className="h-3.5 w-3.5" /> Reverse
                            </Button>
                        ) : null}
                    </div>
                );
            },
        },
    ];

    const isLoading =
        (eligibleQuery.isLoading && !!selectedReceipt) ||
        historyQuery.isLoading ||
        (detailQuery.isLoading && !!detailId);

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 p-3">
                <div className="text-lg font-bold">Group Debtor Payment Allocation</div>
                <p className="text-muted-foreground text-xs">
                    Allocate a single receipt across invoices belonging to debtors in the same debtor group.
                </p>

                {/* Step 1 - select receipt */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[280px]">
                        <Label className="text-xs">Select Receipt</Label>
                        <SelectPopover
                            title="debtor receipt"
                            selectedValue={selectedReceipt?.id || null}
                            options={receiptOptions.map((r) => ({
                                value: r.id,
                                label: `${r.referenceNumber} (${moment(r.receiptDate).format('DD/MM/YYYY')}) - ${r.CompanyDebtor?.name || ''} - ${currencySymbol}${Number(r.unallocatedAmount || 0).toFixed(2)} unallocated`,
                            }))}
                            onSelect={(val) => {
                                const receipt = receiptOptions.find((r) => r.id === val) || null;
                                setSelectedReceipt(receipt);
                                setAllocationMap({});
                                setSelectedGroupId(null);
                            }}
                            onSearch={setReceiptSearch}
                            isSearching={receiptsQuery.isFetching}
                        />
                    </div>

                    {selectedReceipt ? (
                        <div className="bg-muted/30 flex items-center gap-4 rounded-md border px-3 py-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Wallet className="h-4 w-4 text-blue-600" />
                                <span className="text-muted-foreground">Receipt unallocated:</span>
                                <span className="font-semibold">
                                    {currencySymbol} {receiptUnallocated.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Landmark className="h-4 w-4 text-blue-600" />
                                <span className="text-muted-foreground">Total to allocate:</span>
                                <span
                                    className={`font-semibold ${isOverAllocated ? 'text-red-600' : 'text-green-700'}`}
                                >
                                    {currencySymbol} {totalAllocated.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Step 2 - eligible invoices */}
                {selectedReceipt ? (
                    <>
                        <Separator />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <div className="text-sm font-semibold">
                                    Eligible Invoices (Debtor Group)
                                    {eligibleInvoices.length ? ` - ${eligibleInvoices.length} invoice(s)` : ''}
                                </div>
                                {backendGroup?.groupId || backendGroup?.description ? (
                                    <div className="text-muted-foreground text-xs">
                                        Group:{' '}
                                        <span className="text-foreground font-medium">
                                            {backendGroup.groupId || backendGroup.id}
                                        </span>
                                        {backendGroup.description ? ` (${backendGroup.description})` : ''}
                                        {activeDebtors.length ? ` • ${activeDebtors.length} debtor(s) in group` : ''}
                                    </div>
                                ) : activeDebtors.length ? (
                                    <div className="text-muted-foreground text-xs">
                                        {activeDebtors.length} debtor(s) in group
                                    </div>
                                ) : null}
                            </div>
                            {groupOptions.length ? (
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs">Debtor Group</Label>
                                    <SelectPopover
                                        title="debtor group"
                                        selectedValue={effectiveGroupId}
                                        options={groupOptions}
                                        onSelect={(val) => setSelectedGroupId(val || null)}
                                        wrapperClass="min-w-[220px]"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs">
                                    <UsersRound className="text-muted-foreground h-4 w-4" />
                                    <span className="text-muted-foreground">
                                        Group mapping from receipt debtor:{' '}
                                        <span className="text-foreground font-medium">
                                            {effectiveGroupName ||
                                                'Not assigned - assign companyDebtorGroupId to debtors'}
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {eligibleInvoices.length ? (
                            <>
                                <DataTable
                                    query={eligibleQuery}
                                    data={eligibleInvoices}
                                    columns={eligibleColumns}
                                    totalRowCount={eligibleInvoices.length}
                                />
                                {isOverAllocated ? (
                                    <div className="text-xs font-medium text-red-600">
                                        Total allocation exceeds the receipt unallocated amount ({currencySymbol}{' '}
                                        {receiptUnallocated.toFixed(2)}).
                                    </div>
                                ) : null}
                                <div className="flex items-center justify-end">
                                    <Button
                                        className="flex items-center gap-1"
                                        disabled={
                                            totalAllocated <= 0 ||
                                            isOverAllocated ||
                                            allocateMut.isPending ||
                                            !effectiveGroupId
                                        }
                                        onClick={() => setAllocateOpen(true)}
                                    >
                                        <ArrowRightLeft className="h-4 w-4" /> Allocate {currencySymbol}{' '}
                                        {totalAllocated.toFixed(2)}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <Card>
                                <CardContent className="text-muted-foreground p-6 text-center text-sm">
                                    {eligibleQuery.isLoading
                                        ? 'Fetching eligible invoices...'
                                        : 'No invoices are eligible for allocation against this receipt. Ensure the relevant debtors have companyDebtorGroupId assigned.'}
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : null}

                {/* Step 3 - history */}
                <Separator />
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="text-sm font-semibold">Allocation Batch History</div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <div className="text-muted-foreground text-xs font-medium">Debtor Receipt</div>
                            <SelectPopover
                                title="debtor receipt"
                                onlyTitle="All receipts"
                                selectedValue={historyDebtorReceiptId}
                                options={receiptFilterOptions}
                                onSelect={(value) => setHistoryDebtorReceiptId(value || null)}
                                wrapperClass="min-w-[200px]"
                                selectClass="h-8 text-xs"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="text-muted-foreground text-xs font-medium">Debtor Group</div>
                            <SelectPopover
                                title="debtor group"
                                onlyTitle="All groups"
                                selectedValue={historyCompanyDebtorGroupId}
                                options={debtorGroupOptions}
                                onSelect={(value) => setHistoryCompanyDebtorGroupId(value || null)}
                                wrapperClass="min-w-[200px]"
                                selectClass="h-8 text-xs"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="text-muted-foreground text-xs font-medium">Status</div>
                            <select
                                value={historyStatus}
                                onChange={(e) => setHistoryStatus(e.target.value)}
                                className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                            >
                                <option value="">All</option>
                                <option value="ACTIVE">Active</option>
                                <option value="REVERSED">Reversed</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="text-muted-foreground text-xs font-medium">From</div>
                            <DatePickerField value={historyFrom} onChange={setHistoryFrom} placeholder="From date" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="text-muted-foreground text-xs font-medium">To</div>
                            <DatePickerField value={historyTo} onChange={setHistoryTo} placeholder="To date" />
                        </div>
                    </div>
                </div>
                <DataTable
                    query={historyQuery}
                    data={filteredHistoryRows}
                    columns={historyColumns}
                    totalRowCount={filteredHistoryRows.length}
                />
            </div>

            {/* Confirm allocation */}
            <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Group Allocation</DialogTitle>
                        <DialogDescription>
                            {selectedReceipt?.referenceNumber || 'Selected receipt'} will be allocated across{' '}
                            {
                                eligibleInvoices.filter((invoice) => {
                                    const id = invoice.debtorInvoicingOrderId || invoice.id;
                                    return id && Number(allocationMap[id] || 0) > 0;
                                }).length
                            }{' '}
                            invoice(s) in the selected debtor group.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Receipt unallocated:</span>
                                <span className="font-medium">
                                    {currencySymbol} {receiptUnallocated.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Total to allocate:</span>
                                <span className="font-semibold text-green-700">
                                    {currencySymbol} {totalAllocated.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Allocation Date</Label>
                            <Input
                                type="date"
                                className="h-8 text-xs"
                                value={allocationDate}
                                onChange={(e) => setAllocationDate(e.target.value)}
                            />
                        </div>
                        <div className="max-h-48 space-y-1 overflow-auto rounded-md border p-2 text-xs">
                            {eligibleInvoices
                                .filter((invoice) => {
                                    const id = invoice.debtorInvoicingOrderId || invoice.id;
                                    return id && Number(allocationMap[id] || 0) > 0;
                                })
                                .map((invoice) => (
                                    <div
                                        key={invoice.debtorInvoicingOrderId || invoice.id}
                                        className="flex items-center justify-between border-b py-1 last:border-0"
                                    >
                                        <span>
                                            {invoice.invoiceNumber || 'Invoice'} - {invoice.debtorName || ''}
                                        </span>
                                        <span className="font-medium">
                                            {currencySymbol}{' '}
                                            {Number(
                                                allocationMap[
                                                    invoice.debtorInvoicingOrderId || (invoice.id as string)
                                                ] || 0,
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAllocateOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={allocateMut.isPending || isOverAllocated}
                            onClick={handleAllocateConfirm}
                        >
                            {allocateMut.isPending ? 'Allocating...' : 'Confirm Allocation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Allocation result */}
            <Dialog open={!!lastBatch} onOpenChange={(o) => !o && setLastBatch(null)}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" /> Allocation Posted
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between border-b py-1">
                                <span className="text-muted-foreground">Allocation batch id:</span>
                                <span className="font-mono text-xs font-semibold">
                                    {lastBatch?.allocationBatchId || lastBatch?.id || 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b py-1">
                                <span className="text-muted-foreground">Batch number:</span>
                                <span className="font-semibold">{lastBatch?.batchNumber || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between border-b py-1">
                                <span className="text-muted-foreground">Total allocated:</span>
                                <span className="font-semibold">
                                    {currencySymbol} {Number(lastBatch?.totalAllocated || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className="text-muted-foreground">Status:</span>
                                <span>{lastBatch?.status || 'COMPLETED'}</span>
                            </div>
                        </div>
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setLastBatch(null)}>
                            Done
                        </Button>
                        {lastBatch?.allocationBatchId || lastBatch?.id ? (
                            <Button
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                    const id = lastBatch.allocationBatchId || (lastBatch.id as string);
                                    setDetailId(id);
                                    setLastBatch(null);
                                }}
                            >
                                View Batch
                            </Button>
                        ) : (
                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={resetFlow}>
                                Allocate Another Receipt
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reverse confirmation */}
            <Dialog open={!!reverseTarget} onOpenChange={(o) => !o && setReverseTarget(null)}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Reverse Allocation Batch</DialogTitle>
                        <DialogDescription>
                            This will reverse the entire allocation batch{' '}
                            {reverseTarget?.batchNumber ||
                                reverseTarget?.allocationNumber ||
                                reverseTarget?.allocationBatchId ||
                                ''}{' '}
                            and restore the receipt unallocated amount, invoice outstanding amounts and debtor
                            balances.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">
                                Reversal Reason <span className="text-red-600">*</span>
                            </Label>
                            <Textarea
                                className="h-16 text-xs"
                                value={reverseReason}
                                onChange={(e) => setReverseReason(e.target.value)}
                                placeholder="Reason for reversing this allocation batch (required)"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReverseTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700"
                            disabled={reverseMut.isPending || !reverseReason.trim()}
                            onClick={handleReverseConfirm}
                        >
                            {reverseMut.isPending ? 'Reversing...' : 'Confirm Reverse'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch detail */}
            <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>
                            Allocation Batch Details{detailBatchNumber ? ` - ${detailBatchNumber}` : ''}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <Label className="text-muted-foreground text-xs">Batch No</Label>
                                    <div className="font-mono text-xs">
                                        {allocationDetail?.batchNumber ||
                                            allocationDetail?.allocationNumber ||
                                            allocationDetail?.id ||
                                            'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Receipt</Label>
                                    <div>
                                        {text(
                                            allocationDetail?.receipt,
                                            'referenceNumber',
                                            'receiptNumber',
                                        ) ||
                                            text(allocationDetail?.receiptNumber) ||
                                            'N/A'}
                                        {text(allocationDetail?.receipt, 'receiptDate') ? (
                                            <span className="text-muted-foreground">
                                                {' '}
                                                (
                                                {moment(
                                                    text(allocationDetail?.receipt, 'receiptDate'),
                                                ).format('DD/MM/YYYY')}
                                                )
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Source Debtor</Label>
                                    <div>
                                        {text(
                                            allocationDetail?.sourceDebtor,
                                            'name',
                                            'debtorName',
                                        ) || 'N/A'}
                                        {text(allocationDetail?.sourceDebtor, 'accountNumber') ? (
                                            <span className="text-muted-foreground">
                                                {' '}
                                                (
                                                {text(allocationDetail?.sourceDebtor, 'accountNumber')}
                                                )
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Debtor Group</Label>
                                    <div>{groupLabel(allocationDetail?.group, allocationDetail?.groupName) || 'N/A'}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Allocation Type</Label>
                                    <div>{allocationDetail?.allocationType || 'GROUP'}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Status</Label>
                                    <div>
                                        {allocationDetail?.reversed === true ||
                                        allocationDetail?.reversedAt ||
                                        String(allocationDetail?.status || '').toUpperCase() === 'REVERSED'
                                            ? 'REVERSED'
                                            : allocationDetail?.status || 'ACTIVE'}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Allocation Date</Label>
                                    <div>
                                        {allocationDetail?.allocationDate
                                            ? moment(allocationDetail.allocationDate).format('DD/MM/YYYY')
                                            : 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Total Allocated</Label>
                                    <div className="font-semibold">
                                        {currencySymbol} {Number(allocationDetail?.totalAllocated || 0).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {allocationDetail?.reversalReason ? (
                                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs">
                                    <Label className="text-xs text-red-600">Reversal Reason</Label>
                                    <div>{allocationDetail.reversalReason}</div>
                                    {allocationDetail.reversedAt ? (
                                        <div className="text-muted-foreground mt-1">
                                            Reversed {moment(allocationDetail.reversedAt).format('DD/MM/YYYY HH:mm')}
                                            {allocationDetail.reversedBy ? ` by ${allocationDetail.reversedBy}` : ''}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {detailRows.length ? (
                                <div className="space-y-1 border-t pt-2 text-sm">
                                    <div className="font-semibold">
                                        Allocations ({allocationDetail?.count ?? detailRows.length})
                                    </div>
                                    {detailRows.map((item, idx) => {
                                        const invoiceNo =
                                            text(item.invoice, 'invoiceNumber') ||
                                            item.invoiceNumber ||
                                            `Invoice ${idx + 1}`;
                                        const targetDebtor = text(item.targetDebtor, 'name');
                                        return (
                                            <div
                                                key={idx}
                                                className="flex justify-between border-b py-1 text-xs last:border-0"
                                            >
                                                <span>
                                                    {invoiceNo}
                                                    {targetDebtor ? (
                                                        <span className="text-muted-foreground"> — {targetDebtor}</span>
                                                    ) : null}
                                                </span>
                                                <span className="font-medium">
                                                    {currencySymbol} {Number(item.allocatedAmount || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailId(null)}>
                            Close
                        </Button>
                        {allocationDetail && detailCanReverse ? (
                            <Button
                                className="flex items-center gap-1 bg-red-600 hover:bg-red-700"
                                onClick={() => {
                                    setReverseTarget({
                                        ...allocationDetail,
                                        allocationBatchId: allocationDetail.allocationBatchId || allocationDetail.id,
                                    });
                                    setDetailId(null);
                                }}
                            >
                                <RotateCcw className="h-4 w-4" /> Reverse
                            </Button>
                        ) : null}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Supervisor approval */}
            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId || undefined}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                onApproved={(token) => {
                    if (approval?.actionLabel === 'Reverse Group Allocation') runReverse(token);
                    else runAllocate(token);
                }}
            />
        </PageLoader>
    );
};

export default GroupAllocationModule;
