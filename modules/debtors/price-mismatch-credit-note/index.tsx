'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/dynamic-table/data-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useAuthUser } from '@/stores/auth-user.store';
import SelectPopover from '@/components/select-popover';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import { useDebtorList } from '@/api-queries/debtor';
import { useDocumentPrint, DocumentType } from '@/api-queries/print';
import { AccountSaleDialog } from '@/modules/common/hoc/account-sale-dialog';
import {
    usePriceMismatchPreview,
    toPreviewItems,
    PriceMismatchItemPreview,
    useCreatePriceMismatchCreditNote,
    useCreatePriceMismatchCreditNoteMt,
    useGetPriceMismatchCreditNotes,
    useGetPriceMismatchCreditNotesMt,
    toPriceMismatchRows,
    normalizePriceMismatchCreditNote,
    useGetPriceMismatchCreditNote,
    useGetPriceMismatchCreditNoteMt,
    PriceMismatchCreditNote,
    PriceMismatchStatus,
} from '@/api-queries/credit-note-price-mismatch';
import type { ColumnDef } from '@tanstack/react-table';
import { TableHeaderToggle } from '@/components/table';
import {
    BadgePercent,
    CheckCircle2,
    Download,
    Eye,
    FileText,
    ListFilter,
    RefreshCcw,
} from 'lucide-react';
import moment from 'moment-timezone';
import { toast } from 'sonner';
import { generateUUIDForData } from '@/utils/helpers';

interface PriceMismatchModuleProps {
    moduleCode: string;
}

interface EditableLine {
    originalInvoiceItemId: string;
    description: string;
    itemCode: string;
    chargedUnitPrice: number;
    expectedUnitPrice: number;
    quantity: number;
    preview: PriceMismatchItemPreview;
}

interface PdfDocument {
    id?: string;
    creditNoteId?: string;
    creditNoteNumber?: string;
    pdfUrl?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
    NOT_APPLICABLE: 'NOT APPLICABLE',
    APPROVED: 'APPROVED',
};

const STATUS_FILTER_OPTIONS = ['NOT_APPLICABLE', 'APPROVED'].map((s) => ({
    value: s,
    label: STATUS_LABEL[s] || s,
}));

// --------------------------------------- Number cell input ---------------------------------------
//
// Defined at module level (never inside another component) so React keeps the same
// component type between renders. It keeps the raw typed text locally so the user can
// type multi-digit / decimal values ("123", "0.5", "12.") in one go without the input
// losing focus or the value being reset while typing.

interface NumberCellInputProps {
    value: number;
    onValueChange: (value: number) => void;
    step: string;
    className: string;
}

const NumberCellInput = ({ value, onValueChange, step, className }: NumberCellInputProps) => {
    const [text, setText] = useState<string>(value === 0 ? '' : String(value));

    // Sync from the parent only when the external value really differs from what is typed
    useEffect(() => {
        setText((prev) => (Number(prev || 0) === value ? prev : value === 0 ? '' : String(value)));
    }, [value]);

    return (
        <Input
            type="number"
            min={0}
            step={step}
            className={className}
            value={text}
            onChange={(e) => {
                const v = e.target.value;
                setText(v);
                onValueChange(v === '' ? 0 : Number(v));
            }}
        />
    );
};

