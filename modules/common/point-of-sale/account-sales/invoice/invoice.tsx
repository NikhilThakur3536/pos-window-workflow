// import React from 'react';
// import { AccountSaleInvoiceType } from '@/api-queries/point-of-sale/account-sales/account-sales';
// import { QuotationInvoiceType } from '@/api-queries/point-of-sale/account-sales/quotations';
// import { SaleOrderInvoiceType } from '@/api-queries/point-of-sale/account-sales/sale-order';

// export interface AccountSalesInvoiceProps {
//     printData: AccountSaleInvoiceType | SaleOrderInvoiceType | QuotationInvoiceType;
// }

// /* ---------- helpers ---------- */

// const toNumber = (v: unknown): number => {
//     const n = typeof v === 'string' ? parseFloat(v) : (v as number);
//     return Number.isFinite(n) ? n : 0;
// };

// const formatMoney = (v: unknown): string => {
//     const n = toNumber(v);
//     return `R${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// };

// const formatNumber = (v: unknown, decimals = 2): string => {
//     const n = toNumber(v);
//     return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
// };

// const formatDate = (v?: string | null): string => {
//     if (!v) return '';
//     const d = new Date(v);
//     if (Number.isNaN(d.getTime())) return '';
//     const dd = String(d.getDate()).padStart(2, '0');
//     const mm = String(d.getMonth() + 1).padStart(2, '0');
//     const yyyy = d.getFullYear();
//     return `${dd}/${mm}/${yyyy}`;
// };

// const formatDateTime = (v?: string | null): string => {
//     if (!v) return '';
//     const d = new Date(v);
//     if (Number.isNaN(d.getTime())) return '';
//     const dd = String(d.getDate()).padStart(2, '0');
//     const mm = String(d.getMonth() + 1).padStart(2, '0');
//     const yyyy = d.getFullYear();
//     const hh = String(d.getHours()).padStart(2, '0');
//     const min = String(d.getMinutes()).padStart(2, '0');
//     const ss = String(d.getSeconds()).padStart(2, '0');
//     return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
// };

// /* ---------- component ---------- */

// const AccountSalesInvoice = ({ printData }: AccountSalesInvoiceProps) => {
//     // The three invoice payload shapes (account sale / sale order / quotation) all
//     // wrap their core record under a differently-named top-level key. Normalise here.
//     const data: any =
//         (printData as any)?.accountSales ??
//         (printData as any)?.saleOrder ??
//         (printData as any)?.quotation ??
//         printData ??
//         {};

//     const billingCompany = data?.BillingCompany ?? data?.CompanyDebtor?.BillingCompany ?? {};
//     const debtor = data?.CompanyDebtor ?? {};

//     const items: any[] = data?.DebtorInvoicingOrderItems ?? data?.items ?? (printData as any)?.cartItems ?? [];

//     const accountNumber = data?.accountNumber ?? debtor?.accountNumber ?? (printData as any)?.accountNumber ?? '';

//     const goodsTotal = toNumber(data?.goodsTotal);
//     const totalTax = toNumber(data?.totalTaxAmount ?? data?.taxAmount);
//     const discountAmount = toNumber(data?.discountAmount);
//     const subtotalExclusive = data?.invoiceInclusive ? goodsTotal - totalTax : goodsTotal;
//     const grandTotal = data?.invoiceInclusive ? goodsTotal : goodsTotal + totalTax;

//     const totalQuantity =
//         data?.totalQuantity ?? items.reduce((sum, it) => sum + toNumber(it?.quantity), 0);

