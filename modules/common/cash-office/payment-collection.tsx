import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import SelectPopover from '@/components/select-popover';
import { Landmark, Wallet, CheckCircle2, RefreshCw, Lock } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import {
    useGetCashOfficeConfigurations,
    useGetCashOfficeSessionCurrent,
    useGetCashOfficePaymentMethods,
    useCreateCashOfficeReceipt,
    generateCashOfficeDocumentId,
    type CashOfficeConfiguration,
    type CashOfficePaymentMethod,
    type CreateCashOfficeReceiptInput,
} from '@/api-queries/cash-office';
import {
    useDebtorInvoicingOrderByOrderId,
    useUnpaidDebtorInvoicingOrders,
    type UnpaidDebtorInvoicingOrderFilterProps,
} from '@/api-queries/debtor-invoicing-orders';
import type { AccountSalesDetails } from '@/api-queries/point-of-sale/account-sales/account-sales';
import { useAuthUser } from '@/stores/auth-user.store';
import { useDebtorList } from '@/api-queries/debtor';
import { TENDER_TYPES } from '@/lib/constant';
import { cn } from '@/lib/utils';
import { formatMoney, isCashOfficeSessionOpen } from './shared';

// source=ACCOUNT_SALE is used when an Account Sale invoice was created and the
// payment-routing check answered CASH_OFFICE. In that mode the debtor and the
// invoice are prefilled and locked; the user only picks the cash office, payment
// method and amount. Any other entry (menu) is the direct mode where the cash
// office -> debtor -> unpaid invoice -> amount flow drives the screen.
const PaymentCollection = () => {
    const router = useRouter();
    const query = (router.query || {}) as {
        source?: string;
        invoiceId?: string;
        invoiceNumber?: string;
        companyDebtorId?: string;
        debtorName?: string;
        reference?: string;
        cashOfficeId?: string;
    };

    const isLockedMode = query.source === 'ACCOUNT_SALE' && !!query.invoiceId;

    const userType = useAuthUser((state) => state.user?.userType);
    const myDebtorId = useAuthUser((state) => state.user?.companyDebtorId) || '';
    const myWarehouseId = useAuthUser((state) => state.user?.warehouseId) || '';
    const isDebtorUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const configsQuery = useGetCashOfficeConfigurations({
        ...(isDebtorUser ? { companyDebtorId: myDebtorId } : {}),
        ...(isWarehouseUser ? { companyWarehouseId: myWarehouseId } : {}),
        status: 'ACTIVE',
        limit: 200,
        offset: 0,
    });
    const configs: CashOfficeConfiguration[] = configsQuery?.data?.data?.rows || [];

    const [cashOfficeId, setCashOfficeId] = useState(query.cashOfficeId || '');

    const currentSession = useGetCashOfficeSessionCurrent(cashOfficeId || configs[0]?.id || '');
    const openSessionId = isCashOfficeSessionOpen(currentSession?.data?.data?.status)
        ? currentSession.data?.data?.id || null
        : null;
    const currentSessionLoading = currentSession.isLoading;

    const paymentMethodsQuery = useGetCashOfficePaymentMethods(
        { limit: 100, offset: 0 },
        !!cashOfficeId || !!configs.length,
    );
    const paymentMethods: CashOfficePaymentMethod[] = paymentMethodsQuery?.data?.data?.rows || [];
    const paymentMethodOptions = useMemo(
        () =>
            paymentMethods.map((m) => ({
                label: `${m.code ? m.code + ' - ' : ''}${m.name || m.type || m.id}`,
                value: m.id,
            })),
        [paymentMethods],
    );

    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows || [];
    const debtorOptions = useMemo(
        () =>
            debtors.map((d) => ({
                label: `${d?.name} (${d?.accountNumber})`,
                value: d?.id,
            })),
        [debtors],
    );

    // Locked (ACCOUNT_SALE) mode loads the single created invoice by its order id.
    const orderQuery = useDebtorInvoicingOrderByOrderId(isLockedMode ? query.invoiceId || '' : '');
    const loadedInvoice: AccountSalesDetails | null = orderQuery?.data?.data?.data ?? orderQuery?.data?.data ?? null;

    // Direct mode reads only unpaid invoices for the selected debtor.
    const [selectedDirectDebtorId, setSelectedDirectDebtorId] = useState('');
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [outstandingOnly, setOutstandingOnly] = useState(true);
    const [selectedDirectInvoiceId, setSelectedDirectInvoiceId] = useState('');

    const invoicesFilter: UnpaidDebtorInvoicingOrderFilterProps = {
        limit: 50,
        offset: 0,
        search: invoiceSearch.trim() || undefined,
        companyDebtorId: selectedDirectDebtorId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        filters: {
            status: 'ACTIVE',
            isAmountOutstanding: outstandingOnly,
        },
    };
    const invoicesQuery = useUnpaidDebtorInvoicingOrders(
        invoicesFilter,
        !isLockedMode && !!selectedDirectDebtorId,
    );
    const unpaidInvoices: AccountSalesDetails[] = invoicesQuery?.data?.data?.rows || [];

    const [paymentMethodId, setPaymentMethodId] = useState('');
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState(query.reference || '');
    const [debtorName, setDebtorName] = useState(query.debtorName || '');
    const [clientDocumentId, setClientDocumentId] = useState(() => generateCashOfficeDocumentId('CO-RCP'));

    const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId);
    const tenderType = selectedMethod?.type || '';

    const createReceiptMut = useCreateCashOfficeReceipt();

    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    // Holds the exact receipt payload that hit the 428 so it can be replayed
    // unchanged with the supervisor's approval token.
    const pendingReceiptRef = useRef<CreateCashOfficeReceiptInput | null>(null);

    const isSubmitting = createReceiptMut.isPending;

    // Locked mode: prefill debtor name and amount from the loaded invoice once.
    useEffect(() => {
        if (isLockedMode && loadedInvoice) {
            setDebtorName(loadedInvoice.CompanyDebtor?.name || query.debtorName || '');
            setAmount((current) =>
                current === '' ? String(Number(loadedInvoice.outstandingAmount ?? 0) || 0) : current,
            );
        }
    }, [isLockedMode, loadedInvoice, query.debtorName]);

    const lockedDebtorId = isLockedMode ? query.companyDebtorId || '' : '';
    const selectedInvoice: AccountSalesDetails | null = isLockedMode
        ? loadedInvoice
        : unpaidInvoices.find((inv) => inv.id === selectedDirectInvoiceId) || null;
    const outstanding = Number(selectedInvoice?.outstandingAmount ?? 0);
    const debtorId = isLockedMode ? lockedDebtorId : selectedDirectDebtorId;

    const goToCashOfficeDashboard = () => {
        const officeId = cashOfficeId || configs[0]?.id || '';
        router.push(
            officeId
                ? `/operations/cash-office/dashboard?cashOfficeId=${officeId}`
                : '/operations/cash-office/dashboard',
        );
    };

    const refreshAfterCollection = () => {
        setPaymentMethodId('');
        setReference('');
        setClientDocumentId(generateCashOfficeDocumentId('CO-RCP'));
        setAmount('0');
        if (isLockedMode) {
            orderQuery.refetch().then((res) => {
                const invoice = res?.data?.data?.data ?? res?.data?.data ?? null;
                const remaining = Number(invoice?.outstandingAmount ?? 0);
                setAmount(remaining > 0 ? String(remaining) : '0');
            });
        } else {
            invoicesQuery.refetch();
            setSelectedDirectInvoiceId('');
        }
        toast.success('Receipt created and allocated');
    };

    const handleCollect = async () => {
        const officeId = cashOfficeId || configs[0]?.id || '';
        if (!officeId) {
            toast.error('Select a cash office first');
            return;
        }
        if (!openSessionId) {
            toast.error('Open a Cash Office session first.', {
                action: {
                    label: 'Cash Office Dashboard',
                    onClick: goToCashOfficeDashboard,
                },
            });
            return;
        }
        if (!paymentMethodId) {
            toast.error('Select a payment method');
            return;
        }
        const value = Number(amount) || 0;
        if (value <= 0) {
            toast.error('Enter a valid amount to collect');
            return;
        }
        const invoice = selectedInvoice;
        if (!invoice || !invoice.id) {
            toast.error('Select the invoice to collect payment for');
            return;
        }
        if (outstanding > 0 && value > outstanding) {
            toast.error(`Amount cannot exceed the outstanding amount (${formatMoney(outstanding)})`);
            return;
        }
        if (!debtorId.trim()) {
            toast.error('Select a debtor (companyDebtorId)');
            return;
        }

        const payload: CreateCashOfficeReceiptInput = {
            cashOfficeId: officeId,
            cashOfficeSessionId: openSessionId,
            debtorInvoicingOrderId: invoice.id,
            companyDebtorId: debtorId.trim(),
            tenderTypeId: paymentMethodId,
            amount: value,
            reference: reference.trim() || undefined,
            clientDocumentId,
        };

        try {
            const created = await createReceiptMut.mutateAsync(payload);
            if (created?.success === false) {
                toast.error(created?.message || 'Failed to create receipt');
                return;
            }
            refreshAfterCollection();
        } catch (error: unknown) {
            const info = isApprovalRequiredError(error);
            if (info) {
                pendingReceiptRef.current = payload;
                setApproval({ ...info, actionLabel: 'Create Cash Office Receipt' });
            } else {
                // @ts-ignore
                toast.error(error?.response?.data?.message || error?.message || 'Internal Server Error!');
            }
        }
    };

    const handleApproved = async (token: string) => {
        const pending = pendingReceiptRef.current;
        closeApproval();
        pendingReceiptRef.current = null;
        if (!pending) {
            toast.error('The original request was lost. Please submit the collection again.');
            return;
        }
        try {
            // Replay the original payload unchanged, adding only the approval token.
            const created = await createReceiptMut.mutateAsync({ ...pending, approvalToken: token });
            if (created?.success === false) {
                toast.error(created?.message || 'Failed to create receipt');
                return;
            }
            refreshAfterCollection();
        } catch (error: unknown) {
            // @ts-ignore
            toast.error(error?.response?.data?.message || error?.message || 'Internal Server Error!');
        }
    };

    const cashOfficeOptions = configs.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id }));

    const isCash = tenderType === TENDER_TYPES.CASH;
    const isCheque = tenderType === TENDER_TYPES.CHEQUE;
    const isNonPhysical =
        tenderType === TENDER_TYPES.EFT ||
        tenderType === TENDER_TYPES.CARD ||
        tenderType === TENDER_TYPES.CREDIT_CARD ||
        tenderType === TENDER_TYPES.DEBIT_CARD;

    return (
        <PageLoader isLoading={configsQuery.isLoading || (isLockedMode && orderQuery.isLoading)}>
            <div className="space-y-4 p-3">
                <div className="text-lg font-bold">Cash Office Payment Collection</div>
                <p className="text-sm text-muted-foreground">
                    {isLockedMode ? (
                        <>
                            This invoice was routed to the Cash Office after an Account Sale. The debtor and invoice are
                            locked; select a cash office with an open session and collect the outstanding amount.{' '}
                            <span className="font-mono text-xs">/api/company/cashOffice/receipt/create</span>
                        </>
                    ) : (
                        <>
                            Select a cash office with an open session, then choose the debtor and an unpaid invoice to
                            collect. Use the receipt creation endpoint (
                            <span className="font-mono text-xs">/api/company/cashOffice/receipt/create</span>).
                        </>
                    )}
                </p>

                {isLockedMode && (
                    <div className="grid max-w-3xl gap-4 rounded-md border bg-white p-4 sm:grid-cols-2">
                        <div>
                            <Label>Debtor (locked)</Label>
                            <div className="flex items-center gap-2">
                                <Input value={debtorName || '—'} disabled readOnly className="bg-slate-50" />
                                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                        </div>
                        <div>
                            <Label>Invoice Number (locked)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={loadedInvoice?.invoiceNumber || query.invoiceNumber || '—'}
                                    disabled
                                    readOnly
                                    className="bg-slate-50"
                                />
                                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                )}

                {!isLockedMode && (
                    <div className="max-w-3xl space-y-2 rounded-md border bg-white p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-64">
                                <Label>Debtor</Label>
                                <SelectPopover
                                    title="Debtor"
                                    onlyTitle="Select debtor"
                                    selectedValue={selectedDirectDebtorId}
                                    options={debtorOptions}
                                    onSelect={(val) => {
                                        const id = String(val || '');
                                        setSelectedDirectDebtorId(id);
                                        setSelectedDirectInvoiceId('');
                                        setAmount('');
                                        setDebtorName(id ? debtors.find((d) => d?.id === id)?.name || '' : '');
                                    }}
                                    selectClass="w-full"
                                />
                            </div>
                            <div className="w-48">
                                <Label>Invoice No</Label>
                                <Input
                                    value={invoiceSearch}
                                    onChange={(e) => setInvoiceSearch(e.target.value)}
                                    placeholder="Search invoice no"
                                />
                            </div>
                            <div>
                                <Label>Date From</Label>
                                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                            </div>
                            <div>
                                <Label>Date To</Label>
                                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                            </div>
                            <label className="flex items-center gap-2 pb-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={outstandingOnly}
                                    onChange={(e) => setOutstandingOnly(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                Outstanding invoices only
                            </label>
                        </div>

                        {!selectedDirectDebtorId && (
                            <div className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                                Select a debtor to load their unpaid invoices.
                            </div>
                        )}

                        {selectedDirectDebtorId && (
                            <div className="rounded-md border">
                              <div className="max-h-[280px] overflow-y-auto">
                                <div className="sticky top-0 z-10 grid grid-cols-[1.5rem_1fr_auto_auto_1fr] gap-2 border-b bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <span />
                                    <span>Invoice No</span>
                                    <span>Invoice Date</span>
                                    <span>Outstanding Amount</span>
                                    <span>Debtor</span>
                                </div>
                                {invoicesQuery.isLoading ? (
                                    <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                                        <RefreshCw className="h-4 w-4 animate-spin" /> Loading unpaid invoices…
                                    </div>
                                ) : unpaidInvoices.length === 0 ? (
                                    <div className="px-3 py-4 text-sm text-muted-foreground">
                                        No unpaid invoices found for the selected debtor.
                                    </div>
                                ) : (
                                    unpaidInvoices.map((inv) => {
                                        const isSelected = selectedDirectInvoiceId === inv.id;
                                        return (
                                            <button
                                                type="button"
                                                key={inv.id}
                                                onClick={() => {
                                                    setSelectedDirectInvoiceId(inv.id);
                                                    setAmount(String(Number(inv.outstandingAmount ?? 0) || 0));
                                                }}
                                                className={cn(
                                                    'grid w-full grid-cols-[1.5rem_1fr_auto_auto_1fr] items-center gap-2 border-b px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-slate-50',
                                                    isSelected && 'bg-blue-50 ring-1 ring-inset ring-blue-300',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'flex h-4 w-4 items-center justify-center rounded-full border',
                                                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300',
                                                    )}
                                                >
                                                    {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                                </span>
                                                <span className="break-all font-semibold">{inv.invoiceNumber || '—'}</span>
                                                <span className="text-muted-foreground">
                                                    {inv.createdAt ? moment(inv.createdAt).format('DD MMM YYYY') : '—'}
                                                </span>
                                                <span className="font-medium">{formatMoney(Number(inv.outstandingAmount ?? 0))}</span>
                                                <span className="truncate text-muted-foreground">
                                                    {inv.CompanyDebtor?.name || '—'}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                              </div>
                              <div className="flex items-center justify-between border-t bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                                  <span>
                                      {unpaidInvoices.length} invoice{unpaidInvoices.length === 1 ? '' : 's'}
                                      {unpaidInvoices.length >= 50 ? ' (first 50 shown — refine with search/dates)' : ''}
                                  </span>
                                  {selectedInvoice ? (
                                      <span className="flex items-center gap-2">
                                          <span>
                                              Selected: <span className="font-semibold text-foreground">{selectedInvoice.invoiceNumber}</span>{' '}
                                              ({formatMoney(Number(selectedInvoice.outstandingAmount ?? 0))})
                                          </span>
                                          <button
                                              type="button"
                                              className="text-blue-600 hover:underline"
                                              onClick={() => {
                                                  setSelectedDirectInvoiceId('');
                                                  setAmount('');
                                              }}
                                          >
                                              Clear
                                          </button>
                                      </span>
                                  ) : (
                                      <span>Select an invoice to collect</span>
                                  )}
                              </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid max-w-3xl gap-4 rounded-md border bg-white p-4 sm:grid-cols-2">
                    <div>
                        <Label>Cash Office</Label>
                        <SelectPopover
                            title="Cash Office"
                            onlyTitle="Select cash office"
                            selectedValue={cashOfficeId || configs[0]?.id || ''}
                            options={cashOfficeOptions}
                            onSelect={(val) => setCashOfficeId(String(val || ''))}
                        />
                    </div>
                    <div>
                        <Label>Payment Method</Label>
                        <SelectPopover
                            title="Payment Method"
                            onlyTitle="Select payment method"
                            selectedValue={paymentMethodId}
                            options={paymentMethodOptions}
                            onSelect={(val) => setPaymentMethodId(String(val || ''))}
                        />
                    </div>
                    <div>
                        <Label>Amount</Label>
                        <Input
                            type="number"
                            min={0}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                        />
                        {selectedInvoice && outstanding > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Outstanding: <span className="font-semibold">{formatMoney(outstanding)}</span>
                            </p>
                        )}
                    </div>
                    <div>
                        <Label>Reference</Label>
                        <Input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="Invoice / document reference"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={isSubmitting || currentSessionLoading || !openSessionId || !selectedInvoice}
                            onClick={handleCollect}
                        >
                            {isSubmitting ? (
                                <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                                <Wallet className="mr-1 h-4 w-4" />
                            )}
                            Collect Payment
                        </Button>
                    </div>
                </div>

                <div className="max-w-3xl space-y-2">
                    {!openSessionId && !currentSessionLoading && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <span>Open a Cash Office session first.</span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-amber-300 text-xs text-amber-800 hover:bg-amber-100"
                                onClick={goToCashOfficeDashboard}
                            >
                                Go to Cash Office Dashboard
                            </Button>
                        </div>
                    )}
                    {selectedMethod && (
                        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>
                                {selectedMethod.code ? `${selectedMethod.code} — ` : ''}
                                {selectedMethod.name || selectedMethod.type} ({tenderType})
                            </span>
                            {isCash && <span className="text-xs">added to safe as Cash</span>}
                            {isCheque && <span className="text-xs">added to safe as Cheque</span>}
                            {isNonPhysical && <span className="text-xs">EFT / Card — no physical safe impact</span>}
                        </div>
                    )}
                    {Number(amount) > 0 && isCash && (
                        <div className="rounded-md border bg-white px-3 py-2 text-sm">
                            <span className="text-muted-foreground">Collected: </span>
                            <span className="font-semibold">{formatMoney(Number(amount))}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm text-muted-foreground">
                        <Landmark className="h-4 w-4" /> Creates and allocates a debtor receipt against the invoice,
                        reduces outstanding, posts to the safe ledger in one transaction.
                    </div>
                </div>
            </div>

            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                approverGroupName={approval?.approverGroupName}
                scopeLabel={approval?.scopeLabel}
                onApproved={(token) => handleApproved(token)}
            />
        </PageLoader>
    );
};

export default PaymentCollection;