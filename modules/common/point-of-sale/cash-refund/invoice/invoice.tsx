import React, { Fragment } from 'react';
import { CashRefundInvoiceType } from '@/api-queries/point-of-sale/cash-refund';
import { useAuthUser } from '@/stores/auth-user.store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface CashSaleInvoiceTypeProp {
    printData: CashRefundInvoiceType;
    isDuplicate?: boolean;
}

const FS = {
    header: '11px',
    sub: '8px',
    body: '8.5px',
    small: '7.5px',
    tiny: '7px',
    total: '11px',
};
const FW = {
    normal: 400,
    medium: 500,
    bold: 600,
    heavy: 700,
} as const;

const CashSaleInvoice = ({ printData, isDuplicate = false }: CashSaleInvoiceTypeProp) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const { cartItems, cashRefund, invoiceDate, paymentMethod } = printData;
    const customerData = cashRefund.customer;
    // The create/list response carries the tender as `PosTenderType` (object). Older
    // payloads only had a `paymentSummary.tenderType` string; fall back to it so the
    // invoice never dereferences `description` on an undefined tender.
    //@ts-ignore
    const tenderDescription =
        (paymentMethod as { description?: string })?.description ||
        //@ts-ignore
        cashRefund?.paymentSummary?.tenderType ||
        //@ts-ignore
        cashRefund?.PosTenderType?.description ||
        'N/A';
    const formatCurrency = (amount: number) => {
        return `${currencySymbol} ${amount ? amount.toFixed(2) : Number(0).toFixed(2)}`;
    };

    const createDashedLine = (length: number = 32) => {
        return '-'.repeat(length);
    };

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
                    .cash-slip-root {
                        width: 80mm !important;
                        max-width: 80mm !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>

            <div
                className="cash-slip-root mx-auto flex items-center justify-center border-1 border-gray-200 bg-white"
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
                        {isDuplicate && (
                            <div
                                style={{
                                    fontSize: FS.small,
                                    fontWeight: FW.heavy,
                                    color: 'red',
                                    marginBottom: '4px',
                                }}
                            >
                                ***** Copy of Original *****
                            </div>
                        )}

                        <div style={{ fontSize: FS.header, fontWeight: FW.heavy, marginBottom: '5px' }}>
                            ***** CASH REFUND *****
                        </div>
                        <div style={{ fontSize: FS.sub, fontWeight: FW.normal }}>
                            {new Date(invoiceDate).toLocaleString()}
                        </div>

                        <div
                            style={{ marginTop: '3px', fontSize: FS.small, fontWeight: FW.normal }}
                            className="text-center"
                        >
                            {createDashedLine()}
                        </div>
                    </div>

                    {customerData && customerData.name ? (
                        <>
                            <div className="my-1 space-y-0.5" style={{ fontSize: FS.body, fontWeight: FW.normal }}>
                                <div>Customer: {customerData.name}</div>
                                {customerData.telNumber && (
                                    <div style={{ fontSize: FS.small }}>Phone: {customerData.telNumber}</div>
                                )}
                                {customerData.orderNumber && (
                                    <div style={{ fontSize: FS.small }}>Order No.: {customerData.orderNumber}</div>
                                )}
                                {customerData.address1 && (
                                    <div style={{ fontSize: FS.small }}>
                                        Address: {customerData.address1}
                                        {customerData.address2 ? `, ${customerData.address2}` : ''}
                                        {customerData.address3 ? `, ${customerData.address3}` : ''}
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: FS.small }} className="mb-1 text-center">
                                {createDashedLine()}
                            </div>
                        </>
                    ) : null}

                    <Table className="!w-full border-collapse">
                        <TableHeader>
                            <TableRow>
                                <TableHead
                                    className="p-0.5"
                                    style={{ fontSize: FS.small, fontWeight: FW.bold, color: '#000' }}
                                >
                                    #
                                </TableHead>
                                <TableHead
                                    className="p-0.5"
                                    style={{ fontSize: FS.small, fontWeight: FW.bold, color: '#000' }}
                                >
                                    Item
                                </TableHead>
                                <TableHead
                                    className="p-0.5 text-right"
                                    style={{ fontSize: FS.small, fontWeight: FW.bold, color: '#000' }}
                                >
                                    Excl.
                                    <br />({currencySymbol})
                                </TableHead>
                                <TableHead
                                    className="p-0.5 text-center"
                                    style={{ fontSize: FS.small, fontWeight: FW.bold, color: '#000' }}
                                >
                                    Tax
                                    <br />
                                    (%)
                                </TableHead>
                                <TableHead
                                    className="p-0.5 text-right"
                                    style={{ fontSize: FS.small, fontWeight: FW.bold, color: '#000' }}
                                >
                                    Incl.
                                    <br />({currencySymbol})
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {cartItems.map((item, idx) => (
                                <Fragment key={idx}>
                                    <TableRow>
                                        <TableCell
                                            className="p-0.5 align-top break-words whitespace-normal"
                                            style={{ fontSize: FS.small, fontWeight: FW.normal }}
                                        >
                                            {idx + 1}
                                        </TableCell>

                                        <TableCell
                                            className="p-0.5 align-top break-words whitespace-normal"
                                            style={{ fontSize: FS.small, fontWeight: FW.normal }}
                                        >
                                            {item.CompanyStockDetail?.description ||
                                                item.CompanyStockDetail?.itemCode ||
                                                'N/A'}
                                        </TableCell>

                                        <TableCell
                                            className="p-0.5 text-right align-top break-words whitespace-normal"
                                            style={{ fontSize: FS.tiny, fontWeight: FW.normal }}
                                        >
                                            {item?.selectedPricing?.priceExclusive
                                                ? item.selectedPricing.priceExclusive.toFixed(2)
                                                : (
                                                      Number(item.unitPrice ?? 0) /
                                                      (1 + (Number(item?.taxPercent) || 0) / 100)
                                                  ).toFixed(2)}
                                        </TableCell>

                                        <TableCell
                                            className="p-0.5 text-center align-top break-words whitespace-normal"
                                            style={{ fontSize: FS.tiny, fontWeight: FW.normal }}
                                        >
                                            {item?.CompanyStockDetail?.subCategory?.taxRate?.description ||
                                                item?.taxName ||
                                                'N/A'}{' '}
                                            <br />
                                            {item?.CompanyStockDetail?.subCategory?.taxRate?.taxRatePercent ||
                                                item?.taxPercent ||
                                                '0.00'}
                                        </TableCell>

                                        <TableCell
                                            className="p-0.5 text-right align-top break-words whitespace-normal"
                                            style={{ fontSize: FS.tiny, fontWeight: FW.normal }}
                                        >
                                            {(item?.selectedPricing?.priceInclusive ?? item.unitPrice).toFixed(2)}
                                            <br />x{item.quantity}
                                        </TableCell>
                                    </TableRow>

                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="p-0.5 text-right align-top break-words whitespace-normal"
                                            style={{ fontSize: FS.tiny, fontWeight: FW.normal }}
                                        >
                                            <div className="flex justify-between">
                                                <div>
                                                    {item.lineComment && (
                                                        <div style={{ fontWeight: FW.normal }}>
                                                            Comment: {item.lineComment}
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ fontWeight: FW.bold }}>{item.lineTotal?.toFixed(2)}</div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>

                    <div style={{ marginBottom: '5px', fontSize: FS.body }}>
                        <div
                            style={{
                                display: 'flex',
                                paddingTop: '4px',
                                justifyContent: 'space-between',
                                borderTop: '1px solid #000',
                                fontWeight: FW.heavy,
                                fontSize: FS.total,
                            }}
                        >
                            <span>Amount Refunded:</span>
                            <span>{formatCurrency(cashRefund.tenderValue - (cashRefund?.changeDue || 0))}</span>
                        </div>
                    </div>

                    <div style={{ marginBottom: '5px', fontSize: FS.body }}>
                        <div style={{ fontSize: FS.small }} className="text-center">
                            {createDashedLine()}
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: '3px',
                                fontWeight: FW.bold,
                            }}
                        >
                            <span>Payment Method:</span>
                            <span>{tenderDescription}</span>
                        </div>

                        {cashRefund.changeDue && cashRefund.changeDue > 0 && (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontWeight: FW.bold,
                                }}
                            >
                                <span>Change Received:</span>
                                <span>{formatCurrency(cashRefund.changeDue)}</span>
                            </div>
                        )}

                        {cashRefund.reference && (
                            <div style={{ fontSize: FS.small, marginTop: '3px', fontWeight: FW.normal }}>
                                Cheque Ref: {cashRefund.reference}
                            </div>
                        )}

                        {cashRefund.cardNumber && (
                            <div className="flex justify-between" style={{ fontWeight: FW.normal }}>
                                <span>Card</span>
                                <span>
                                    {cashRefund.cardNumber.slice(0, 4).padEnd(cashRefund.cardNumber.length, 'X')}
                                </span>
                            </div>
                        )}
                    </div>

                    <div
                        style={{
                            marginTop: '4px',
                            paddingTop: '4px',
                            borderTop: '1px solid #000',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontWeight: FW.heavy,
                                fontSize: FS.total,
                            }}
                        >
                            <span>TOTAL:</span>
                            <span>{formatCurrency(cashRefund.tenderValue)}</span>
                        </div>
                    </div>

                    <div
                        style={{ marginTop: '3px', fontSize: FS.small, fontWeight: FW.normal }}
                        className="text-center"
                    >
                        {createDashedLine()}
                    </div>

                    <div style={{ fontSize: FS.body }}>
                        <div style={{ fontWeight: FW.heavy }}>RETURN REASON:</div>
                        <div style={{ fontWeight: FW.normal }}>{cashRefund.refundReason}</div>
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
};

export default CashSaleInvoice;