//     return (
//         <div className="invoice-print-root">
//             <style>{`
//         .invoice-print-root * {
//           box-sizing: border-box;
//           margin: 0;
//           padding: 0;
//         }
//         .invoice-print-root {
//           background: #fff;
//           color: #000;
//           font-family: Arial, Helvetica, sans-serif;
//           font-size: 11px;
//           line-height: 1.18;
//         }
//         .invoice-print-root .page {
//           width: 210mm;
//           min-height: 297mm;
//           padding: 6mm 8mm 8mm;
//           margin: 0 auto;
//           background: #fff;
//           position: relative;
//         }
//         .invoice-print-root .header {
//           text-align: center;
//           font-size: 12px;
//           line-height: 1.2;
//           margin-bottom: 12px;
//         }
//         .invoice-print-root .header h1 {
//           font-size: 13px;
//           text-decoration: underline;
//           margin-bottom: 2px;
//         }
//         .invoice-print-root .header .company {
//           font-size: 12.5px;
//           font-weight: 700;
//           margin-top: 5px;
//         }
//         .invoice-print-root .meta-grid {
//           display: flex;
//           gap: 8px;
//           margin-bottom: 4px;
//         }
//         .invoice-print-root .box {
//           border: 1.3px solid #000;
//           border-radius: 8px;
//           min-height: 27mm;
//           padding: 4px 7px;
//           flex: 1;
//         }
//         .invoice-print-root .box h2 {
//           font-size: 12.5px;
//           margin-bottom: 8px;
//         }
//         .invoice-print-root .invoice-to {
//           display: flex;
//           min-height: 27mm;
//           flex-direction: column;
//           justify-content: space-between;
//         }
//         .invoice-print-root .details-row {
//           display: flex;
//           gap: 14px;
//           margin-bottom: 2px;
//         }
//         .invoice-print-root .details-row .label {
//           width: 92px;
//         }
//         .invoice-print-root .details-row .value {
//           min-width: 120px;
//         }
//         .invoice-print-root .items {
//           width: 100%;
//           border-collapse: collapse;
//           table-layout: fixed;
//           font-size: 10.4px;
//         }
//         .invoice-print-root .items thead th {
//           border-top: 1.3px solid #000;
//           border-bottom: 1.3px solid #000;
//           padding: 3px 3px 4px;
//           font-weight: 700;
//           text-align: left;
//         }
//         .invoice-print-root .items thead th:first-child {
//           border-left: 1.3px solid #000;
//         }
//         .invoice-print-root .items thead th:last-child {
//           border-right: 1.3px solid #000;
//         }
//         .invoice-print-root .items td {
//           padding: 2px 4px;
//           line-height: 1.08;
//           vertical-align: top;
//           overflow-wrap: anywhere;
//         }
//         .invoice-print-root .items th:nth-child(1), .invoice-print-root .items td:nth-child(1) { width: 13%; }
//         .invoice-print-root .items th:nth-child(2), .invoice-print-root .items td:nth-child(2) { width: 30%; }
//         .invoice-print-root .items th:nth-child(3), .invoice-print-root .items td:nth-child(3) { width: 9%; }
//         .invoice-print-root .items th:nth-child(4), .invoice-print-root .items td:nth-child(4) { width: 7%; }
//         .invoice-print-root .items th:nth-child(5), .invoice-print-root .items td:nth-child(5) { width: 10%; }
//         .invoice-print-root .items th:nth-child(6), .invoice-print-root .items td:nth-child(6) { width: 9%; }
//         .invoice-print-root .items th:nth-child(7), .invoice-print-root .items td:nth-child(7) { width: 9%; }
//         .invoice-print-root .items th:nth-child(8), .invoice-print-root .items td:nth-child(8) { width: 11%; }
//         .invoice-print-root .items th:nth-child(9), .invoice-print-root .items td:nth-child(9) { width: 4%; }
//         .invoice-print-root .num {
//           text-align: right;
//           white-space: nowrap;
//         }
//         .invoice-print-root .center {
//           text-align: center;
//           white-space: nowrap;
//         }
//         .invoice-print-root .footer-area {
//           position: absolute;
//           left: 8mm;
//           right: 8mm;
//           bottom: 12mm;
//           border-top: 1.3px solid #000;
//           padding-top: 9px;
//           display: flex;
//           gap: 20px;
//         }
//         .invoice-print-root .banking {
//           flex: 1.35;
//         }
//         .invoice-print-root .totals {
//           flex: 0.9;
//           font-size: 11px;
//         }
//         .invoice-print-root .bank-grid {
//           display: flex;
//           gap: 42px;
//           margin-top: 12px;
//         }
//         .invoice-print-root .bank h3,
//         .invoice-print-root .banking h2 {
//           font-size: 13px;
//           margin-bottom: 8px;
//         }
//         .invoice-print-root .bank h3 {
//           margin-bottom: 4px;
//         }
//         .invoice-print-root .shop2shop {
//           width: 130px;
//           min-height: 90px;
//           text-align: center;
//           font-weight: 700;
//         }
//         .invoice-print-root .qr-omitted {
//           height: 82px;
//         }
//         .invoice-print-root .footer-row {
//           display: flex;
//           justify-content: space-between;
//           gap: 18px;
//           margin-top: 18px;
//           font-weight: 700;
//         }
//         .invoice-print-root .total-row {
//           display: flex;
//           justify-content: space-between;
//           gap: 16px;
//           margin-bottom: 10px;
//         }
//         .invoice-print-root .total-row strong {
//           font-size: 12px;
//         }
//         .invoice-print-root .boxed-total {
//           border-top: 1.3px solid #000;
//           border-bottom: 1.3px solid #000;
//           padding: 7px 0;
//         }
//         .invoice-print-root .branch-lines {
//           position: absolute;
//           left: 0;
//           right: 0;
//           bottom: -1px;
//           transform: translateY(100%);
//           font-size: 10.5px;
//           line-height: 1.5;
//         }
//         .invoice-print-root .created {
//           float: right;
//           font-weight: 400;
//         }
//       `}</style>