const PriceMismatchCreditNoteModule = ({ moduleCode }: PriceMismatchModuleProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const systemMode = localStorage.getItem('systemMode');
    const documentPrint = useDocumentPrint();
    const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

    // Filters / list
    const [companyDebtorId, setCompanyDebtorId] = useState<string | null>(null);
    const [status, setStatus] = useState<PriceMismatchStatus>('APPROVED');
    const [appliedStatus, setAppliedStatus] = useState<PriceMismatchStatus>('APPROVED');
    const [applied, setApplied] = useState(false);

    // Creation flow
    const [invoicePickerOpen, setInvoicePickerOpen] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('');
    const [editableLines, setEditableLines] = useState<EditableLine[]>([]);
    const [creditNoteDate, setCreditNoteDate] = useState(() => moment().format('YYYY-MM-DD'));
    const [creditNoteMemo, setCreditNoteMemo] = useState('');
    const [priceMismatchReason, setPriceMismatchReason] = useState('Incorrect selling price applied');
    const [isMultiTax, setIsMultiTax] = useState(false);

    // Preview / detail
    const [detailId, setDetailId] = useState<string | null>(null);
    const createdMut = useCreatePriceMismatchCreditNote();
    const createdMtMut = useCreatePriceMismatchCreditNoteMt();

    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();

    const debtorList = useDebtorList({})?.data?.data?.rows || [];

    const listFilters = useMemo(
        () => ({
            creditNoteType: 'PRICE_MISMATCH' as const,
            ...(companyDebtorId ? { companyDebtorId } : {}),
            ...(applied ? { priceMismatchStatus: appliedStatus } : {}),
            limit: 50,
            offset: 0,
        }),
        [companyDebtorId, appliedStatus, applied],
    );

    const listQuery = useGetPriceMismatchCreditNotes(applied && companyDebtorId ? listFilters : null);
    const listMtQuery = useGetPriceMismatchCreditNotesMt(applied && companyDebtorId ? listFilters : null);
    const creditNotes = useMemo(() => toPriceMismatchRows(listQuery.data?.data, false), [listQuery.data]);
    const creditNotesMt = useMemo(() => toPriceMismatchRows(listMtQuery.data?.data, true), [listMtQuery.data]);

    const detailQuery = useGetPriceMismatchCreditNote(detailId);
    const detailMtQuery = useGetPriceMismatchCreditNoteMt(detailId);
    const detailRaw = (detailQuery.data?.data || detailMtQuery.data?.data) as
        | PriceMismatchCreditNote
        | null
        | undefined;
    const detail = useMemo(() => (detailRaw ? normalizePriceMismatchCreditNote(detailRaw) : null), [detailRaw]);

    const refreshAll = () => {
        listQuery.refetch();
        listMtQuery.refetch();
        if (detailId) {
            detailQuery.refetch();
            detailMtQuery.refetch();
        }
    };

    const handleInvoiceSelected = (invoice: { id: string; invoiceNumber?: string; CompanyDebtor?: { id?: string } } & Record<string, any>) => {
        const items = invoice.DebtorInvoicingOrderItems || [];
        const mapped = items
            .map((item: any) => {
                const originalInvoiceItemId = item?.id || item?.debtorInvoicingOrderItemId || item?.CompanyStockDetail?.id;
                if (!originalInvoiceItemId) return null;
                return {
                    originalInvoiceItemId,
                    description: item?.CompanyStockDetail?.description || item?.CompanyStockDetail?.itemCode || '',
                    itemCode: item?.CompanyStockDetail?.itemCode || '',
                    chargedUnitPrice: Number(item?.unitPrice || 0),
                    expectedUnitPrice: Number(item?.unitPrice || 0),
                    quantity: Number(item?.quantity || 1),
                    preview: item as PriceMismatchItemPreview,
                };
            })
            .filter(Boolean) as EditableLine[];
        setSelectedInvoiceId(invoice.id);
        setSelectedInvoiceNumber(invoice.invoiceNumber || '');
        setEditableLines(mapped);
        if (invoice?.CompanyDebtor?.id) setCompanyDebtorId(invoice.CompanyDebtor.id);
    };

    // Stable reference (uses functional state update) so the memoized columns below
    // do not get rebuilt on every keystroke.
    const setLine = useCallback((idx: number, patch: Partial<EditableLine>) => {
        setEditableLines((prev) => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
    }, []);

    const originalDocumentId = selectedInvoiceId || '';

    const previewItems = useMemo(
        () =>
            editableLines
                .map((line) => ({
                    originalInvoiceItemId: line.originalInvoiceItemId,
                    expectedUnitPrice: Number(line.expectedUnitPrice || 0),
                    quantity: Number(line.quantity || 0),
                }))
                .filter((item) => item.originalInvoiceItemId && item.quantity > 0),
        [editableLines],
    );

    const previewMut = usePriceMismatchPreview();
    const previewResult = previewMut.data?.data;

    const handlePreview = () => {
        if (!originalDocumentId) {
            toast.error('Select an invoice first');
            return;
        }
        if (!previewItems.length) {
            toast.error('Add at least one item with a positive quantity');
            return;
        }
        previewMut.mutate(
            {
                originalDocumentId,
                companyDebtorId: companyDebtorId || '',
                priceMismatchReason: priceMismatchReason || undefined,
                items: previewItems,
            },
            {
                onSuccess: (data) => {
                    if (!data?.success) toast.error(data?.message || 'Preview failed');
                },
                onError: (error) => {
                    const info = isApprovalRequiredError(error);
                    if (info) setApproval({ ...info, actionLabel: 'Preview Price-Mismatch' });
                    else {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || error?.message || 'Internal Server Error!');
                    }
                },
            },
        );
    };

    const createPayload = (approvalToken?: string) => ({
        creditNoteType: 'PRICE_MISMATCH' as const,
        clientDocumentId: generateUUIDForData(),
        originalDocumentId,
        companyDebtorId: companyDebtorId || '',
        creditNoteDate,
        creditNoteMemo: creditNoteMemo || undefined,
        priceMismatchReason: priceMismatchReason || undefined,
        timezone: moment.tz.guess(),
        items: previewItems,
        ...(approvalToken ? { approvalToken } : {}),
    });

    const handleCreate = () => {
        if (!originalDocumentId) {
            toast.error('Select an invoice first');
            return;
        }
        if (!previewItems.length) {
            toast.error('Add at least one item with a positive quantity');
            return;
        }
        const mut = isMultiTax ? createdMtMut : createdMut;
        mut.mutate(createPayload(), {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success('Price-mismatch credit note created');
                    setEditableLines([]);
                    setCreditNoteMemo('');
                    setInvoicePickerOpen(false);
                    refreshAll();
                } else {
                    toast.error(data?.message || 'Creation failed');
                }
            },
            onError: (error) => handleApproval(error, 'Create Price-Mismatch Credit Note'),
        });
    };

    const runCreate = (approvalToken: string) => {
        if (!originalDocumentId || !previewItems.length) return;
        const mut = isMultiTax ? createdMtMut : createdMut;
        mut.mutate(createPayload(approvalToken), {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success('Price-mismatch credit note created');
                    setEditableLines([]);
                    setCreditNoteMemo('');
                    setInvoicePickerOpen(false);
                    refreshAll();
                } else {
                    toast.error(data?.message || 'Creation failed');
                }
            },
            onError: (error) => handleApproval(error, 'Create Price-Mismatch Credit Note'),
        });
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

    const getDocId = (doc: PdfDocument) => doc.id || doc.creditNoteId || '';

    const fetchPdfBlob = async (doc: PdfDocument): Promise<Blob> => {
        if (systemMode !== 'offline' && doc.pdfUrl) {
            try {
                const res = await fetch(doc.pdfUrl);
                if (res.ok) return await res.blob();
            } catch {}
        }
        return documentPrint.mutateAsync({
            documentType: DocumentType.CREDIT_NOTE,
            documentId: getDocId(doc),
            printType: 'ORIGINAL',
        });
    };

    const handleViewPdf = async (doc: PdfDocument) => {
        if (systemMode !== 'offline' && doc.pdfUrl) {
            window.open(doc.pdfUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        const id = getDocId(doc);
        if (!id) return;
        setPdfBusyId(id);
        try {
            const blob = await fetchPdfBlob(doc);
            const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            toast.error('Failed to open PDF');
        } finally {
            setPdfBusyId(null);
        }
    };

    const handleDownloadPdf = async (doc: PdfDocument) => {
        const id = getDocId(doc);
        if (!id) return;
        setPdfBusyId(id);
        try {
            const blob = await fetchPdfBlob(doc);
            const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${String(doc.creditNoteNumber || id).replace(/[^\w.-]+/g, '_')}.pdf`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            if (doc.pdfUrl) window.open(doc.pdfUrl, '_blank', 'noopener,noreferrer');
            else toast.error('Failed to download PDF');
        } finally {
            setPdfBusyId(null);
        }
    };

    const applyFilters = () => {
        setAppliedStatus(status);
        setApplied(true);
    };
    const clearFilters = () => {
        setCompanyDebtorId(null);
        setStatus('APPROVED');
        setAppliedStatus('APPROVED');
        setApplied(false);
    };

    // IMPORTANT: memoized so the column/cell function identities stay stable between renders.
    // If these were recreated on every render, the table would treat every cell as a new
    // component type, remount the <Input/> after each keystroke and the focus would be lost.
    // The cells read the current values from row.original (the table data is editableLines).
    const lineColumns = useMemo<ColumnDef<EditableLine>[]>(
        () => [
            {
                accessorKey: 'itemCode',
                header: (data) => <TableHeaderToggle {...data}>Item Code</TableHeaderToggle>,
                cell: ({ row }) => <div className="font-medium">{row.original.itemCode || 'N/A'}</div>,
            },
            {
                accessorKey: 'description',
                header: (data) => <TableHeaderToggle {...data}>Description</TableHeaderToggle>,
                cell: ({ row }) => <div>{row.original.description || 'N/A'}</div>,
            },
            {
                accessorKey: 'chargedUnitPrice',
                header: (data) => <TableHeaderToggle {...data}>Charged Price</TableHeaderToggle>,
                cell: ({ row }) => (
                    <div className="text-muted-foreground">
                        {currencySymbol} {Number(row.original.chargedUnitPrice || 0).toFixed(2)}
                    </div>
                ),
            },
            {
                accessorKey: 'expectedUnitPrice',
                header: (data) => <TableHeaderToggle {...data}>Expected Price</TableHeaderToggle>,
                cell: ({ row }) => {
                    const index = row.index;
                    return (
                        <NumberCellInput
                            step="0.01"
                            className="h-8 w-28 text-xs"
                            value={row.original.expectedUnitPrice}
                            onValueChange={(v) => setLine(index, { expectedUnitPrice: v })}
                        />
                    );
                },
            },
            {
                accessorKey: 'quantity',
                header: (data) => <TableHeaderToggle {...data}>Qty</TableHeaderToggle>,
                cell: ({ row }) => {
                    const index = row.index;
                    return (
                        <NumberCellInput
                            step="1"
                            className="h-8 w-20 text-xs"
                            value={row.original.quantity}
                            onValueChange={(v) => setLine(index, { quantity: v })}
                        />
                    );
                },
            },
        ],
        [currencySymbol, setLine],
    );

    const previewColumns: ColumnDef<PriceMismatchItemPreview>[] = [
        {
            accessorKey: 'itemCode',
            header: (data) => <TableHeaderToggle {...data}>Item Code</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium">{row.original.itemCode || 'N/A'}</div>,
        },
        {
            accessorKey: 'description',
            header: (data) => <TableHeaderToggle {...data}>Description</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.description || 'N/A'}</div>,
        },
        {
            accessorKey: 'chargedUnitPrice',
            header: (data) => <TableHeaderToggle {...data}>Charged</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>{currencySymbol} {Number(row.getValue('chargedUnitPrice') || 0).toFixed(2)}</div>
            ),
        },
        {
            accessorKey: 'expectedUnitPrice',
            header: (data) => <TableHeaderToggle {...data}>Expected</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>{currencySymbol} {Number(row.getValue('expectedUnitPrice') || 0).toFixed(2)}</div>
            ),
        },
        {
            accessorKey: 'priceVarianceUnitAmount',
            header: (data) => <TableHeaderToggle {...data}>Unit Variance</TableHeaderToggle>,
            cell: ({ row }) => {
                const v = Number(row.getValue('priceVarianceUnitAmount') || 0);
                return (
                    <div className={v < 0 ? 'text-red-600' : 'text-green-700'}>
                        {currencySymbol} {v.toFixed(2)}
                    </div>
                );
            },
        },
        {
            accessorKey: 'quantity',
            header: (data) => <TableHeaderToggle {...data}>Qty</TableHeaderToggle>,
            cell: ({ row }) => <div>{Number(row.getValue('quantity') || 0)}</div>,
        },
        {
            accessorKey: 'priceVarianceAmount',
            header: (data) => <TableHeaderToggle {...data}>Variance Amount</TableHeaderToggle>,
            cell: ({ row }) => {
                const v = Number(row.getValue('priceVarianceAmount') || 0);
                return (
                    <div className={`font-semibold ${v < 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {currencySymbol} {v.toFixed(2)}
                    </div>
                );
            },
        },
    ];

    const listColumns: ColumnDef<PriceMismatchCreditNote>[] = [
        {
            accessorKey: 'creditNoteNumber',
            header: (data) => <TableHeaderToggle {...data}>Credit Note No</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="font-medium">{row.original.creditNoteNumber || row.original.creditNoteId || 'N/A'}</div>
            ),
        },
        {
            accessorKey: 'creditNoteDate',
            header: (data) => <TableHeaderToggle {...data}>Date</TableHeaderToggle>,
            cell: ({ row }) =>
                row.getValue('creditNoteDate') ? (
                    <div>{moment(String(row.getValue('creditNoteDate'))).format('DD/MM/YYYY')}</div>
                ) : (
                    <div>N/A</div>
                ),
        },
        {
            accessorKey: 'debtorName',
            header: (data) => <TableHeaderToggle {...data}>Debtor</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.original.debtorName || 'N/A'}{' '}
                    {row.original.accountNumber ? (
                        <span className="text-muted-foreground">({row.original.accountNumber})</span>
                    ) : null}
                </div>
            ),
        },
        {
            accessorKey: 'creditNoteAmount',
            header: (data) => <TableHeaderToggle {...data}>Amount</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="font-semibold">
                    {currencySymbol}{' '}
                    {Number(row.original.creditNoteAmount || row.original.totalAmount || row.original.amount || 0).toFixed(2)}
                </div>
            ),
        },
        {
            accessorKey: 'priceMismatchStatus',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const st = row.original.priceMismatchStatus || '';
                const cls =
                    st === 'APPROVED'
                        ? 'bg-blue-100 text-blue-700'
                        : st === 'NOT_APPLICABLE'
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-amber-100 text-amber-700';
                return (
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
                        {STATUS_LABEL[st] || st.replace(/_/g, ' ') || 'N/A'}
                    </span>
                );
            },
        },
        {
            accessorKey: 'isMultiTax',
            header: (data) => <TableHeaderToggle {...data}>Tax</TableHeaderToggle>,
            cell: ({ row }) => (
                <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                    {row.original.isMultiTax ? 'MULTI' : 'NORMAL'}
                </span>
            ),
        },
        {
            accessorKey: 'priceMismatchReason',
            header: (data) => <TableHeaderToggle {...data}>Reason</TableHeaderToggle>,
            cell: ({ row }) => <div className="max-w-[220px] truncate">{row.original.priceMismatchReason || 'N/A'}</div>,
        },
        {
            id: 'actions',
            header: () => <div>Actions</div>,
            cell: ({ row }) => {
                const id = row.original.id || row.original.creditNoteId;
                const busy = !!id && pdfBusyId === id;
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            disabled={!id}
                            onClick={() => setDetailId(id || null)}
                        >
                            <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="View PDF"
                            disabled={!id || busy}
                            onClick={() => handleViewPdf(row.original)}
                        >
                            <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Download PDF"
                            disabled={!id || busy}
                            onClick={() => handleDownloadPdf(row.original)}
                        >
                            <Download className="h-4 w-4 text-green-700" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const previewRows = useMemo(() => toPreviewItems(previewResult), [previewResult]);
    const totalPreview = useMemo(() => {
        if (previewResult && typeof previewResult.totalAmount === 'number') return previewResult.totalAmount;
        if (previewResult && typeof previewResult.creditNoteAmount === 'number') return previewResult.creditNoteAmount;
        if (previewResult && typeof previewResult.taxAmount === 'number') return previewResult.creditNoteAmount || previewResult.totalAmount;
        return 0;
    }, [previewResult]);

    return (
        <PageLoader isLoading={listQuery.isLoading}>
            <div className="space-y-4 p-3">
                <div className="text-lg font-bold">Price-Mismatch Credit Note</div>
                <p className="text-xs text-muted-foreground">
                    Create a credit note for the price difference only. It does not return or increase stock. Backend
                    calculates all variance totals from the original invoice price and the expected price.
                </p>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[240px]">
                        <Label className="text-xs">Debtor</Label>
                        <SelectPopover
                            title="debtor"
                            selectedValue={companyDebtorId}
                            options={debtorList.map((debtor) => ({
                                value: debtor.id,
                                label: `${debtor.name} (${debtor.accountNumber})`,
                            }))}
                            onSelect={(val) => setCompanyDebtorId(val || null)}
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Status</Label>
                        <SelectPopover
                            title="status"
                            selectedValue={status}
                            options={STATUS_FILTER_OPTIONS}
                            onSelect={(val) => setStatus((val as PriceMismatchStatus) || 'APPROVED')}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={applyFilters}>
                            Apply
                        </Button>
                        <Button size="sm" variant="outline" onClick={clearFilters}>
                            Clear
                        </Button>
                    </div>
                    <div className="ml-auto">
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                                setEditableLines([]);
                                setSelectedInvoiceId(null);
                                setSelectedInvoiceNumber('');
                                setCreditNoteDate(moment().format('YYYY-MM-DD'));
                                setCreditNoteMemo('');
                                setPriceMismatchReason('Incorrect selling price applied');
                                setInvoicePickerOpen(!!companyDebtorId);
                            }}
                        >
                            <BadgePercent className="mr-1 h-4 w-4" /> New Price-Mismatch
                        </Button>
                    </div>
                </div>

                {!companyDebtorId ? (
                    <Card>
                        <CardContent className="p-6 text-center text-sm text-muted-foreground">
                            Select a debtor to view or create price-mismatch credit notes.
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs defaultValue="normal">
                        <TabsList>
                            <TabsTrigger value="normal">
                                <ListFilter className="mr-1 h-4 w-4" /> Normal Tax ({creditNotes.length})
                            </TabsTrigger>
                            <TabsTrigger value="mt">
                                <ListFilter className="mr-1 h-4 w-4" /> Multi-Tax ({creditNotesMt.length})
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="normal" className="space-y-2">
                            <DataTable
                                query={listQuery}
                                data={creditNotes}
                                columns={listColumns}
                                totalRowCount={creditNotes.length}
                            />
                        </TabsContent>
                        <TabsContent value="mt" className="space-y-2">
                            <DataTable
                                query={listMtQuery}
                                data={creditNotesMt}
                                columns={listColumns}
                                totalRowCount={creditNotesMt.length}
                            />
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            {/* Invoice picker */}
            {companyDebtorId && (
                <AccountSaleDialog
                    isOpen={invoicePickerOpen}
                    onClose={() => setInvoicePickerOpen(false)}
                    companyDebtorId={companyDebtorId}
                    onSelectAccountSale={handleInvoiceSelected as any}
                    priceMismatchMode
                />
            )}

            {/* Create dialog */}
            <Dialog open={editableLines.length > 0} onOpenChange={(o) => !o && setEditableLines([])}>
                <DialogContent
                    className="max-h-[90vh] overflow-auto sm:max-w-[900px]"
                    onWheel={(e) => e.stopPropagation()}
                >
                    <DialogHeader>
                        <DialogTitle>Create Price-Mismatch Credit Note</DialogTitle>
                        <DialogDescription>
                            {selectedInvoiceNumber && (
                                <span className="font-medium">
                                    Original Invoice: {selectedInvoiceNumber}
                                    <span className="mx-1">·</span>
                                </span>
                            )}
                            Enter the expected selling price for each item. Backend computes the variance and
                            credit-note totals from the original invoice price.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[45vh] space-y-3 overflow-auto">
                        {editableLines.length ? (
                            <DataTable
                                query={undefined}
                                data={editableLines}
                                columns={lineColumns}
                                getRowId={(_, index) => `line-${index}`}
                                totalRowCount={editableLines.length}
                            />
                        ) : (
                            <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                                No items in the selected invoice.
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                            <Label className="text-xs">Credit Note Date</Label>
                            <Input
                                type="date"
                                className="h-8 text-xs"
                                value={creditNoteDate}
                                onChange={(e) => setCreditNoteDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Tax Type</Label>
                            <SelectPopover
                                title="tax type"
                                selectedValue={isMultiTax ? 'MULTI' : 'NORMAL'}
                                options={[
                                    { value: 'NORMAL', label: 'Normal Tax' },
                                    { value: 'MULTI', label: 'Multi-Tax' },
                                ]}
                                onSelect={(val) => setIsMultiTax(val === 'MULTI')}
                            />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs">Reason</Label>
                            <Input
                                className="h-8 text-xs"
                                value={priceMismatchReason}
                                onChange={(e) => setPriceMismatchReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Memo</Label>
                        <Input
                            className="h-8 text-xs"
                            value={creditNoteMemo}
                            onChange={(e) => setCreditNoteMemo(e.target.value)}
                            placeholder="Credit for incorrect invoice price"
                        />
                    </div>

                    <div className="flex flex-wrap justify-between gap-2">
                        <Button variant="outline" onClick={handlePreview} disabled={previewMut.isPending}>
                            <RefreshCcw className="mr-1 h-4 w-4" />
                            {previewMut.isPending ? 'Previewing...' : 'Preview Calculation'}
                        </Button>
                        <div className="text-sm font-semibold">
                            Credit Note Total:{' '}
                            <span className="text-blue-700">
                                {currencySymbol} {Number(totalPreview || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {previewRows.length ? (
                        <div className="space-y-2">
                            <div className="text-sm font-semibold">Calculated Variance (from backend)</div>
                            <DataTable
                                query={undefined}
                                data={previewRows}
                                columns={previewColumns}
                                getRowId={(_, index) => `preview-${index}`}
                                totalRowCount={previewRows.length}
                            />
                        </div>
                    ) : null}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditableLines([])}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!previewItems.length || (createdMut.isPending || createdMtMut.isPending)}
                            onClick={handleCreate}
                        >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            {createdMut.isPending || createdMtMut.isPending ? 'Creating...' : 'Create Credit Note'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail */}
            <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>Price-Mismatch Credit Note</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Credit Note No</Label>
                                    <div className="font-semibold">
                                        {detail?.creditNoteNumber || detail?.creditNoteId || 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Date</Label>
                                    <div>
                                        {detail?.creditNoteDate
                                            ? moment(String(detail.creditNoteDate)).format('DD/MM/YYYY')
                                            : 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Amount</Label>
                                    <div className="font-semibold">
                                        {currencySymbol}{' '}
                                        {Number(
                                            detail?.creditNoteAmount ||
                                                detail?.totalAmount ||
                                                detail?.amount ||
                                                0,
                                        ).toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Status</Label>
                                    <div>
                                        {detail?.priceMismatchStatus
                                            ? STATUS_LABEL[detail.priceMismatchStatus] ||
                                              detail.priceMismatchStatus.replace(/_/g, ' ')
                                            : 'N/A'}
                                    </div>
                                </div>
                            </div>
                            {detail?.priceMismatchReason ? (
                                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
                                    <Label className="text-xs text-amber-700">Reason</Label>
                                    <div>{detail.priceMismatchReason}</div>
                                </div>
                            ) : null}
                            {detail?.items?.length ? (
                                <div className="space-y-1 border-t pt-2">
                                    <div className="font-semibold">Items ({detail.items.length})</div>
                                    {detail.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex justify-between border-b py-1 text-xs last:border-0"
                                        >
                                            <span>{item.description || item.itemCode || `Item ${idx + 1}`}</span>
                                            <span className="font-medium">
                                                {currencySymbol}{' '}
                                                {Number(item.priceVarianceAmount || item.lineTotal || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            disabled={!detail || pdfBusyId === (detail?.id || detail?.creditNoteId)}
                            onClick={() => detail && handleViewPdf(detail)}
                        >
                            <FileText className="mr-1 h-4 w-4" /> View PDF
                        </Button>
                        <Button
                            variant="outline"
                            disabled={!detail || pdfBusyId === (detail?.id || detail?.creditNoteId)}
                            onClick={() => detail && handleDownloadPdf(detail)}
                        >
                            <Download className="mr-1 h-4 w-4" /> Download
                        </Button>
                        <Button variant="outline" onClick={() => setDetailId(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approval */}
            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId || undefined}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                onApproved={runCreate}
            />
        </PageLoader>
    );
};

export default PriceMismatchCreditNoteModule;