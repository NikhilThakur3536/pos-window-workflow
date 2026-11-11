import React from 'react';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment';
import { CreditNoteInvoiceType } from '@/api-queries/credit-note';

export interface CreditNoteInvoiceProps {
    printData: CreditNoteInvoiceType;
}
const CreditNoteInvoice = ({ printData }: CreditNoteInvoiceProps) => {
    const companyDetails = useAuthUser((state) => state?.company);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const { creditNote, cartItems, accountNumber } = printData;

    const creditDate = creditNote.creditNoteDate ? moment(creditNote.creditNoteDate).format('DD/MM/YYYY') : 'N/A';

    // Number of items = total quantity across all lines (matches the sample's "Number of Items" box)
    const numberOfItems = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const subtotalExclusive = Number(creditNote.goodsTotal ?? 0);
    const discountAmount = Number(creditNote.discountAmount ?? 0);
    const vatAmount = Number(creditNote.taxAmount ?? 0);
    const grandTotal = subtotalExclusive - discountAmount + vatAmount;

    const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '0.00');

    return (
        <section className="cn-page">
            <div className="cn-watermark">CREDIT NOTE</div>

            <div className="cn-page-content">
                <div className="cn-doc-title">Credit Note</div>

                <div className="cn-top-grid">
                    <div>
                        <div className="cn-section-label">Credit From</div>
                        <div>{companyDetails?.companyName || 'N/A'}</div>
                        <div>{companyDetails?.addressLineOne || 'N/A'}</div>
                        {companyDetails?.addressLineTwo && <div>{companyDetails.addressLineTwo}</div>}
                        {companyDetails?.city && <div>{companyDetails.city}</div>}
                    </div>
                    <div className="cn-contact-grid">
                        <div>Telephone</div>
                        <div>{companyDetails?.telephone || 'N/A'}</div>
                        <div>Fax</div>
                        <div>{companyDetails?.fax || 'N/A'}</div>
                        <div>E Mail</div>
                        <div>{companyDetails?.emailAddress || 'N/A'}</div>
                        <div>Vat Registration No</div>
                        <div>{companyDetails?.vatRegistrationNumber || 'N/A'}</div>
                        <div>Credit Date</div>
                        <div>{creditDate}</div>
                    </div>
                </div>

                <div className="cn-party-grid">
                    <div>
                        <div className="cn-section-label">Credit To</div>
                        <div>{creditNote.name || 'N/A'}</div>
                        <div>{creditNote.address || 'N/A'}</div>
                    </div>
                    <div>
                        <div className="cn-section-label">Deliver To</div>
                        <div>{creditNote.deliverToName || creditNote.name || 'N/A'}</div>
                        <div>{creditNote.deliverToAddress || creditNote.address || 'N/A'}</div>
                    </div>
                </div>

                <table className="cn-meta">
                    <thead>
                        <tr>
                            <th>Account No</th>
                            <th>Credit Date</th>
                            <th>Order Number</th>
                            <th>Representative</th>
                            <th>Cashier</th>
                            <th>Credit Number</th>
                            <th>Page</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{accountNumber || 'N/A'}</td>
                            <td>{creditDate}</td>
                            <td>{creditNote.orderNumber || 'N/A'}</td>
                            <td>{creditNote.representative || 'N/A'}</td>
                            <td>{creditNote.cashier || 'N/A'}</td>
                            <td>{creditNote.creditNoteNumber || 'N/A'}</td>
                            <td>1 of 1</td>
                        </tr>
                    </tbody>
                </table>

                <table className="cn-items">
                    <thead>
                        <tr>
                            <th>Item Code</th>
                            <th>Description</th>
                            <th className="cn-num">Quantity</th>
                            <th className="cn-num">Unit Price</th>
                            <th className="cn-num">Disc %</th>
                            <th className="cn-num">VatAmnt</th>
                            <th className="cn-num">Line Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cartItems.map((item, idx) => {
                            const taxPercent =
                                item?.CompanyStockDetail?.subCategory?.taxRate?.taxRatePercent ?? item?.taxPercent ?? 0;
                            const lineTotal = Number(item.lineTotal ?? 0);
                            const discountPercent = item.discountPercent ?? item.discount ?? '';
                            const lineVatAmount =
                                item.taxAmount != null
                                    ? Number(item.taxAmount)
                                    : (lineTotal * Number(taxPercent)) / (100 + Number(taxPercent));

                            return (
                                <tr key={idx}>
                                    <td>{item.CompanyStockDetail?.itemCode || 'N/A'}</td>
                                    <td>{item.CompanyStockDetail?.description || 'N/A'}</td>
                                    <td className="cn-num">{Number(item.quantity ?? 0).toFixed(2)}</td>
                                    <td className="cn-num">{fmt(Number(item.unitPrice ?? 0))}</td>
                                    <td className="cn-num">{discountPercent !== '' ? discountPercent : ''}</td>
                                    <td className="cn-num">{fmt(lineVatAmount)}</td>
                                    <td className="cn-num">{fmt(lineTotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="cn-footer">
                <div className="cn-footer-spacer" />
                <div className="cn-item-count-box">
                    <div>Number of Items</div>
                    <div className="cn-item-count-value">{numberOfItems}</div>
                </div>
                <table className="cn-totals">
                    <tbody>
                        <tr>
                            <td>Subtotal (Exclusive)</td>
                            <td className="cn-num">{fmt(subtotalExclusive)}</td>
                        </tr>
                        <tr>
                            <td>Discount</td>
                            <td className="cn-num">{discountAmount ? fmt(discountAmount) : ''}</td>
                        </tr>
                        <tr>
                            <td>Vat</td>
                            <td className="cn-num">{fmt(vatAmount)}</td>
                        </tr>
                        <tr className="cn-grand">
                            <td>Total</td>
                            <td className="cn-num">{fmt(grandTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="cn-created">Created: {moment().format('DD/MM/YYYY HH:mm:ss')}</div>
            <div className="cn-till">
                {creditNote.till || 'TILL'} <span style={{ float: 'right' }}>{creditNote.cashier || ''}</span>
            </div>

            <style>{`
                .cn-page * { box-sizing: border-box; }
                @page { size: A4 portrait; margin: 8mm; }
                .cn-page {
                    position: relative;
                    width: 100%;
                    height: 281mm;
                    overflow: hidden;
                    background: #fff;
                    margin: 0;
                    color: #000;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 10px;
                    line-height: 1.2;
                    font-weight: 500;
                }
                .cn-page-content {
                    position: relative;
                    z-index: 1;
                    padding: 0 1mm 58mm;
                }
                .cn-doc-title {
                    border: 1px solid #000;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 1.2mm 0;
                    margin-bottom: 4mm;
                }
                .cn-top-grid,
                .cn-party-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1mm;
                }
                .cn-top-grid { margin-bottom: 1mm; min-height: 45mm; }
                .cn-party-grid { margin: 1mm 0 3mm; min-height: 45mm; }
                .cn-top-grid > div,
                .cn-party-grid > div {
                    border: 1px solid #000;
                    border-radius: 7px;
                    padding: 3.8mm 5mm;
                    overflow: hidden;
                }
                .cn-section-label {
                    font-weight: 700;
                    text-align: center;
                    margin-bottom: 5mm;
                }
                .cn-contact-grid {
                    display: grid;
                    grid-template-columns: 28mm 1fr;
                    gap: 1mm 2mm;
                }
                .cn-meta {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 0 0 6mm;
                    table-layout: fixed;
                }
                .cn-meta th,
                .cn-meta td {
                    padding: 1.2mm 1mm;
                    text-align: left;
                    font-weight: 400;
                    overflow-wrap: anywhere;
                }
                .cn-meta th { font-weight: 700; }
                .cn-items {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                }
                .cn-items th {
                    padding: 1mm .8mm;
                    text-align: left;
                    font-weight: 700;
                    border: 1px solid #000;
                }
                .cn-items td {
                    padding: .95mm .8mm;
                    vertical-align: top;
                    overflow-wrap: anywhere;
                }
                .cn-items th:nth-child(1), .cn-items td:nth-child(1) { width: 29mm; }
                .cn-items th:nth-child(2), .cn-items td:nth-child(2) { width: auto; }
                .cn-items th:nth-child(3), .cn-items td:nth-child(3) { width: 17mm; }
                .cn-items th:nth-child(4), .cn-items td:nth-child(4) { width: 20mm; }
                .cn-items th:nth-child(5), .cn-items td:nth-child(5) { width: 17mm; }
                .cn-items th:nth-child(6), .cn-items td:nth-child(6) { width: 18mm; }
                .cn-items th:nth-child(7), .cn-items td:nth-child(7) { width: 22mm; }
                .cn-num { text-align: right; white-space: nowrap; }
                .cn-footer {
                    display: grid;
                    grid-template-columns: 1fr 45mm 76mm;
                    gap: 5mm;
                    position: absolute;
                    left: 1mm;
                    right: 1mm;
                    bottom: 37mm;
                    min-height: 38mm;
                    z-index: 2;
                }
                .cn-footer-spacer { min-height: 28mm; }
                .cn-item-count-box {
                    border: 1px solid #000;
                    min-height: 38mm;
                    padding: 5mm 3mm;
                    text-align: center;
                    font-size: 13px;
                    background: #fff;
                }
                .cn-item-count-value {
                    margin-top: 18mm;
                    font-size: 11px;
                    font-weight: 700;
                }
                .cn-totals {
                    width: 100%;
                    min-height: 38mm;
                    border: 1px solid #000;
                    border-collapse: separate;
                    border-spacing: 0;
                    padding: 4mm;
                    background: #fff;
                }
                .cn-totals td { padding: 1.7mm 0; }
                .cn-totals .cn-grand td {
                    font-weight: 700;
                    padding-top: 2mm;
                }
                .cn-created {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    bottom: 24mm;
                    font-size: 9px;
                    z-index: 3;
                }
                .cn-till {
                    position: absolute;
                    left: 1mm;
                    right: 1mm;
                    bottom: 4mm;
                    font-weight: 700;
                    z-index: 3;
                }
                .cn-watermark {
                    position: absolute;
                    inset: 48mm 16mm 58mm 22mm;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transform: rotate(-48deg);
                    font-size: 86px;
                    letter-spacing: 8px;
                    color: rgba(0,0,0,.18);
                    font-weight: 700;
                    pointer-events: none;
                    z-index: 0;
                    white-space: nowrap;
                }
            `}</style>
        </section>
    );
};

export default CreditNoteInvoice;