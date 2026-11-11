import React from 'react';
import { useAuthUser } from '@/stores/auth-user.store';
import { DebtorReceiptDetails } from '@/api-queries/debtor/receipts';

export interface DebtorReceiptTypeProp {
    printData: DebtorReceiptDetails;
}

const DebtorReceipt = ({ printData }: DebtorReceiptTypeProp) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    // console.log("print data ",printData)
    const { CompanyDebtor: debtor, PosTenderType: paymentMethod } = printData;
    const receiptDateTime = printData?.updatedAt
    // console.log("receit Date",receiptDate)

    const formatCurrency = (amount: number) => {
        return `${currencySymbol} ${amount ? amount.toFixed(2) : Number(0).toFixed(2)}`;
    };

    const createDashedLine = (length: number = 32) => {
        return '-'.repeat(length);
    };

    return (
        <div
            className="mx-auto flex w-[304px] items-center justify-center border-1 border-gray-200 bg-white p-4"
            style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '12px',
                lineHeight: '1.2',
            }}
        >
            <div className="w-full">
                <div className="text-center">
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                        ***** DEBTOR RECEIPT *****
                    </div>
                    {/* <div style={{ fontSize: '10px' }}>{new Date(receiptDate).toLocaleString()}</div> */}
<div style={{ fontSize: '10px' }}>
    {receiptDateTime 
        ? new Date(receiptDateTime).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })
        : 'N/A'}
</div>
                    <div style={{ marginTop: '4px' }} className="text-center">
                        {createDashedLine()}
                    </div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                    <div>Customer: {debtor.name}</div>
                    {debtor.cellphoneNumber && <div>Phone: {debtor.cellphoneNumber}</div>}
                    <div className="text-center">{createDashedLine()}</div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}
                    >
                        <span>Subtotal:</span>
                        <span>{formatCurrency(printData.amount)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Discount:</span>
                        <span>
                            -{currencySymbol} {printData.discount ? printData.discount.toFixed(2) : `0.00`}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Actual Credit on Account:</span>
                        <span>
                            -{currencySymbol} {printData.actualCreditOnAccount.toFixed(2)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Applied Discount:</span>
                        <span>
                            -{currencySymbol} {printData.manualDiscount ? printData.manualDiscount.toFixed(2) : `0.00`}
                        </span>
                    </div>

                    {printData.couponAmount && printData.couponAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{printData?.Coupon?.description || 'Coupon Discount :'}</span>
                            <span>-{formatCurrency(printData.couponAmount)}</span>
                        </div>
                    )}

                    {printData.voucherAmount && printData.voucherAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{printData?.Voucher?.description || 'Voucher Discount :'}</span>
                            <span>-{formatCurrency(printData.voucherAmount)}</span>
                        </div>
                    )}

                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #000' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontWeight: 'bold',
                                fontSize: '14px',
                            }}
                        >
                            <span>TOTAL:</span>
                            <span>{formatCurrency(printData.tenderValue)}</span>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                    <div className="text-center">{createDashedLine()}</div>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: '4px',
                            fontWeight: 'bold',
                        }}
                    >
                        <span>Payment Method:</span>
                        <span>{paymentMethod.description}</span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontWeight: 'bold',
                        }}
                    >
                        <span>Actual Credit Amount:</span>
                        <span>{formatCurrency(printData.tenderValue)}</span>
                    </div>

                    {printData.changeDue && printData.changeDue > 0 ? (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontWeight: 'bold',
                            }}
                        >
                            <span>Change Due:</span>
                            <span>{formatCurrency(printData.changeDue)}</span>
                        </div>
                    ) : null}

                    {printData.reference && (
                        <div style={{ fontSize: '11.5x', marginTop: '4px' }}>Cheque Ref: {printData.reference}</div>
                    )}

                    {printData?.cardNumber ? (
                        <div className="flex justify-between">
                            <span>Card</span>
                            {printData?.cardNumber.slice(0, 4).padEnd(printData.cardNumber.length, 'X')}
                        </div>
                    ) : null}
                </div>

                <div className="text-center" style={{ fontSize: '10px', marginTop: '12px' }}>
                    <div className="text-center" style={{ fontSize: '12px' }}>
                        {createDashedLine()}
                    </div>
                    <div style={{ marginTop: '4px' }}>Thank you for your business!</div>
                    <div style={{ marginTop: '4px' }}>© All rights reserved</div>
                </div>

                <div className="pointer-events-none mt-2 flex items-center justify-center">
                    <img
                        src="/assets/images/onetouch-logo.jpg"
                        alt="Watermark"
                        className="max-h-[150px] max-w-[150px] rounded-full object-contain"
                    />
                </div>
            </div>
        </div>
    );
};

export default DebtorReceipt;
