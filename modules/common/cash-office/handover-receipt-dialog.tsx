import { useEffect, useRef } from 'react';
import moment from 'moment';
import { Download, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useGetCashOfficeHandoverReceipt, type CashOfficeHandover } from '@/api-queries/cash-office';
import { useAuthUser } from '@/stores/auth-user.store';

const FS = {
    header: '11px',
    sub: '8px',
    body: '8.5px',
    small: '7.5px',
    total: '11px',
};
const FW = {
    normal: 400,
    bold: 600,
    heavy: 700,
} as const;

const createDashedLine = (length: number = 32) => '-'.repeat(length);

function ReceiptRow({
    label,
    value,
    bold = false,
    small = false,
}: {
    label: string;
    value: string;
    bold?: boolean;
    small?: boolean;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px',
                fontWeight: bold ? FW.bold : FW.normal,
                fontSize: small ? FS.small : FS.body,
            }}
        >
            <span>{label}</span>
            <span style={{ textAlign: 'right' }}>{value}</span>
        </div>
    );
}

export function CashOfficeHandoverReceipt({ receipt }: { receipt: CashOfficeHandover }) {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const formatCurrency = (amount?: number | string | null) => `${currencySymbol} ${Number(amount ?? 0).toFixed(2)}`;

    const declaredCash = Number(receipt.declaredCashAmount || 0);
    const declaredCheque = Number(receipt.declaredChequeAmount || 0);
    const countedCash = Number(receipt.countedCashAmount || 0);
    const countedCheque = Number(receipt.countedChequeAmount || 0);
    const declaredTotal = declaredCash + declaredCheque;
    const countedTotal = countedCash + countedCheque;
    const variance = Number(receipt.varianceAmount ?? receipt.variance ?? countedTotal - declaredTotal);

    const cashOfficeName =
        receipt.cashOffice?.name ||
        receipt.cashOffice?.code ||
        receipt.cashOfficeSession?.cashOffice?.name ||
        receipt.cashOfficeSession?.cashOffice?.code ||
        '—';
    const tillLabel = receipt.till?.name || receipt.till?.tillNumber || receipt.tillName || '—';
    const statusLabel = receipt.status ? receipt.status.replace(/_/g, ' ') : '—';
    const receiptDate = receipt.receivedAt || receipt.countedAt || receipt.acknowledgedAt || receipt.createdAt;

    return (
        <>
            <style>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    html, body {
                        width: 80mm;
                    }
                    .cash-office-receipt-root {
                        width: 80mm !important;
                        max-width: 80mm !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>

            <div
                className="cash-office-receipt-root mx-auto flex items-center justify-center border-1 border-gray-200 bg-white"
                style={{
                    width: '80mm',
                    maxWidth: '80mm',
                    padding: '2mm',
                    fontFamily: 'Courier New, monospace',
                    fontSize: FS.body,
                    fontWeight: FW.normal,
                    lineHeight: '1.25',
                    color: '#000',
                }}
            >
                <div className="w-full">
                    <div className="text-center">
                        <div style={{ fontSize: FS.header, fontWeight: FW.heavy, marginBottom: '5px' }}>
                            ***** CASH OFFICE *****
                        </div>
                        <div style={{ fontSize: FS.header, fontWeight: FW.heavy, marginBottom: '5px' }}>
                            TILL HANDOVER RECEIPT
                        </div>
                        <div style={{ fontSize: FS.sub, fontWeight: FW.normal }}>
                            {receiptDate ? moment(receiptDate).format('DD MMM YYYY, HH:mm') : '—'}
                        </div>
                        <div
                            style={{ marginTop: '3px', fontSize: FS.small, fontWeight: FW.normal }}
                            className="text-center"
                        >
                            {createDashedLine()}
                        </div>
                    </div>

                    <div style={{ marginBottom: '5px', fontSize: FS.body }}>
                        <ReceiptRow label="Receipt" value={receipt.receiptNumber || '—'} bold />
                        <ReceiptRow label="Reference" value={receipt.clientDocumentId || '—'} small />
                        <ReceiptRow label="Cash Office" value={cashOfficeName} />
                        <ReceiptRow label="Till" value={tillLabel} />
                        <ReceiptRow label="Clerk" value={receipt.clerkName || '—'} />
                        <div style={{ marginTop: '3px', fontSize: FS.small }} className="text-center">
                            {createDashedLine()}
                        </div>
                    </div>

                    <div style={{ marginBottom: '5px', fontSize: FS.body }}>
                        <div style={{ fontWeight: FW.bold, marginBottom: '2px' }}>DECLARED</div>
                        <ReceiptRow label="Cash" value={formatCurrency(declaredCash)} />
                        <ReceiptRow label="Cheque" value={formatCurrency(declaredCheque)} />
                        <ReceiptRow label="Total" value={formatCurrency(declaredTotal)} bold />
                        <div style={{ marginTop: '3px', fontSize: FS.small }} className="text-center">
                            {createDashedLine()}
                        </div>
                    </div>

                    <div style={{ marginBottom: '5px', fontSize: FS.body }}>
                        <div style={{ fontWeight: FW.bold, marginBottom: '2px' }}>COUNTED</div>
                        <ReceiptRow label="Cash" value={formatCurrency(countedCash)} />
                        <ReceiptRow label="Cheque" value={formatCurrency(countedCheque)} />
                        <div
                            style={{
                                marginTop: '4px',
                                paddingTop: '4px',
                                borderTop: '1px solid #000',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontWeight: FW.heavy,
                                fontSize: FS.total,
                            }}
                        >
                            <span>TOTAL COUNTED:</span>
                            <span>{formatCurrency(countedTotal)}</span>
                        </div>
                    </div>

                    <div style={{ marginBottom: '5px', fontSize: FS.body }}>
                        <ReceiptRow label="Variance" value={formatCurrency(variance)} bold />
                        {receipt.varianceReason ? (
                            <div style={{ fontSize: FS.small, marginTop: '2px' }}>Reason: {receipt.varianceReason}</div>
                        ) : null}
                        <ReceiptRow label="Status" value={statusLabel} />
                        <div style={{ marginTop: '3px', fontSize: FS.small }} className="text-center">
                            {createDashedLine()}
                        </div>
                    </div>

                    <div style={{ marginBottom: '5px', fontSize: FS.body }}>
                        <ReceiptRow
                            label="Counted By"
                            value={
                                receipt.claimedByName ||
                                receipt.claimedByUser?.name ||
                                receipt.countedByName ||
                                receipt.countedBy ||
                                '—'
                            }
                            small
                        />
                        <ReceiptRow
                            label="Received By"
                            value={
                                receipt.receivedByName || receipt.receivedByUser?.name || receipt.receivedBy || '—'
                            }
                            small
                        />
                    </div>

                    <div
                        className="text-center"
                        style={{ fontSize: FS.small, marginTop: '8px', fontWeight: FW.normal }}
                    >
                        <div className="text-center" style={{ fontSize: FS.body }}>
                            {createDashedLine()}
                        </div>
                        <div style={{ marginTop: '3px' }}>Thank you for your business!</div>
                        <div style={{ marginTop: '3px' }}>© All rights reserved</div>
                    </div>

                    <div className="pointer-events-none mt-1 flex items-center justify-center">
                        <img
                            src="/assets/images/onetouch-logo.jpg"
                            alt="Watermark"
                            className="max-h-[90px] max-w-[90px] rounded-full object-contain"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

export function CashOfficeHandoverReceiptDialog({
    open,
    handoverId,
    autoPrint = false,
    onClose,
}: {
    open: boolean;
    handoverId: string;
    autoPrint?: boolean;
    onClose: () => void;
}) {
    const receiptQuery = useGetCashOfficeHandoverReceipt(open ? handoverId : '');
    const receipt = receiptQuery?.data?.data || null;
    const contentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({ contentRef });
    const handleDownload = useReactToPrint({ contentRef });

    const printRef = useRef(handlePrint);
    printRef.current = handlePrint;
    const didAutoPrint = useRef(false);

    useEffect(() => {
        if (!open) {
            didAutoPrint.current = false;
            return;
        }
        if (!autoPrint || !receipt || didAutoPrint.current) return;
        didAutoPrint.current = true;
        const timer = window.setTimeout(() => printRef.current(), 150);
        return () => window.clearTimeout(timer);
    }, [open, autoPrint, receipt]);

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col !gap-0 !space-y-0 overflow-hidden bg-white p-0">
                <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-2 pr-12">
                    <DialogTitle className="text-sm font-semibold">Handover Receipt</DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleDownload()} disabled={!receipt}>
                            <Download /> Download PDF
                        </Button>
                        <Button size="sm" onClick={() => handlePrint()} disabled={!receipt}>
                            <Printer /> Print
                        </Button>
                    </div>
                </DialogHeader>

                <PageLoader isLoading={receiptQuery.isLoading}>
                    <div ref={contentRef} className="!my-4 overflow-y-auto py-1">
                        {receipt ? <CashOfficeHandoverReceipt receipt={receipt} /> : null}
                    </div>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
}
