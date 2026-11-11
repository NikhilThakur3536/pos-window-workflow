import React, { Fragment } from 'react';
import { CashSaleInvoiceType } from '@/api-queries/point-of-sale/cash-sales';
import { useAuthUser } from '@/stores/auth-user.store';
import { VoidSaleInvoiceType } from '@/api-queries/point-of-sale/void-cash-sales';
import { SuspendedSaleInvoiceType } from '@/api-queries/point-of-sale/suspended-sales';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface CashSaleInvoiceTypeProp {
    type?: 'CASH';
    printData: CashSaleInvoiceType;
    isDuplicate?: boolean;
}

export interface VoidSaleInvoiceTypeProp {
    type?: 'VOID';
    printData: VoidSaleInvoiceType;
    isDuplicate?: boolean;
}

export interface SuspendedSaleInvoiceTypeProp {
    type?: 'SUSPENDED';
    printData: SuspendedSaleInvoiceType;
    isDuplicate?: boolean;
}

export type InvoiceProps = CashSaleInvoiceTypeProp | VoidSaleInvoiceTypeProp | SuspendedSaleInvoiceTypeProp;

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

const CashSaleInvoice = ({ printData, type = 'CASH', isDuplicate = false }: InvoiceProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    let customerData:
        CashSaleInvoiceType['cashSales']['customer'] | VoidSaleInvoiceType['voidSales']['customer'] | undefined;

    if (type === 'CASH') {
        customerData = (printData as CashSaleInvoiceType).cashSales.customer;
    } else if (type === 'VOID') {
        customerData = (printData as VoidSaleInvoiceType).voidSales.customer;
    } else {
        customerData = undefined;
    }

    const { cartItems, debtor, invoiceDate } = printData;

    let loyaltyDiscountAmount = 0;
    if ((printData as CashSaleInvoiceType).cashSales) {
        ({
            cashSales: { loyaltyDiscountAmount = 0 },
        } = printData as CashSaleInvoiceType);
    }

    const formatCurrency = (amount: number) => {
        return `${currencySymbol} ${amount ? amount.toFixed(2) : Number(0).toFixed(2)}`;
    };

    const formatLine = (text: string, maxLength: number = 32) => {
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    };

    const createDashedLine = (length: number = 32) => {
        return '-'.repeat(length);
    };

    const getHeaderTitle = () => {
        switch (type) {
            case 'VOID':
                return 'VOIDED SALE';
            case 'SUSPENDED':
                return 'SUSPENDED SALE';
            default:
                return 'CASH SLIP';
        }
    };

    const cartTotal = cartItems.reduce(
        (acc, item) => acc + ((item.lineTotal ?? item.quantity * item.unitPrice) - (item?.discount || 0)),
        0,
    );

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
                            ***** {getHeaderTitle()} *****
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

                    {type === 'VOID' &&
                        (() => {
                            const salesData = printData as VoidSaleInvoiceType;
                            return (
                                <>
                                    <div style={{ fontSize: FS.body, fontWeight: FW.normal }}>
                                        <span style={{ fontWeight: FW.bold }}>Reason:</span>{' '}
                                        {salesData?.voidSales?.reason || 'N/A'}
                                    </div>
                                    <div
                                        style={{ marginTop: '3px', fontSize: FS.small, fontWeight: FW.normal }}
                                        className="text-center"
                                    >
                                        {createDashedLine()}
                                    </div>
                                </>
                            );
                        })()}

                    {debtor ? (
                        <div style={{ marginBottom: '5px', fontSize: FS.body, fontWeight: FW.normal }}>
                            <div>Customer: {debtor.name}</div>
                            {debtor.cellphoneNumber && <div>Phone: {debtor.cellphoneNumber}</div>}
                            <div style={{ fontSize: FS.small }} className="text-center">
                                {createDashedLine()}
                            </div>
                        </div>
                    ) : type === 'SUSPENDED' ? (
                        (() => {
                            const { suspendedSales } = printData as SuspendedSaleInvoiceType;
                            const { customerName, customerPhoneNumber } = suspendedSales;

                            return (
                                <>
                                    <div
                                        className="my-1 space-y-0.5"
                                        style={{ fontSize: FS.body, fontWeight: FW.normal }}
                                    >
                                        <div>Customer: {customerName}</div>
                                        {customerPhoneNumber && (
                                            <div style={{ fontSize: FS.small }}>Phone: {customerPhoneNumber}</div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: FS.small }} className="mb-1 text-center">
                                        {createDashedLine()}
                                    </div>
                                </>
                            );
                        })()
                    ) : customerData && customerData.name ? (
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
                                            {item.CompanyStockDetail.description}{' '}
                                            {(item as CashSaleInvoiceType['cartItems'][number])?.isFree ? '(Free)' : ''}
                                            {item.stockDispositionId ? (
                                                <>
                                                    <br />
                                                    <span style={{ fontSize: FS.tiny, fontWeight: FW.bold }}>
                                                        NST {(item.dispositionType || '').replace(/_/g, ' ')}
                                                        {item.originalUnitPrice != null
                                                            ? ` (was ${currencySymbol}${item.originalUnitPrice})`
                                                            : ''}
                                                    </span>
                                                </>
                                            ) : null}
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
                                            <br />x
                                            {(item as CashSaleInvoiceType['cartItems'][number])?.isFree
                                                ? (item as CashSaleInvoiceType['cartItems'][number])?.freeQuantity
                                                : item.quantity}
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

                                                <div>
                                                    {item.discount > 0 ? (
                                                        <>
                                                            <span style={{ fontWeight: FW.normal }}>
                                                                -{item.discount.toFixed(2)}
                                                            </span>
                                                            <br />
                                                        </>
                                                    ) : null}

                                                    <span style={{ fontWeight: FW.bold }}>
                                                        {(item as CashSaleInvoiceType['cartItems'][number])?.isFree
                                                            ? '0.00'
                                                            : item.lineTotal?.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>

                    {type === 'CASH' ? (
                        (() => {
                            const { cashSales, paymentMethod, appliedDiscount } = printData as CashSaleInvoiceType;
                            const payments = (cashSales as any)?.payments;
                            const paymentSummary = (cashSales as any)?.paymentSummary;
                            const hasSplitPayments = Array.isArray(payments) && payments.length > 0;

                            return (
                                <>
                                    <div style={{ marginBottom: '5px', fontSize: FS.body }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                paddingTop: '4px',
                                                justifyContent: 'space-between',
                                                borderTop: '1px solid #000',
                                                fontWeight: FW.normal,
                                            }}
                                        >
                                            <span>Subtotal:</span>
                                            <span>
                                                {formatCurrency(
                                                    cashSales.tenderValue +
                                                        (cashSales.manualDiscount || 0) +
                                                        (cashSales.couponAmount || 0) +
                                                        (cashSales.voucherAmount || 0) +
                                                        +(cashSales?.promotionDiscountAmount || 0) +
                                                        (loyaltyDiscountAmount || 0),
                                                )}
                                            </span>
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontWeight: FW.normal,
                                            }}
                                        >
                                            <span className="flex max-w-[130px] items-start gap-1">
                                                • Applied Discount:
                                            </span>
                                            <span>
                                                -{currencySymbol}{' '}
                                                {cashSales.manualDiscount
                                                    ? cashSales.manualDiscount.toFixed(2)
                                                    : `0.00`}
                                            </span>
                                        </div>

                                        {cashSales.promotionDiscountAmount && +cashSales.promotionDiscountAmount > 0 ? (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontWeight: FW.normal,
                                                }}
                                            >
                                                <span className="flex max-w-[130px] items-start gap-1">
                                                    <span>• </span>
                                                    {cashSales?.promotionName}
                                                </span>
                                                <span>-{formatCurrency(+cashSales.promotionDiscountAmount)}</span>
                                            </div>
                                        ) : null}

                                        {cashSales.couponAmount && cashSales.couponAmount > 0 && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontWeight: FW.normal,
                                                }}
                                            >
                                                <span className="flex max-w-[130px] items-start gap-1">
                                                    <span>• </span>
                                                    {appliedDiscount?.description || 'Coupon Discount :'}
                                                </span>
                                                <span>-{formatCurrency(cashSales.couponAmount)}</span>
                                            </div>
                                        )}

                                        {cashSales.voucherAmount && cashSales.voucherAmount > 0 && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontWeight: FW.normal,
                                                }}
                                            >
                                                <span className="flex max-w-[130px] items-start gap-1">
                                                    <span>• </span>
                                                    {appliedDiscount?.description || 'Voucher Discount :'}
                                                </span>
                                                <span>-{formatCurrency(cashSales.voucherAmount)}</span>
                                            </div>
                                        )}

                                        {loyaltyDiscountAmount ? (
                                            <div className="flex justify-between" style={{ fontWeight: FW.normal }}>
                                                <span className="flex max-w-[130px] items-start gap-1">
                                                    <span>• </span>Loyalty Discount:
                                                </span>
                                                <span>
                                                    -{currencySymbol}{' '}
                                                    {loyaltyDiscountAmount.toFixed(2) ?? Number(0).toFixed(2)}
                                                </span>
                                            </div>
                                        ) : null}

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
                                                <span>{formatCurrency(cashSales.tenderValue)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '5px', fontSize: FS.body }}>
                                        <div style={{ fontSize: FS.small }} className="text-center">
                                            {createDashedLine()}
                                        </div>

                                        {hasSplitPayments ? (
                                            <>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginTop: '3px',
                                                        fontWeight: FW.bold,
                                                    }}
                                                >
                                                    <span>Payment Method:</span>
                                                    <span>
                                                        {paymentSummary?.tenderType || paymentMethod.description}
                                                    </span>
                                                </div>

                                                {payments.map((payment: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            fontWeight: FW.normal,
                                                        }}
                                                    >
                                                        <span>{payment?.tenderType}</span>
                                                        <span>{formatCurrency(payment?.amount)}</span>
                                                    </div>
                                                ))}

                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontWeight: FW.bold,
                                                    }}
                                                >
                                                    <span>Amount Tendered:</span>
                                                    <span>
                                                        {formatCurrency(
                                                            paymentSummary?.amountTendered ?? cashSales.tenderValue,
                                                        )}
                                                    </span>
                                                </div>

                                                {paymentSummary?.changeDue != null && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            fontWeight: FW.bold,
                                                        }}
                                                    >
                                                        <span>Change Due:</span>
                                                        <span>{formatCurrency(paymentSummary.changeDue)}</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginTop: '3px',
                                                        fontWeight: FW.bold,
                                                    }}
                                                >
                                                    <span>Payment Method:</span>
                                                    <span>{paymentMethod.description}</span>
                                                </div>

                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontWeight: FW.bold,
                                                    }}
                                                >
                                                    <span>Amount Paid:</span>
                                                    <span>{formatCurrency(cashSales.tenderValue)}</span>
                                                </div>

                                                {cashSales.changeDue != null && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            fontWeight: FW.bold,
                                                        }}
                                                    >
                                                        <span>Change Due:</span>
                                                        <span>{formatCurrency(cashSales.changeDue)}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {cashSales.reference && (
                                            <div
                                                style={{ fontSize: FS.small, marginTop: '3px', fontWeight: FW.normal }}
                                            >
                                                Cheque Ref: {cashSales.reference}
                                            </div>
                                        )}

                                        {cashSales.cardNumber && (
                                            <div className="flex justify-between" style={{ fontWeight: FW.normal }}>
                                                <span>Card</span>
                                                {cashSales.cardNumber
                                                    .slice(0, 4)
                                                    .padEnd(cashSales.cardNumber.length, 'X')}
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()
                    ) : (
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
                                <span>{formatCurrency(cartTotal)}</span>
                            </div>
                        </div>
                    )}

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
