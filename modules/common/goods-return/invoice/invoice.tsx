import React from 'react';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment';
import { DebitNoteInvoiceType } from '@/api-queries/debit-note';

export interface DebitNoteInvoiceProps {
    printData: DebitNoteInvoiceType;
}

const DebitNoteInvoice = ({ printData }: DebitNoteInvoiceProps) => {
    const companyDetails = useAuthUser((state) => state?.company);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    console.log("print data",printData)
    const { debitNote = {}, accountNumber: accountNumberProp } = printData ?? {};
    const cartItems = printData?.cartItems ?? debitNote?.debitNoteItems ?? [];
    const creditor = debitNote?.CompanyCreditor;

    const accountNumber = accountNumberProp ?? creditor?.accountNumber;

    const debitDate = debitNote?.debitNoteDate ? moment(debitNote.debitNoteDate).format('DD/MM/YYYY') : 'N/A';

    // Prefer the API's own total, fall back to summing line quantities
    const numberOfItems =
        debitNote?.totalQuantity ?? cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const discountAmount = Number(debitNote?.discountAmount ?? 0);
    const vatAmount = Number(debitNote?.taxAmount ?? 0);

    const subtotalExclusive = cartItems.length
        ? cartItems.reduce((sum, item) => {
              const taxable =
                  item.taxableAmount != null
                      ? Number(item.taxableAmount)
                      : Number(item.lineTotal ?? 0) - Number(item.taxAmount ?? 0);
              return sum + taxable;
          }, 0)
        : Number(debitNote?.goodsTotal ?? 0) - vatAmount;

    const grandTotal = debitNote?.debitNoteInclusive
        ? Number(debitNote?.goodsTotal ?? 0)
        : subtotalExclusive - discountAmount + vatAmount;

    const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '0.00');

    const deliverToName =
        debitNote?.deliverToName || creditor?.name || debitNote?.name || 'N/A';
    const deliverToAddress =
        debitNote?.deliverToAddress ||
        debitNote?.deliveredTo ||
        debitNote?.deliveryLocation ||
        creditor?.deliveryAddress ||
        debitNote?.address ||
        'N/A';

    return (
        <section className="dn-page">
            <div className="dn-page-content">
                <div className="dn-doc-title">Debit Note</div>

                <div className="dn-top-grid">
                    <div>
                        <div className="dn-section-label">Debit From</div>
                        <div>{companyDetails?.companyName || 'N/A'}</div>
                        <div>{companyDetails?.addressLineOne || 'N/A'}</div>
                        {companyDetails?.addressLineTwo && <div>{companyDetails.addressLineTwo}</div>}
                        {companyDetails?.city && <div>{companyDetails.city}</div>}
                        {companyDetails?.province && <div>{companyDetails.province}</div>}
                        {companyDetails?.postalCode && <div>{companyDetails.postalCode}</div>}
                    </div>
                    <div className="dn-contact-grid">
                        <div>Telephone</div>
                        <div>{companyDetails?.telephone || 'N/A'}</div>
                        <div>Fax</div>
                        <div>{companyDetails?.fax || 'N/A'}</div>
                        <div>E Mail</div>
                        <div>{companyDetails?.emailAddress || 'N/A'}</div>
                        <div>Vat Registration No</div>
                        <div>{companyDetails?.vatRegistrationNumber || 'N/A'}</div>
                        <div>Debit Date</div>
                        <div>{debitDate}</div>
                    </div>
                </div>

                <div className="dn-party-grid">
                    <div>
                        <div className="dn-section-label">Debit To</div>
                        <div>{debitNote?.name || 'N/A'}</div>
                        <div>{debitNote?.address || 'N/A'}</div>
                    </div>
                    <div>
                        <div className="dn-section-label">Deliver To</div>
                        <div>{deliverToName}</div>
                        <div>{deliverToAddress}</div>
                    </div>
                </div>

                <table className="dn-meta">
                    <thead>
                        <tr>
                            <th>Account No</th>
                            <th>Debit Date</th>
                            <th>Order Number</th>
                            <th>Representative</th>
                            <th>Debit Number</th>
                            <th>Page</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{accountNumber || 'N/A'}</td>
                            <td>{debitDate}</td>
                            <td>{debitNote?.orderNumber || ''}</td>
                            <td>{debitNote?.SalesRepresentative?.name || ''}</td>
                            <td>{debitNote?.debitNoteNumber || 'N/A'}</td>
                            <td>1 of 1</td>
                        </tr>
                    </tbody>
                </table>

                <table className="dn-items">
                    <thead>
                        <tr>
                            <th>Item Code</th>
                            <th>Description</th>
                            <th className="dn-num">Quantity</th>
                            <th className="dn-num">Unit Price</th>
                            <th className="dn-num">Disc %</th>
                            <th className="dn-num">VatAmnt</th>
                            <th className="dn-num">Line Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cartItems.map((item, idx) => {
                            const taxPercent =
                                item?.CompanyStockDetail?.subCategory?.taxRate?.taxRatePercent ?? item?.taxPercent ?? 0;
                            const lineTotal = Number(item.lineTotal ?? 0);
                            const discountPercent = item.discountPercent ?? item.discount ?? 0;
                            const lineVatAmount =
                                item.taxAmount != null
                                    ? Number(item.taxAmount)
                                    : (lineTotal * Number(taxPercent)) / (100 + Number(taxPercent));

                            return (
                                <tr key={item.id ?? idx}>
                                    <td>{item.CompanyStockDetail?.itemCode || item.itemCode || 'N/A'}</td>
                                    <td>{item.CompanyStockDetail?.description || item.description || 'N/A'}</td>
                                    <td className="dn-num">{Number(item.quantity ?? 0).toFixed(2)}</td>
                                    <td className="dn-num">{fmt(Number(item.unitPrice ?? 0))}</td>
                                    <td className="dn-num">{Number(discountPercent).toFixed(2)}%</td>
                                    <td className="dn-num">{fmt(lineVatAmount)}</td>
                                    <td className="dn-num">{fmt(lineTotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="dn-footer">
                <div className="dn-footer-spacer" />
                <div className="dn-item-count-box">
                    <div>Number of Items</div>
                    <div className="dn-item-count-value">{numberOfItems}</div>
                </div>
                <table className="dn-totals">
                    <tbody>
                        <tr>
                            <td>Subtotal (Exclusive)</td>
                            <td className="dn-num">{fmt(subtotalExclusive)}</td>
                        </tr>
                        <tr>
                            <td>Discount</td>
                            <td className="dn-num">{fmt(discountAmount)}</td>
                        </tr>
                        <tr>
                            <td>Vat</td>
                            <td className="dn-num">{fmt(vatAmount)}</td>
                        </tr>
                        <tr className="dn-grand">
                            <td>Total</td>
                            <td className="dn-num">{fmt(grandTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="dn-created">
                Created: {debitNote?.createdAt ? moment(debitNote.createdAt).format('DD/MM/YYYY HH:mm:ss') : moment().format('DD/MM/YYYY HH:mm:ss')}
            </div>

            <style>{`
                .dn-page * { box-sizing: border-box; }
                @page { size: A4 portrait; margin: 8mm; }
                .dn-page {
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
                .dn-page-content {
                    position: relative;
                    z-index: 1;
                    padding: 0 1mm 58mm;
                }
                .dn-doc-title {
                    border: 1px solid #000;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 1.2mm 0;
                    margin-bottom: 4mm;
                }
                .dn-top-grid,
                .dn-party-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1mm;
                }
                .dn-top-grid { margin-bottom: 1mm; min-height: 45mm; }
                .dn-party-grid { margin: 1mm 0 3mm; min-height: 45mm; }
                .dn-top-grid > div,
                .dn-party-grid > div {
                    border: 1px solid #000;
                    border-radius: 7px;
                    padding: 3.8mm 5mm;
                    overflow: hidden;
                }
                .dn-section-label {
                    font-weight: 700;
                    text-align: center;
                    margin-bottom: 5mm;
                }
                .dn-contact-grid {
                    display: grid;
                    grid-template-columns: 28mm 1fr;
                    gap: 1mm 2mm;
                }
                .dn-meta {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 0 0 6mm;
                    table-layout: fixed;
                }
                .dn-meta th,
                .dn-meta td {
                    padding: 1.2mm 1mm;
                    text-align: left;
                    font-weight: 400;
                    overflow-wrap: anywhere;
                }
                .dn-meta th { font-weight: 700; }
                .dn-items {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                }
                .dn-items th {
                    padding: 1mm .8mm;
                    text-align: left;
                    font-weight: 700;
                    border: 1px solid #000;
                }
                .dn-items td {
                    padding: .95mm .8mm;
                    vertical-align: top;
                    overflow-wrap: anywhere;
                }
                .dn-items th:nth-child(1), .dn-items td:nth-child(1) { width: 29mm; }
                .dn-items th:nth-child(2), .dn-items td:nth-child(2) { width: auto; }
                .dn-items th:nth-child(3), .dn-items td:nth-child(3) { width: 17mm; }
                .dn-items th:nth-child(4), .dn-items td:nth-child(4) { width: 20mm; }
                .dn-items th:nth-child(5), .dn-items td:nth-child(5) { width: 17mm; }
                .dn-items th:nth-child(6), .dn-items td:nth-child(6) { width: 18mm; }
                .dn-items th:nth-child(7), .dn-items td:nth-child(7) { width: 22mm; }
                .dn-num { text-align: right; white-space: nowrap; }
                .dn-footer {
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
                .dn-footer-spacer { min-height: 28mm; }
                .dn-item-count-box {
                    border: 1px solid #000;
                    min-height: 38mm;
                    padding: 5mm 3mm;
                    text-align: center;
                    font-size: 13px;
                    background: #fff;
                }
                .dn-item-count-value {
                    margin-top: 18mm;
                    font-size: 11px;
                    font-weight: 700;
                }
                .dn-totals {
                    width: 100%;
                    min-height: 38mm;
                    border: 1px solid #000;
                    border-collapse: separate;
                    border-spacing: 0;
                    padding: 4mm;
                    background: #fff;
                }
                .dn-totals td { padding: 1.7mm 0; }
                .dn-totals .dn-grand td {
                    font-weight: 700;
                    padding-top: 2mm;
                }
                .dn-created {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    bottom: 24mm;
                    font-size: 9px;
                    z-index: 3;
                }
            `}</style>
        </section>
    );
};

export default DebitNoteInvoice;