//       <main className="page">
//         <section className="header">
//           <h1>Tax Invoice</h1>
//           <div>
//             <strong>Vat Registration No:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{billingCompany?.taxNumber ?? ''}</strong>
//           </div>
//           <div className="company">{billingCompany?.companyName ?? ''}</div>
//           <div>
//             Address:{' '}
//             {[billingCompany?.addressLineOne, billingCompany?.addressLineTwo, billingCompany?.addressLineThree, billingCompany?.addressLineFour]
//               .filter(Boolean)
//               .join(', ')}
//             {billingCompany?.telephone ? `; Tel: ${billingCompany.telephone}` : ''}
//             {billingCompany?.faxNumber ? ` Fax: ${billingCompany.faxNumber}` : ''}
//             {billingCompany?.emailAddress ? ` Email:${billingCompany.emailAddress}` : ''}
//           </div>
//         </section>

//         <section className="meta-grid">
//           <div className="box invoice-to">
//             <div>
//               <h2>Invoice To</h2>
//               <div>{debtor?.name ?? data?.name ?? ''}</div>
//               <div>{debtor?.deliveryAddress ?? debtor?.postalAddress ?? data?.address ?? ''}</div>
//             </div>
//             <div>Customer Vat No.: {debtor?.taxNumber ?? ''}</div>
//           </div>

//           <div className="box">
//             <h2>Details:</h2>
//             <div className="details-row">
//               <span className="label">Order No</span>
//               <span className="value">{data?.orderNumber ?? ''}</span>
//             </div>
//             <div className="details-row">
//               <span className="label">Account No</span>
//               <span className="value">{accountNumber}</span>
//             </div>
//             <div className="details-row">
//               <span className="label">Invoice Date</span>
//               <span className="value">{formatDate(data?.invoiceDate)}</span>
//             </div>
//             <div className="details-row">
//               <span className="label">Till No:</span>
//               <span className="value">{data?.tillNumber ?? ''}</span>
//             </div>
//             <div className="details-row">
//               <span className="label">Invoice Number</span>
//               <span className="value">{data?.invoiceNumber ?? ''}</span>
//             </div>
//             <div className="details-row">
//               <span className="label">Page</span>
//               <span className="value">1 of 1</span>
//             </div>
//           </div>
//         </section>

//         <table className="items">
//           <thead>
//             <tr>
//               <th>Item Code</th>
//               <th>Description</th>
//               <th>Pack Des.</th>
//               <th className="num">Qty</th>
//               <th className="num">Price Excl.</th>
//               <th className="num">Line Disc.</th>
//               <th className="num">Vat Amt</th>
//               <th className="num">Total Incl.</th>
//               <th className="center">*</th>
//             </tr>
//           </thead>
//           <tbody>
//             {items.map((it: any, idx: number) => {
//               const stock = it?.CompanyStockDetail ?? {};
//               const qty = toNumber(it?.quantity);
//               const priceExcl = it?.selectedPricing?.priceExclusive ?? (qty ? toNumber(it?.taxableAmount) / qty : toNumber(it?.price));
//               const packLabel = stock?.packSize ? `${stock.packSize} x` : qty ? `${formatNumber(qty, 0)} x` : '';

//               return (
//                 <tr key={it?.id ?? idx}>
//                   <td>{stock?.itemCode ?? ''}</td>
//                   <td>{it?.description ?? stock?.description ?? ''}</td>
//                   <td>{packLabel}</td>
//                   <td className="num">{formatNumber(qty)}</td>
//                   <td className="num">{formatNumber(priceExcl)}</td>
//                   <td className="num">{formatNumber(it?.discount)}</td>
//                   <td className="num">{formatNumber(it?.taxAmount ?? it?.vatAmount)}</td>
//                   <td className="num">{formatNumber(it?.lineTotal)}</td>
//                   <td className="center">{it?.isFree ? '*P*' : ''}</td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>

//         <section className="footer-area">
//           <div className="banking">
//             <h2>Banking Details:</h2>
//             <div className="bank-grid">
//               <div className="bank">
//                 <h3>{billingCompany?.bankName ?? ''}</h3>
//                 <div>{billingCompany?.companyName ?? ''}</div>
//                 <div>ACC. NO: {billingCompany?.bankAccountNumber ?? ''}</div>
//                 <div>ACC. TYPE: {billingCompany?.bankAccountType ?? ''}</div>
//                 <div>CODE: {billingCompany?.bankBranchCode ?? ''}</div>
//               </div>
//               <div className="shop2shop">
//                 <div>Shop2Shop</div>
//                 <div className="qr-omitted"></div>
//               </div>
//             </div>
//             <div className="footer-row">
//               <div>Inv. Disc% {data?.invoiceDiscountPercentage ?? 0}</div>
//               <div>No. of Items {formatNumber(totalQuantity, 0)}</div>
//             </div>
//           </div>

//           <div className="totals">
//             <div className="total-row">
//               <span>Discount Received !</span>
//               <strong>{formatMoney(discountAmount)}</strong>
//             </div>
//             <div className="total-row">
//               <span>Subtotal (Exclusive)</span>
//               <strong>{formatMoney(subtotalExclusive)}</strong>
//             </div>
//             <div className="total-row">
//               <span>Vat</span>
//               <strong>{formatMoney(totalTax)}</strong>
//             </div>
//             <div className="total-row boxed-total">
//               <span>Total</span>
//               <strong>{formatMoney(grandTotal)}</strong>
//             </div>
//             <div className="total-row">
//               <span>Amt Tendered:</span>
//               <strong>{formatMoney(data?.amountTendered ?? grandTotal)}</strong>
//             </div>
//             <div className="total-row">
//               <span>Change</span>
//               <strong>{formatMoney(data?.change ?? 0)}</strong>
//             </div>
//           </div>

//           <div className="branch-lines">
//             <div>
//               Branches: {billingCompany?.companyName ?? ''},{' '}
//               {[billingCompany?.addressLineOne, billingCompany?.addressLineTwo, billingCompany?.addressLineThree, billingCompany?.addressLineFour]
//                 .filter(Boolean)
//                 .join(', ')}{' '}
//               {billingCompany?.telephone ? `Tel/Fax: ${billingCompany.telephone}` : ''}
//             </div>
//             <div></div>
//             <div>
//               <strong>Conditions: No refunds and exchange allowed on all items.</strong>
//               <span className="created">Created: {formatDateTime(data?.updatedAt ?? data?.createdAt)}</span>
//             </div>
//           </div>
//         </section>
//       </main>
//     </div>
//   );
// };

// export default AccountSalesInvoice;
import React from 'react';
import { AccountSaleInvoiceType } from '@/api-queries/point-of-sale/account-sales/account-sales';
import { QuotationInvoiceType } from '@/api-queries/point-of-sale/account-sales/quotations';
import { SaleOrderInvoiceType } from '@/api-queries/point-of-sale/account-sales/sale-order';

export interface AccountSalesInvoiceProps {
    // Pass the `data` object from the API response (i.e. response.data),
    // not the raw { success, message, data } envelope.
    printData: AccountSaleInvoiceType | SaleOrderInvoiceType | QuotationInvoiceType;
}

/* ---------- helpers ---------- */

const toNumber = (v: unknown): number => {
    const n = typeof v === 'string' ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? n : 0;
};

const formatMoney = (v: unknown): string => {
    const n = toNumber(v);
    return `R${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (v: unknown, decimals = 2): string => {
    const n = toNumber(v);
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatDate = (v?: string | null): string => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const formatDateTime = (v?: string | null): string => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

// Reads the persisted Zustand "pos-auth-store" from localStorage and returns the
// logged-in company record (companyName, address lines, tax number, bank details, etc.).
// Used as a fallback source for company/banking info when the invoice payload itself
// doesn't carry a `BillingCompany` object.
const getStoredCompanyDetails = (): any => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem('pos-auth-store');
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed?.state?.company ?? {};
    } catch {
        return {};
    }
};

/* ---------- component ---------- */

const AccountSalesInvoice = ({ printData }: AccountSalesInvoiceProps) => {
    // The three invoice payload shapes (account sale / sale order / quotation) all
    // wrap their core record under a differently-named top-level key in some call
    // sites, but the API response in this app returns the record directly under
    // `data` (see the sample payload: { success, message, data: {...} }). Handle
    // both: if the caller passed the full envelope by mistake, unwrap `data` too.
    const data: any =
        (printData as any)?.accountSales ??
        (printData as any)?.saleOrder ??
        (printData as any)?.quotation ??
        (printData as any)?.data ??
        printData ??
        {};

    // Prefer company/bank details embedded in the payload; fall back to the
    // authenticated company record stored in pos-auth-store when the payload
    // doesn't carry its own BillingCompany (e.g. quotations).
    const authCompany = getStoredCompanyDetails();
    const billingCompany = {
        ...authCompany,
        ...(data?.BillingCompany ?? data?.CompanyDebtor?.BillingCompany ?? {}),
    };
    const debtor = data?.CompanyDebtor ?? {};

    const items: any[] = data?.DebtorInvoicingOrderItems ?? data?.items ?? (printData as any)?.cartItems ?? [];

    const accountNumber = data?.accountNumber ?? debtor?.accountNumber ?? (printData as any)?.accountNumber ?? '';

    const customerVatNumber = debtor?.taxNumber ?? data?.vatNumber ?? data?.customerDetails?.vatNumber ?? '';

    // Sales representative surfaced on the document so it's visible across
    // account sale / sale order / quotation invoices alike.
    const representative = data?.SalesRepresentative ?? data?.representative ?? {};
    const representativeDisplay = [representative?.name, representative?.cellNumber]
        .filter(Boolean)
        .join(' | ');

    const goodsTotal = toNumber(data?.goodsTotal);
    const totalTax = toNumber(data?.totalTaxAmount ?? data?.taxAmount);
    const discountAmount = toNumber(data?.DebtorInvoicingOrderItems?.[0]?.discount || data?.discountAmount );
    const subtotalExclusive = data?.invoiceInclusive ? goodsTotal - totalTax : goodsTotal;
    const grandTotal = data?.invoiceInclusive ? goodsTotal : goodsTotal + totalTax;

    const totalQuantity =
        data?.totalQuantity ?? items.reduce((sum, it) => sum + toNumber(it?.quantity), 0);
    const totalFreeQuantity =
        toNumber(data?.totalFreeQuantity) ||
        items.reduce((sum, it) => sum + toNumber(it?.freeQuantity), 0);

    // Payment / tender breakdown. The API returns a `paymentSummary` object plus
    // a `payments` array (one entry per tender used) — e.g.:
    //   paymentSummary: { paymentTotal, amountTendered, changeDue, isSplitPayment, tenderType, tenderTypes }
    //   payments: [{ tenderType: 'CASH', amount: 287.5, referenceNumber, ... }, ...]
    const paymentSummary = data?.paymentSummary ?? {};
    const payments: any[] = data?.payments ?? [];

    const amountTendered = toNumber(paymentSummary?.amountTendered ?? data?.amountTendered ?? grandTotal);
    const changeDue = toNumber(paymentSummary?.changeDue ?? data?.changeDue ?? data?.change ?? 0);
    const tenderTypeDisplay =
        paymentSummary?.isSplitPayment
            ? 'MIXED'
            : paymentSummary?.tenderType ?? payments?.[0]?.tenderType ?? '';

    return (
        <div className="invoice-print-root">
            <style>{`
        .invoice-print-root * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .invoice-print-root {
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          line-height: 1.18;
        }
        .invoice-print-root .page {
          width: 210mm;
          min-height: 297mm;
          padding: 6mm 8mm 8mm;
          margin: 0 auto;
          background: #fff;
          position: relative;
        }
        .invoice-print-root .header {
          text-align: center;
          font-size: 12px;
          line-height: 1.2;
          margin-bottom: 12px;
        }
        .invoice-print-root .header h1 {
          font-size: 13px;
          text-decoration: underline;
          margin-bottom: 2px;
        }
        .invoice-print-root .header .company {
          font-size: 12.5px;
          font-weight: 700;
          margin-top: 5px;
        }
        .invoice-print-root .meta-grid {
          display: flex;
          gap: 8px;
          margin-bottom: 4px;
        }
        .invoice-print-root .box {
          border: 1.3px solid #000;
          border-radius: 8px;
          min-height: 27mm;
          padding: 4px 7px;
          flex: 1;
        }
        .invoice-print-root .box h2 {
          font-size: 12.5px;
          margin-bottom: 8px;
        }
        .invoice-print-root .invoice-to {
          display: flex;
          min-height: 27mm;
          flex-direction: column;
          justify-content: space-between;
        }
        .invoice-print-root .details-row {
          display: flex;
          gap: 14px;
          margin-bottom: 2px;
        }
        .invoice-print-root .details-row .label {
          width: 92px;
        }
        .invoice-print-root .details-row .value {
          min-width: 120px;
        }
        .invoice-print-root .items {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 10.4px;
        }
        .invoice-print-root .items thead th {
          border-top: 1.3px solid #000;
          border-bottom: 1.3px solid #000;
          padding: 3px 3px 4px;
          font-weight: 700;
          text-align: left;
        }
        .invoice-print-root .items thead th:first-child {
          border-left: 1.3px solid #000;
        }
        .invoice-print-root .items thead th:last-child {
          border-right: 1.3px solid #000;
        }
        .invoice-print-root .items td {
          padding: 2px 4px;
          line-height: 1.08;
          vertical-align: top;
          overflow-wrap: anywhere;
        }
        .invoice-print-root .items th:nth-child(1), .invoice-print-root .items td:nth-child(1) { width: 13%; }
        .invoice-print-root .items th:nth-child(2), .invoice-print-root .items td:nth-child(2) { width: 30%; }
        .invoice-print-root .items th:nth-child(3), .invoice-print-root .items td:nth-child(3) { width: 9%; }
        .invoice-print-root .items th:nth-child(4), .invoice-print-root .items td:nth-child(4) { width: 7%; }
        .invoice-print-root .items th:nth-child(5), .invoice-print-root .items td:nth-child(5) { width: 10%; }
        .invoice-print-root .items th:nth-child(6), .invoice-print-root .items td:nth-child(6) { width: 9%; }
        .invoice-print-root .items th:nth-child(7), .invoice-print-root .items td:nth-child(7) { width: 9%; }
        .invoice-print-root .items th:nth-child(8), .invoice-print-root .items td:nth-child(8) { width: 11%; }
        .invoice-print-root .items th:nth-child(9), .invoice-print-root .items td:nth-child(9) { width: 4%; }
        .invoice-print-root .num {
          text-align: right;
          white-space: nowrap;
        }
        .invoice-print-root .center {
          text-align: center;
          white-space: nowrap;
        }
        .invoice-print-root .free-tag {
          font-size: 9px;
          font-weight: 700;
        }
        .invoice-print-root .footer-area {
          position: absolute;
          left: 8mm;
          right: 8mm;
          bottom: 12mm;
          border-top: 1.3px solid #000;
          padding-top: 9px;
          display: flex;
          gap: 20px;
        }
        .invoice-print-root .banking {
          flex: 1.35;
        }
        .invoice-print-root .totals {
          flex: 0.9;
          font-size: 11px;
        }
        .invoice-print-root .bank-grid {
          display: flex;
          gap: 42px;
          margin-top: 12px;
        }
        .invoice-print-root .bank h3,
        .invoice-print-root .banking h2 {
          font-size: 13px;
          margin-bottom: 8px;
        }
        .invoice-print-root .bank h3 {
          margin-bottom: 4px;
        }
        .invoice-print-root .shop2shop {
          width: 130px;
          min-height: 90px;
          text-align: center;
          font-weight: 700;
        }
        .invoice-print-root .qr-omitted {
          height: 82px;
        }
        .invoice-print-root .footer-row {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          margin-top: 18px;
          font-weight: 700;
        }
        .invoice-print-root .total-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 10px;
        }
        .invoice-print-root .payment-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 6px;
          font-size: 10.4px;
        }
        .invoice-print-root .total-row strong {
          font-size: 12px;
        }
        .invoice-print-root .boxed-total {
          border-top: 1.3px solid #000;
          border-bottom: 1.3px solid #000;
          padding: 7px 0;
        }
        .invoice-print-root .branch-lines {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          transform: translateY(100%);
          font-size: 10.5px;
          line-height: 1.5;
        }
        .invoice-print-root .created {
          float: right;
          font-weight: 400;
        }
      `}</style>

      <main className="page">
        <section className="header">
          <h1>Tax Invoice</h1>
          <div>
            <strong>Vat Registration No:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{billingCompany?.taxNumber ?? ''}</strong>
          </div>
          <div className="company">{billingCompany?.companyName ?? ''}</div>
          <div>
            Address:{' '}
            {[billingCompany?.addressLineOne, billingCompany?.addressLineTwo, billingCompany?.addressLineThree, billingCompany?.addressLineFour]
              .filter(Boolean)
              .join(', ')}
            {billingCompany?.telephone ? `; Tel: ${billingCompany.telephone}` : ''}
            {billingCompany?.faxNumber ? ` Fax: ${billingCompany.faxNumber}` : ''}
            {billingCompany?.emailAddress ? ` Email:${billingCompany.emailAddress}` : ''}
          </div>
        </section>

        <section className="meta-grid">
          <div className="box invoice-to">
            <div>
              <h2>Invoice To</h2>
              <div>{debtor?.name ?? data?.name ?? ''}</div>
              <div>{debtor?.deliveryAddress ?? debtor?.postalAddress ?? data?.address ?? ''}</div>
            </div>
            <div>Customer Vat No.: {customerVatNumber}</div>
          </div>

          <div className="box">
            <h2>Details:</h2>
            <div className="details-row">
              <span className="label">Order No</span>
              <span className="value">{data?.orderNumber ?? ''}</span>
            </div>
            <div className="details-row">
              <span className="label">Account No</span>
              <span className="value">{accountNumber}</span>
            </div>
            <div className="details-row">
              <span className="label">Invoice Date</span>
              <span className="value">{formatDate(data?.invoiceDate)}</span>
            </div>
            <div className="details-row">
              <span className="label">Till No:</span>
              <span className="value">{data?.tillNumber ?? ''}</span>
            </div>
            <div className="details-row">
              <span className="label">Invoice Number</span>
              <span className="value">{data?.invoiceNumber ?? ''}</span>
            </div>
            {representativeDisplay ? (
              <div className="details-row">
                <span className="label">Representative</span>
                <span className="value">{representativeDisplay}</span>
              </div>
            ) : null}
            <div className="details-row">
              <span className="label">Page</span>
              <span className="value">1 of 1</span>
            </div>
          </div>
        </section>

        <table className="items">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Description</th>
              <th>Pack Des.</th>
              <th className="num">Qty</th>
              <th className="num">Price Excl.</th>
              <th className="num">Line Disc.</th>
              <th className="num">Vat Amt</th>
              <th className="num">Total Incl.</th>
              <th className="center">*</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, idx: number) => {
              const stock = it?.CompanyStockDetail ?? {};
              const qty = toNumber(it?.quantity);
              const freeQty = toNumber(it?.freeQuantity);
              const isFreeLine = freeQty > 0 || !!it?.isFree;
              // Free reward lines are stored with quantity 0 and their units in
              // freeQuantity, so the invoice must show freeQuantity as the Qty.
              const displayQty = qty + freeQty;
              // NST lines are sold at the backend's discounted price, so selectedPricing (the normal
              // retail price, e.g. 500 excl / 575 incl) must not be shown. Use BE's taxable amount.
              const priceExcl = it?.stockDispositionId
                ? qty
                  ? toNumber(it?.taxableAmount) / qty
                  : toNumber(it?.price)
                : (it?.selectedPricing?.priceExclusive ?? (qty ? toNumber(it?.taxableAmount) / qty : toNumber(it?.price)));
              const packLabel =
                stock?.packDescription ||
                (stock?.packSize ? `${stock.packSize} x` : displayQty ? `${formatNumber(displayQty, 0)} x` : '');

              return (
                <tr key={it?.id ?? idx}>
                  <td>{stock?.itemCode ?? ''}</td>
                  <td>{it?.description ?? stock?.description ?? ''}</td>
                  <td>{packLabel}</td>
                  <td className="num">
                    {formatNumber(displayQty)}
                    {isFreeLine ? <span className="free-tag"> FREE</span> : null}
                  </td>
                  <td className="num">{formatNumber(priceExcl)}</td>
                  <td className="num">{formatNumber(it?.discount)}</td>
                  <td className="num">{formatNumber(it?.taxAmount ?? it?.vatAmount)}</td>
                  <td className="num">{formatNumber(it?.lineTotal)}</td>
                  <td className="center">{isFreeLine ? 'FREE' : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <section className="footer-area">
          <div className="banking">
            <h2>Banking Details:</h2>
            <div className="bank-grid">
              <div className="bank">
                <h3>{billingCompany?.bankName ?? ''}</h3>
                <div>{billingCompany?.companyName ?? ''}</div>
                <div>ACC. NO: {billingCompany?.bankAccountNumber ?? ''}</div>
                <div>ACC. TYPE: {billingCompany?.bankAccountType ?? ''}</div>
                <div>CODE: {billingCompany?.bankBranchCode ?? ''}</div>
              </div>
              <div className="shop2shop">
                <div>Shop2Shop</div>
                <div className="qr-omitted"></div>
              </div>
            </div>
            <div className="footer-row">
              <div>Inv. Disc% {data?.invoiceDiscountPercentage ?? 0}</div>
              <div>
                No. of Items {formatNumber(totalQuantity, 0)}
                {totalFreeQuantity ? ` + ${formatNumber(totalFreeQuantity, 0)} free` : ''}
              </div>
            </div>
          </div>

          <div className="totals">
            <div className="total-row">
              <span>Discount Received !</span>
              <strong>{formatMoney(discountAmount)}</strong>
            </div>
            <div className="total-row">
              <span>Subtotal (Exclusive)</span>
              <strong>{formatMoney(subtotalExclusive)}</strong>
            </div>
            <div className="total-row">
              <span>Vat</span>
              <strong>{formatMoney(totalTax)}</strong>
            </div>
            <div className="total-row boxed-total">
              <span>Total</span>
              <strong>{formatMoney(grandTotal)}</strong>
            </div>
            {tenderTypeDisplay ? (
              <div className="total-row">
                <span>Tender Type:</span>
                <strong>{tenderTypeDisplay}</strong>
              </div>
            ) : null}
            {payments.map((p: any, idx: number) => (
              <div className="payment-row" key={p?.id ?? idx}>
                <span>
                  {p?.tenderType ?? ''}
                  {p?.referenceNumber ? ` (${p.referenceNumber})` : ''}
                </span>
                <strong>{formatMoney(p?.amount)}</strong>
              </div>
            ))}
            <div className="total-row">
              <span>Amt Tendered:</span>
              <strong>{formatMoney(amountTendered)}</strong>
            </div>
            <div className="total-row">
              <span>Change</span>
              <strong>{formatMoney(changeDue)}</strong>
            </div>
          </div>

          <div className="branch-lines">
            <div>
              Branches: {billingCompany?.companyName ?? ''},{' '}
              {[billingCompany?.addressLineOne, billingCompany?.addressLineTwo, billingCompany?.addressLineThree, billingCompany?.addressLineFour]
                .filter(Boolean)
                .join(', ')}{' '}
              {billingCompany?.telephone ? `Tel/Fax: ${billingCompany.telephone}` : ''}
            </div>
            <div></div>
            <div>
              <strong>Conditions: No refunds and exchange allowed on all items.</strong>
              <span className="created">Created: {formatDateTime(data?.updatedAt ?? data?.createdAt)}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AccountSalesInvoice;