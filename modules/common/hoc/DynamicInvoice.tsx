// import React, { useState, useMemo } from "react";

// /* ==================== HELPERS ==================== */
// const toNumber = (v:any) => {
//   const n = typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : v;
//   return Number.isFinite(n) ? n : 0;
// };

// const formatMoney = (v:any, currency = "₹") => {
//   const n = toNumber(v);
//   return `${currency}${n.toLocaleString("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   })}`;
// };

// const formatNumber = (v:any, decimals = 2) => {
//   const n = toNumber(v);
//   return n.toLocaleString("en-IN", {
//     minimumFractionDigits: decimals,
//     maximumFractionDigits: decimals,
//   });
// };

// const formatDate = (v:any) => {
//   if (!v) return "";
//   const d = new Date(v);
//   if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
//   return d.toLocaleDateString("en-IN", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//   });
// };

// const formatDateTime = (v:any) => {
//   if (!v) return "";
//   const d = new Date(v);
//   if (Number.isNaN(d.getTime())) return String(v).slice(0, 19);
//   return d.toLocaleString("en-IN", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: true,
//   });
// };

// /* ==================== MAIN DYNAMIC INVOICE COMPONENT ==================== */
// /* Everything this component (and its children) renders comes from `printData`. */
// const DynamicInvoice = ({ printData, invoiceType = "tax-invoice" }:any) => {
//   const data =
//     printData?.accountSales ??
//     printData?.saleOrder ??
//     printData?.quotation ??
//     printData?.grv ??
//     printData?.creditNote ??
//     printData?.debitNote ??
//     printData ??
//     {};
//   const company = data?.Company ?? data?.BillingCompany ?? data?.company ?? {};
//   const items =
//     data?.DebtorInvoicingOrderItems ??
//     data?.CreditorGoodsReceivingOrderItems ??
//     data?.items ??
//     data?.cartItems ??
//     data?.creditNoteItems ??
//     data?.debitNoteItems ??
//     [];

//   const type =
//     invoiceType ||
//     (data?.supplierInvoiceNumber || data?.grvDate
//       ? "grv"
//       : data?.creditNoteNumber
//       ? "credit-note"
//       : data?.debitNoteNumber
//       ? "debit-note"
//       : data?.quotationNumber
//       ? "quotation"
//       : data?.tenderType || data?.orderNumber?.startsWith("CS")
//       ? "cash-slip"
//       : "tax-invoice");

//   if (type === "cash-slip") {
//     return <CashSlipView data={data} company={company} items={items} />;
//   }
//   if (type === "grv") {
//     return <GrvView data={data} company={company} items={items} />;
//   }
//   return (
//     <StandardDocumentView data={data} company={company} items={items} type={type} />
//   );
// };

// /* ==================== CASH SLIP (Receipt) ==================== */
// const CashSlipView = ({ data, company, items }:any) => {
//   const total = toNumber(
//     data?.totalPrice ||
//       data?.grandTotal ||
//       items.reduce((sum:any, item:any) => sum + toNumber(item?.lineTotal), 0)
//   );

//   return (
//     <div className="invoice-print-root cash-slip">
//       <style>{`
//                 .cash-slip { font-family: "Courier New", monospace; width: 300px; margin: 0 auto; background: #fff; color: #000; font-size: 11px; line-height: 1.2; padding: 10px; }
//                 .cash-slip .text-center { text-align: center; }
//                 .cash-slip .text-right { text-align: right; }
//                 .cash-slip .dashed-line { margin: 6px 0; text-align: center; border-bottom: 1px dashed #000; }
//                 .cash-slip table { width: 100%; border-collapse: collapse; font-size: 10px; }
//                 .cash-slip th, .cash-slip td { padding: 4px 2px; border-bottom: 1px dashed #ccc; }
//                 .cash-slip .total { font-weight: bold; font-size: 13px; }
//             `}</style>
//       <div className="invoice-wrapper">
//         <div className="text-center">
//           <div style={{ fontSize: "13px", fontWeight: "bold" }}>
//             ***** {company?.companyName?.toUpperCase() || "RETAIL STORE"} *****
//           </div>
//           {[
//             company?.addressLineOne,
//             company?.addressLineTwo,
//             company?.addressLineThree,
//             company?.addressLineFour,
//             company?.postalCode,
//           ]
//             .filter(Boolean)
//             .join(", ")}
//           {company?.telephone && <div>Tel: {company.telephone}</div>}
//           {company?.taxNumber && <div>Tax No: {company.taxNumber}</div>}
//           <div>{formatDateTime(data?.createdAt)}</div>
//           <div className="dashed-line">--------------------------------</div>
//         </div>

//         <div>Customer: {data?.name || "Walk-In Customer"}</div>
//         <div>Phone: {data?.telNumber || "N/A"}</div>
//         <div>Order No.: {data?.orderNumber || data?.id}</div>
//         <div className="dashed-line">--------------------------------</div>

//         <table>
//           <thead>
//             <tr>
//               <th>#</th>
//               <th>Item</th>
//               <th className="text-right">Excl.</th>
//               <th className="text-right">Incl.</th>
//             </tr>
//           </thead>
//           <tbody>
//             {items.map((item:any, idx:any) => (
//               <tr key={idx}>
//                 <td>{idx + 1}</td>
//                 <td>{item?.CompanyStockDetail?.description || item?.description}</td>
//                 <td className="text-right">{formatMoney(item?.unitPrice)}</td>
//                 <td className="text-right">
//                   {formatMoney(item?.lineTotal)} x{item?.quantity}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         <div
//           className="total"
//           style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}
//         >
//           <span>TOTAL:</span>
//           <span>{formatMoney(total)}</span>
//         </div>

//         <div className="dashed-line">--------------------------------</div>
//         <div style={{ textAlign: "center", marginTop: "10px" }}>
//           Thank you for your business!
//         </div>
//       </div>
//     </div>
//   );
// };

// /* ==================== GRV VIEW ==================== */
// const GrvView = ({ data, company, items }:any) => (
//   <div className="invoice-print-root">
//     <style>{`
//             .page { width: 210mm; min-height: 297mm; padding: 10mm; font-size: 11px; background:#fff; color:#000; font-family: Arial, Helvetica, sans-serif; }
//             .items { width: 100%; border-collapse: collapse; }
//             .items th, .items td { border: 1px solid #000; padding: 5px; }
//             .num { text-align: right; }
//         `}</style>
//     <main className="page">
//       <h1 style={{ textAlign: "center" }}>Goods Receiving Note</h1>
//       <div>
//         <strong>GRV No:</strong> {data?.supplierInvoiceNumber || data?.id}
//       </div>
//       <div>
//         <strong>Date:</strong> {formatDate(data?.grvDate || data?.createdAt)}
//       </div>
//       <div>
//         <strong>Supplier:</strong> {data?.name || data?.Supplier?.name}
//       </div>

//       <table className="items" style={{ marginTop: "15px" }}>
//         <thead>
//           <tr>
//             <th>#</th>
//             <th>Item Code</th>
//             <th>Description</th>
//             <th className="num">Price Excl.</th>
//             <th className="num">Qty</th>
//             <th className="num">Free Qty</th>
//             <th className="num">Line Total</th>
//           </tr>
//         </thead>
//         <tbody>
//           {items.map((item, idx) => (
//             <tr key={idx}>
//               <td>{idx + 1}</td>
//               <td>{item?.CompanyStockDetail?.itemCode}</td>
//               <td>{item?.description}</td>
//               <td className="num">{formatMoney(item?.unitPrice)}</td>
//               <td className="num">{item?.quantity}</td>
//               <td className="num">{item?.freeStock || 0}</td>
//               <td className="num">{formatMoney(item?.lineTotal)}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       <div style={{ marginTop: "20px", textAlign: "right", fontWeight: "bold" }}>
//         Grand Total: {formatMoney(data?.goodsTotal)}
//       </div>
//     </main>
//   </div>
// );

// /* ==================== STANDARD DOCUMENT VIEW ==================== */
// /* Handles: tax-invoice, credit-note, debit-note, quotation, sale-order */
// const StandardDocumentView = ({ data, company, items, type }:any) => {
//   const isCredit = type === "credit-note";
//   const isDebit = type === "debit-note";
//   const isQuote = type === "quotation";
//   const isSaleOrder = type === "sale-order";
//   const title = isCredit
//     ? "Credit Note"
//     : isDebit
//     ? "Debit Note"
//     : isQuote
//     ? "Quotation"
//     : isSaleOrder
//     ? "Sale Order"
//     : "Tax Invoice";

//   const debtor = data?.CompanyDebtor || {};
//   const subtotalExclusive = toNumber(data?.subtotalExclusive ?? data?.goodsTotal);
//   const discountAmount = toNumber(data?.discountAmount);
//   const vatTotal = toNumber(data?.taxAmount ?? data?.vatAmount);
//   const grandTotal = toNumber(data?.totalIncl ?? data?.grandTotal ?? data?.totalPrice);

//   return (
//     <div className="invoice-print-root">
//       <style>{`
//                 * { box-sizing: border-box; margin: 0; padding: 0; }
//                 .invoice-print-root { background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.18; }
//                 .page { width: 210mm; min-height: 297mm; padding: 6mm 8mm 8mm; margin: 0 auto; position: relative; }
//                 .header { text-align: center; font-size: 12px; line-height: 1.2; margin-bottom: 12px; }
//                 .header h1 { font-size: 13px; text-decoration: underline; margin-bottom: 2px; }
//                 .header .company { font-size: 12.5px; font-weight: 700; margin-top: 5px; }
//                 .meta-grid { display: flex; gap: 8px; margin-bottom: 4px; }
//                 .box { border: 1.3px solid #000; border-radius: 8px; min-height: 27mm; padding: 4px 7px; flex: 1; }
//                 .box h2 { font-size: 12.5px; margin-bottom: 8px; }
//                 .invoice-to { display: flex; flex-direction: column; justify-content: space-between; }
//                 .details-row { display: flex; gap: 14px; margin-bottom: 2px; }
//                 .details-row .label { width: 92px; }
//                 .items { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.4px; }
//                 .items thead th { border-top: 1.3px solid #000; border-bottom: 1.3px solid #000; padding: 3px 3px 4px; font-weight: 700; text-align: left; }
//                 .items td { padding: 2px 4px; vertical-align: top; border-bottom: 1px solid #ddd; }
//                 .num { text-align: right; white-space: nowrap; }
//                 .center { text-align: center; }
//                 .footer-area { position: absolute; left: 8mm; right: 8mm; bottom: 12mm; border-top: 1.3px solid #000; padding-top: 9px; display: flex; gap: 20px; }
//                 .banking { flex: 1.35; }
//                 .totals { flex: 0.9; font-size: 11px; }
//                 .total-row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
//                 .boxed-total { border-top: 1.3px solid #000; border-bottom: 1.3px solid #000; padding: 7px 0; }
//                 .branch-lines { position: absolute; left: 0; right: 0; bottom: -1px; transform: translateY(100%); font-size: 10.5px; line-height: 1.5; }
//             `}</style>

//       <main className="page">
//         <section className="header">
//           <h1>{title}</h1>
//           <div>
//             <strong>Vat Registration No: {company?.taxNumber || ""}</strong>
//           </div>
//           <div className="company">{company?.companyName}</div>
//           <div>
//             Address:{" "}
//             {[
//               company?.addressLineOne,
//               company?.addressLineTwo,
//               company?.addressLineThree,
//               company?.addressLineFour,
//             ]
//               .filter(Boolean)
//               .join(", ")}
//             {company?.telephone ? `; Tel: ${company.telephone}` : ""}
//           </div>
//         </section>

//         <section className="meta-grid">
//           <div className="box invoice-to">
//             <div>
//               <h2>Invoice To</h2>
//               <div>{debtor?.name || data?.name || ""}</div>
//               <div>{debtor?.deliveryAddress || debtor?.postalAddress || data?.address || ""}</div>
//             </div>
//             <div>Customer Vat No.: {debtor?.taxNumber || ""}</div>
//           </div>

//           <div className="box">
//             <h2>Details:</h2>
//             <div className="details-row">
//               <span className="label">Order No</span>
//               <span className="value">{data?.orderNumber}</span>
//             </div>
//             <div className="details-row">
//               <span className="label">Account No</span>
//               <span className="value">{debtor?.accountNumber}</span>
//             </div>
//             <div className="details-row">
//               <span className="label">Date</span>
//               <span className="value">{formatDate(data?.invoiceDate || data?.createdAt)}</span>
//             </div>
//             <div className="details-row">
//               <span className="label">Document No</span>
//               <span className="value">
//                 {data?.invoiceNumber ||
//                   data?.quotationNumber ||
//                   data?.creditNoteNumber ||
//                   data?.debitNoteNumber ||
//                   data?.orderNumber ||
//                   data?.id}
//               </span>
//             </div>
//           </div>
//         </section>

//         <table className="items">
//           <thead>
//             <tr>
//               <th>Item Code</th>
//               <th>Description</th>
//               <th className="num">Qty</th>
//               <th className="num">Price Excl.</th>
//               <th className="num">Disc.</th>
//               <th className="num">Vat Amt</th>
//               <th className="num">Total Incl.</th>
//             </tr>
//           </thead>
//           <tbody>
//             {items.map((it:any, idx:any) => (
//               <tr key={idx}>
//                 <td>{it?.CompanyStockDetail?.itemCode || it?.itemCode || ""}</td>
//                 <td>{it?.description || it?.CompanyStockDetail?.description || ""}</td>
//                 <td className="num">{formatNumber(it?.quantity)}</td>
//                 <td className="num">{formatNumber(it?.unitPrice || it?.priceExclusive)}</td>
//                 <td className="num">{formatNumber(it?.discount || it?.discountAmount)}</td>
//                 <td className="num">{formatNumber(it?.taxAmount || it?.vatAmount)}</td>
//                 <td className="num">{formatNumber(it?.lineTotal)}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         <section className="footer-area">
//           <div className="banking">
//             <h2>Banking Details:</h2>
//             <div>
//               <strong>{company?.bankName}</strong>
//             </div>
//             <div>ACC. NO: {company?.bankAccountNumber}</div>
//             <div>BRANCH: {company?.bankBranchCode}</div>
//           </div>

//           <div className="totals">
//             <div className="total-row">
//               <span>Subtotal (Exclusive)</span>
//               <strong>{formatMoney(subtotalExclusive)}</strong>
//             </div>
//             {discountAmount > 0 && (
//               <div className="total-row">
//                 <span>Discount</span>
//                 <strong>-{formatMoney(discountAmount)}</strong>
//               </div>
//             )}
//             <div className="total-row">
//               <span>Vat</span>
//               <strong>{formatMoney(vatTotal)}</strong>
//             </div>
//             <div className="total-row boxed-total">
//               <span>Total</span>
//               <strong>{formatMoney(grandTotal)}</strong>
//             </div>
//           </div>

//           <div className="branch-lines">
//             <strong>Conditions: No refunds and exchange allowed on all items.</strong>
//             <div>Created: {formatDateTime(data?.createdAt)}</div>
//           </div>
//         </section>
//       </main>
//     </div>
//   );
// };

// // /* ==================== EDITOR HELPERS ==================== */
// // const TYPE_LABELS = {
// //   "tax-invoice": "Tax Invoice",
// //   "credit-note": "Credit Note",
// //   "debit-note": "Debit Note",
// //   quotation: "Quotation",
// //   "sale-order": "Sale Order",
// //   grv: "GRV (Goods Receiving)",
// //   "cash-slip": "Cash Slip",
// // };

// // // document-number field key varies per type
// // const DOC_NUMBER_KEY = {
// //   "tax-invoice": "invoiceNumber",
// //   "credit-note": "creditNoteNumber",
// //   "debit-note": "debitNoteNumber",
// //   quotation: "quotationNumber",
// //   "sale-order": "orderNumber",
// //   grv: "supplierInvoiceNumber",
// //   "cash-slip": "orderNumber",
// // };

// // const emptyItem = () => ({
// //   id: Math.random().toString(36).slice(2),
// //   itemCode: "",
// //   description: "",
// //   quantity: 1,
// //   unitPrice: 0,
// //   discount: 0,
// //   taxAmount: 0,
// //   freeStock: 0,
// // });

// // const inputStyle = {
// //   width: "100%",
// //   padding: "6px 8px",
// //   fontSize: "12px",
// //   border: "1px solid #ccc",
// //   borderRadius: "4px",
// //   fontFamily: "Arial, Helvetica, sans-serif",
// // };

// // const labelStyle = {
// //   fontSize: "11px",
// //   color: "#555",
// //   display: "block",
// //   marginBottom: "3px",
// // };

// // const Field = ({ label, value, onChange, type = "text" }:any) => (
// //   <div>
// //     <label style={labelStyle}>{label}</label>
// //     <input
// //       type={type}
// //       value={value}
// //       onChange={(e) => onChange(e.target.value)}
// //       style={inputStyle}
// //     />
// //   </div>
// // );

// /* ==================== EDITOR + LIVE PREVIEW ==================== */
// // export default function InvoiceEditor() {
// //   const [type, setType] = useState("tax-invoice");

// //   const [company, setCompany] = useState({
// //     companyName: "Sunrise Traders Pvt Ltd",
// //     addressLineOne: "Plot 14, Industrial Area",
// //     addressLineTwo: "Sector 63",
// //     addressLineThree: "Noida",
// //     addressLineFour: "Uttar Pradesh",
// //     postalCode: "201301",
// //     telephone: "+91 120 456 7890",
// //     taxNumber: "09AAACS1234F1Z5",
// //     bankName: "HDFC Bank",
// //     bankAccountNumber: "50100234567890",
// //     bankBranchCode: "HDFC0001234",
// //   });

// //   const [customer, setCustomer] = useState({
// //     name: "Kumar Industrial Supplies",
// //     address: "45 MG Road, Ghaziabad, UP",
// //     taxNumber: "09BBBCK5678G2H6",
// //     accountNumber: "ACC-3321",
// //     telNumber: "9876543210",
// //   });

// //   const [meta, setMeta] = useState({
// //     orderNumber: "ORD-88231",
// //     documentNumber: "INV-2026-0456",
// //     date: "2026-07-07",
// //     createdAt: "2026-07-07T14:32:00",
// //   });

// //   const [items, setItems] = useState([
// //     { ...emptyItem(), itemCode: "SKU-1001", description: "Steel Bolt M8x40", quantity: 100, unitPrice: 2.5, discount: 0, taxAmount: 45, freeStock: 5 },
// //     { ...emptyItem(), itemCode: "SKU-1002", description: "Aluminium Sheet 2mm", quantity: 10, unitPrice: 450, discount: 200, taxAmount: 801, freeStock: 0 },
// //     { ...emptyItem(), itemCode: "SKU-1003", description: "Rubber Gasket Set", quantity: 25, unitPrice: 60, discount: 0, taxAmount: 270, freeStock: 2 },
// //   ]);

// //   const updateItem = (id:any, field:any, value:any) => {
// //     setItems((prev) =>
// //       prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
// //     );
// //   };

// //   const addItem = () => setItems((prev) => [...prev, emptyItem()]);
// //   const removeItem = (id:any) => setItems((prev) => prev.filter((it) => it.id !== id));

// //   // Every number the invoice shows is derived live from the editable items.
// //   const computedItems = useMemo(
// //     () =>
// //       items.map((it) => {
// //         const qty = toNumber(it.quantity);
// //         const price = toNumber(it.unitPrice);
// //         const discount = toNumber(it.discount);
// //         const tax = toNumber(it.taxAmount);
// //         const lineTotal = qty * price - discount + tax;
// //         return {
// //           CompanyStockDetail: { itemCode: it.itemCode, description: it.description },
// //           itemCode: it.itemCode,
// //           description: it.description,
// //           quantity: qty,
// //           unitPrice: price,
// //           priceExclusive: price,
// //           discount,
// //           discountAmount: discount,
// //           taxAmount: tax,
// //           vatAmount: tax,
// //           freeStock: toNumber(it.freeStock),
// //           lineTotal,
// //         };
// //       }),
// //     [items]
// //   );

// //   const subtotalExclusive = computedItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
// //   const discountTotal = computedItems.reduce((s, it) => s + it.discount, 0);
// //   const taxTotal = computedItems.reduce((s, it) => s + it.taxAmount, 0);
// //   const grandTotal = subtotalExclusive - discountTotal + taxTotal;

// //   // Build the single source of truth object, then wrap it exactly the way
// //   // DynamicInvoice expects for each type. This is the ONLY object passed down.
// //   const printData = useMemo(() => {
// //     const docNumberKey = DOC_NUMBER_KEY[type];

// //     const data = {
// //       company,
// //       Company: company,
// //       CompanyDebtor: {
// //         name: customer.name,
// //         deliveryAddress: customer.address,
// //         postalAddress: customer.address,
// //         taxNumber: customer.taxNumber,
// //         accountNumber: customer.accountNumber,
// //       },
// //       name: customer.name, // supplier (grv) / customer name (cash-slip)
// //       telNumber: customer.telNumber,
// //       address: customer.address,
// //       orderNumber: meta.orderNumber,
// //       invoiceDate: meta.date,
// //       grvDate: meta.date,
// //       createdAt: meta.createdAt,
// //       [docNumberKey]: meta.documentNumber,
// //       tenderType: type === "cash-slip" ? "cash" : undefined,
// //       subtotalExclusive,
// //       discountAmount: discountTotal,
// //       taxAmount: taxTotal,
// //       grandTotal,
// //       totalPrice: grandTotal,
// //       goodsTotal: grandTotal,
// //     };

// //     if (type === "grv") {
// //       data.CreditorGoodsReceivingOrderItems = computedItems;
// //     } else if (type === "cash-slip") {
// //       data.cartItems = computedItems;
// //     } else if (type === "credit-note") {
// //       data.creditNoteItems = computedItems;
// //     } else if (type === "debit-note") {
// //       data.debitNoteItems = computedItems;
// //     } else {
// //       // tax-invoice, quotation, sale-order
// //       data.items = computedItems;
// //       data.DebtorInvoicingOrderItems = computedItems;
// //     }

// //     if (type === "credit-note") return { creditNote: data };
// //     if (type === "debit-note") return { debitNote: data };
// //     if (type === "quotation") return { quotation: data };
// //     if (type === "sale-order") return { saleOrder: data };
// //     if (type === "grv") return { grv: data };
// //     return data; // tax-invoice / cash-slip: no wrapper key, used as-is
// //   }, [type, company, customer, meta, computedItems, subtotalExclusive, discountTotal, taxTotal, grandTotal]);

// //   return (
// //     <div style={{ background: "#e9e9ec", minHeight: "100vh", padding: "20px", fontFamily: "Arial, Helvetica, sans-serif" }}>
// //       <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
// //         {/* Type selector */}
// //         <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "18px" }}>
// //           {Object.keys(TYPE_LABELS).map((key) => (
// //             <button
// //               key={key}
// //               onClick={() => setType(key)}
// //               style={{
// //                 padding: "8px 14px",
// //                 borderRadius: "6px",
// //                 border: type === key ? "2px solid #333" : "1px solid #bbb",
// //                 background: type === key ? "#333" : "#fff",
// //                 color: type === key ? "#fff" : "#333",
// //                 fontSize: "13px",
// //                 cursor: "pointer",
// //               }}
// //             >
// //               {TYPE_LABELS[key]}
// //             </button>
// //           ))}
// //         </div>

// //         <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
// //           {/* ===== Editor panel ===== */}
// //           <div style={{ flex: "1 1 380px", minWidth: "340px", background: "#fff", borderRadius: "10px", padding: "16px" }}>
// //             <h3 style={{ fontSize: "14px", marginBottom: "10px" }}>Company</h3>
// //             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
// //               <Field label="Company Name" value={company.companyName} onChange={(v:any) => setCompany({ ...company, companyName: v })} />
// //               <Field label="Tax Number" value={company.taxNumber} onChange={(v:any) => setCompany({ ...company, taxNumber: v })} />
// //               <Field label="Address Line 1" value={company.addressLineOne} onChange={(v:any) => setCompany({ ...company, addressLineOne: v })} />
// //               <Field label="Address Line 2" value={company.addressLineTwo} onChange={(v:any) => setCompany({ ...company, addressLineTwo: v })} />
// //               <Field label="City" value={company.addressLineThree} onChange={(v:any) => setCompany({ ...company, addressLineThree: v })} />
// //               <Field label="State" value={company.addressLineFour} onChange={(v:any) => setCompany({ ...company, addressLineFour: v })} />
// //               <Field label="Telephone" value={company.telephone} onChange={(v:any) => setCompany({ ...company, telephone: v })} />
// //               <Field label="Bank Name" value={company.bankName} onChange={(v:any) => setCompany({ ...company, bankName: v })} />
// //               <Field label="Bank Account No" value={company.bankAccountNumber} onChange={(v:any) => setCompany({ ...company, bankAccountNumber: v })} />
// //               <Field label="Branch Code" value={company.bankBranchCode} onChange={(v:any) => setCompany({ ...company, bankBranchCode: v })} />
// //             </div>

// //             <h3 style={{ fontSize: "14px", marginBottom: "10px" }}>
// //               {type === "grv" ? "Supplier" : "Customer"}
// //             </h3>
// //             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
// //               <Field label="Name" value={customer.name} onChange={(v:any) => setCustomer({ ...customer, name: v })} />
// //               <Field label="Account No" value={customer.accountNumber} onChange={(v:any) => setCustomer({ ...customer, accountNumber: v })} />
// //               <Field label="Address" value={customer.address} onChange={(v:any) => setCustomer({ ...customer, address: v })} />
// //               <Field label="Tax No" value={customer.taxNumber} onChange={(v:any) => setCustomer({ ...customer, taxNumber: v })} />
// //               {type === "cash-slip" && (
// //                 <Field label="Phone" value={customer.telNumber} onChange={(v:any) => setCustomer({ ...customer, telNumber: v })} />
// //               )}
// //             </div>

// //             <h3 style={{ fontSize: "14px", marginBottom: "10px" }}>Document Details</h3>
// //             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
// //               <Field label="Order No" value={meta.orderNumber} onChange={(v:any) => setMeta({ ...meta, orderNumber: v })} />
// //               <Field
// //                 label={`${TYPE_LABELS[type]} No`}
// //                 value={meta.documentNumber}
// //                 onChange={(v:any) => setMeta({ ...meta, documentNumber: v })}
// //               />
// //               <Field label="Date" type="date" value={meta.date} onChange={(v:any) => setMeta({ ...meta, date: v })} />
// //               <Field
// //                 label="Created At"
// //                 type="datetime-local"
// //                 value={meta.createdAt}
// //                 onChange={(v:any) => setMeta({ ...meta, createdAt: v })}
// //               />
// //             </div>

// //             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
// //               <h3 style={{ fontSize: "14px" }}>Items</h3>
// //               <button
// //                 onClick={addItem}
// //                 style={{ fontSize: "12px", padding: "5px 10px", borderRadius: "5px", border: "1px solid #333", background: "#fff", cursor: "pointer" }}
// //               >
// //                 + Add item
// //               </button>
// //             </div>

// //             <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
// //               {items.map((it) => (
// //                 <div key={it.id} style={{ border: "1px solid #eee", borderRadius: "6px", padding: "8px", position: "relative" }}>
// //                   <button
// //                     onClick={() => removeItem(it.id)}
// //                     style={{
// //                       position: "absolute",
// //                       top: "6px",
// //                       right: "6px",
// //                       border: "none",
// //                       background: "transparent",
// //                       color: "#c0392b",
// //                       cursor: "pointer",
// //                       fontSize: "12px",
// //                     }}
// //                   >
// //                     ✕
// //                   </button>
// //                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
// //                     <Field label="Item Code" value={it.itemCode} onChange={(v:any) => updateItem(it.id, "itemCode", v)} />
// //                     <Field label="Description" value={it.description} onChange={(v:any) => updateItem(it.id, "description", v)} />
// //                   </div>
// //                   <div style={{ display: "grid", gridTemplateColumns: type === "grv" ? "1fr 1fr 1fr" : "1fr 1fr 1fr 1fr", gap: "6px" }}>
// //                     <Field label="Qty" type="number" value={it.quantity} onChange={(v:any) => updateItem(it.id, "quantity", v)} />
// //                     <Field label="Unit Price" type="number" value={it.unitPrice} onChange={(v:any) => updateItem(it.id, "unitPrice", v)} />
// //                     {type === "grv" ? (
// //                       <Field label="Free Qty" type="number" value={it.freeStock} onChange={(v:any) => updateItem(it.id, "freeStock", v)} />
// //                     ) : (
// //                       <>
// //                         <Field label="Discount" type="number" value={it.discount} onChange={(v:any) => updateItem(it.id, "discount", v)} />
// //                         <Field label="Tax Amt" type="number" value={it.taxAmount} onChange={(v:any) => updateItem(it.id, "taxAmount", v)} />
// //                       </>
// //                     )}
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>

// //             <div style={{ marginTop: "14px", fontSize: "12px", color: "#333", borderTop: "1px solid #eee", paddingTop: "10px" }}>
// //               <div style={{ display: "flex", justifyContent: "space-between" }}>
// //                 <span>Subtotal (Exclusive)</span>
// //                 <strong>{formatMoney(subtotalExclusive)}</strong>
// //               </div>
// //               <div style={{ display: "flex", justifyContent: "space-between" }}>
// //                 <span>Discount</span>
// //                 <strong>-{formatMoney(discountTotal)}</strong>
// //               </div>
// //               <div style={{ display: "flex", justifyContent: "space-between" }}>
// //                 <span>Vat / Tax</span>
// //                 <strong>{formatMoney(taxTotal)}</strong>
// //               </div>
// //               <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
// //                 <span>Grand Total</span>
// //                 <strong>{formatMoney(grandTotal)}</strong>
// //               </div>
// //             </div>
// //           </div>

// //           {/* ===== Live preview, driven entirely by printData ===== */}
// //           <div style={{ flex: "1 1 500px", minWidth: "320px" }}>
// //             <div
// //               style={{
// //                 maxWidth: type === "cash-slip" ? "340px" : "100%",
// //                 margin: type === "cash-slip" ? "0 auto" : "0",
// //                 boxShadow: "0 0 12px rgba(0,0,0,0.15)",
// //                 transform: type === "cash-slip" ? "none" : "scale(0.72)",
// //                 transformOrigin: "top left",
// //               }}
// //             >
// //               <DynamicInvoice printData={printData} invoiceType={type} />
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

import React from "react";

/* ==================== HELPERS ==================== */
const toNumber = (v: any) => {
  const n = typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : v;
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (v: any, currency = "₹") => {
  const n = toNumber(v);
  return `${currency}${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatNumber = (v: any, decimals = 2) => {
  const n = toNumber(v);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatDate = (v: any) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (v: any) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 19);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

/* ==================== MAIN DYNAMIC INVOICE COMPONENT ==================== */
/* Everything this component (and its children) renders comes from `printData`. */
const DynamicInvoice = ({ printData, invoiceType = "tax-invoice" }: any) => {
  const data =
    printData?.accountSales ??
    printData?.saleOrder ??
    printData?.quotation ??
    printData?.grv ??
    printData?.creditNote ??
    printData?.debitNote ??
    printData ??
    {};

  const company = data?.Company ?? data?.BillingCompany ?? data?.company ?? {};
  const items =
    data?.DebtorInvoicingOrderItems ??
    data?.CreditorGoodsReceivingOrderItems ??
    data?.items ??
    data?.cartItems ??
    data?.creditNoteItems ??
    data?.debitNoteItems ??
    [];

  const type =
    invoiceType ||
    (data?.supplierInvoiceNumber || data?.grvDate
      ? "grv"
      : data?.creditNoteNumber
      ? "credit-note"
      : data?.debitNoteNumber
      ? "debit-note"
      : data?.quotationNumber
      ? "quotation"
      : data?.tenderType || data?.orderNumber?.startsWith("CS")
      ? "cash-slip"
      : "tax-invoice");

  if (type === "cash-slip") {
    return <CashSlipView data={data} company={company} items={items} />;
  }
  if (type === "grv") {
    return <GrvView data={data} company={company} items={items} />;
  }
  return (
    <StandardDocumentView data={data} company={company} items={items} type={type} />
  );
};

/* ==================== CASH SLIP (Receipt) ==================== */
const CashSlipView = ({ data, company, items }: any) => {
  const total = toNumber(
    data?.totalPrice ||
      data?.grandTotal ||
      items.reduce((sum: any, item: any) => sum + toNumber(item?.lineTotal), 0)
  );

  return (
    <div className="invoice-print-root cash-slip">
      <style>{`
                .cash-slip { font-family: "Courier New", monospace; width: 300px; margin: 0 auto; background: #fff; color: #000; font-size: 11px; line-height: 1.2; padding: 10px; }
                .cash-slip .text-center { text-align: center; }
                .cash-slip .text-right { text-align: right; }
                .cash-slip .dashed-line { margin: 6px 0; text-align: center; border-bottom: 1px dashed #000; }
                .cash-slip table { width: 100%; border-collapse: collapse; font-size: 10px; }
                .cash-slip th, .cash-slip td { padding: 4px 2px; border-bottom: 1px dashed #ccc; }
                .cash-slip .total { font-weight: bold; font-size: 13px; }
            `}</style>
      <div className="invoice-wrapper">
        <div className="text-center">
          <div style={{ fontSize: "13px", fontWeight: "bold" }}>
            ***** {company?.companyName?.toUpperCase() || "RETAIL STORE"} *****
          </div>
          {[
            company?.addressLineOne,
            company?.addressLineTwo,
            company?.addressLineThree,
            company?.addressLineFour,
            company?.postalCode,
          ]
            .filter(Boolean)
            .join(", ")}
          {company?.telephone && <div>Tel: {company.telephone}</div>}
          {company?.taxNumber && <div>Tax No: {company.taxNumber}</div>}
          <div>{formatDateTime(data?.createdAt)}</div>
          <div className="dashed-line">--------------------------------</div>
        </div>

        <div>Customer: {data?.name || "Walk-In Customer"}</div>
        <div>Phone: {data?.telNumber || "N/A"}</div>
        <div>Order No.: {data?.orderNumber || data?.id}</div>
        <div className="dashed-line">--------------------------------</div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th className="text-right">Excl.</th>
              <th className="text-right">Incl.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: any) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{item?.CompanyStockDetail?.description || item?.description}</td>
                <td className="text-right">{formatMoney(item?.unitPrice)}</td>
                <td className="text-right">
                  {formatMoney(item?.lineTotal)} x{item?.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          className="total"
          style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}
        >
          <span>TOTAL:</span>
          <span>{formatMoney(total)}</span>
        </div>

        <div className="dashed-line">--------------------------------</div>
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          Thank you for your business!
        </div>
      </div>
    </div>
  );
};

/* ==================== GRV VIEW ==================== */
const GrvView = ({ data, company, items }: any) => (
  <div className="invoice-print-root">
    <style>{`
            .page { width: 210mm; min-height: 297mm; padding: 10mm; font-size: 11px; background:#fff; color:#000; font-family: Arial, Helvetica, sans-serif; }
            .items { width: 100%; border-collapse: collapse; }
            .items th, .items td { border: 1px solid #000; padding: 5px; }
            .num { text-align: right; }
        `}</style>
    <main className="page">
      <h1 style={{ textAlign: "center" }}>Goods Receiving Note</h1>
      <div>
        <strong>GRV No:</strong> {data?.supplierInvoiceNumber || data?.id}
      </div>
      <div>
        <strong>Date:</strong> {formatDate(data?.grvDate || data?.createdAt)}
      </div>
      <div>
        <strong>Supplier:</strong> {data?.name || data?.Supplier?.name}
      </div>

      <table className="items" style={{ marginTop: "15px" }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Item Code</th>
            <th>Description</th>
            <th className="num">Price Excl.</th>
            <th className="num">Qty</th>
            <th className="num">Free Qty</th>
            <th className="num">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: any) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td>{item?.CompanyStockDetail?.itemCode}</td>
              <td>{item?.description}</td>
              <td className="num">{formatMoney(item?.unitPrice)}</td>
              <td className="num">{item?.quantity}</td>
              <td className="num">{item?.freeStock || 0}</td>
              <td className="num">{formatMoney(item?.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "20px", textAlign: "right", fontWeight: "bold" }}>
        Grand Total: {formatMoney(data?.goodsTotal)}
      </div>
    </main>
  </div>
);

/* ==================== STANDARD DOCUMENT VIEW ==================== */
/* Handles: tax-invoice, credit-note, debit-note, quotation, sale-order */
const StandardDocumentView = ({ data, company, items, type }: any) => {
  const isCredit = type === "credit-note";
  const isDebit = type === "debit-note";
  const isQuote = type === "quotation";
  const isSaleOrder = type === "sale-order";
  const title = isCredit
    ? "Credit Note"
    : isDebit
    ? "Debit Note"
    : isQuote
    ? "Quotation"
    : isSaleOrder
    ? "Sale Order"
    : "Tax Invoice";

  const debtor = data?.CompanyDebtor || {};
  const subtotalExclusive = toNumber(data?.subtotalExclusive ?? data?.goodsTotal);
  const discountAmount = toNumber(data?.discountAmount);
  const vatTotal = toNumber(data?.taxAmount ?? data?.vatAmount);
  const grandTotal = toNumber(data?.totalIncl ?? data?.grandTotal ?? data?.totalPrice);
  const totalLineDiscount = items.reduce(
    (sum: number, it: any) => sum + toNumber(it?.discount ?? it?.discountAmount ?? it?.lineDiscount ?? 0),
    0,
  );

  return (
    <div className="invoice-print-root">
      <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .invoice-print-root { background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.18; }
                .page { width: 210mm; min-height: 297mm; padding: 6mm 8mm 8mm; margin: 0 auto; position: relative; }
                .header { text-align: center; font-size: 12px; line-height: 1.2; margin-bottom: 12px; }
                .header h1 { font-size: 13px; text-decoration: underline; margin-bottom: 2px; }
                .header .company { font-size: 12.5px; font-weight: 700; margin-top: 5px; }
                .meta-grid { display: flex; gap: 8px; margin-bottom: 4px; }
                .box { border: 1.3px solid #000; border-radius: 8px; min-height: 27mm; padding: 4px 7px; flex: 1; }
                .box h2 { font-size: 12.5px; margin-bottom: 8px; }
                .invoice-to { display: flex; flex-direction: column; justify-content: space-between; }
                .details-row { display: flex; gap: 14px; margin-bottom: 2px; }
                .details-row .label { width: 92px; }
                .items { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.4px; }
                .items thead th { border-top: 1.3px solid #000; border-bottom: 1.3px solid #000; padding: 3px 3px 4px; font-weight: 700; text-align: left; }
                .items td { padding: 2px 4px; vertical-align: top; border-bottom: 1px solid #ddd; }
                .num { text-align: right; white-space: nowrap; }
                .center { text-align: center; }
                .footer-area { position: absolute; left: 8mm; right: 8mm; bottom: 12mm; border-top: 1.3px solid #000; padding-top: 9px; display: flex; gap: 20px; }
                .banking { flex: 1.35; }
                .totals { flex: 0.9; font-size: 11px; }
                .total-row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
                .boxed-total { border-top: 1.3px solid #000; border-bottom: 1.3px solid #000; padding: 7px 0; }
                .branch-lines { position: absolute; left: 0; right: 0; bottom: -1px; transform: translateY(100%); font-size: 10.5px; line-height: 1.5; }
            `}</style>

      <main className="page">
        <section className="header">
          <h1>{title}</h1>
          <div>
            <strong>Vat Registration No: {company?.taxNumber || ""}</strong>
          </div>
          <div className="company">{company?.companyName}</div>
          <div>
            Address:{" "}
            {[
              company?.addressLineOne,
              company?.addressLineTwo,
              company?.addressLineThree,
              company?.addressLineFour,
            ]
              .filter(Boolean)
              .join(", ")}
            {company?.telephone ? `; Tel: ${company.telephone}` : ""}
          </div>
        </section>

        <section className="meta-grid">
          <div className="box invoice-to">
            <div>
              <h2>Invoice To</h2>
              <div>{debtor?.name || data?.name || ""}</div>
              <div>{debtor?.deliveryAddress || debtor?.postalAddress || data?.address || ""}</div>
            </div>
            <div>Customer Vat No.: {debtor?.taxNumber || ""}</div>
          </div>

          <div className="box">
            <h2>Details:</h2>
            <div className="details-row">
              <span className="label">Order No</span>
              <span className="value">{data?.orderNumber}</span>
            </div>
            <div className="details-row">
              <span className="label">Account No</span>
              <span className="value">{debtor?.accountNumber}</span>
            </div>
            <div className="details-row">
              <span className="label">Date</span>
              <span className="value">{formatDate(data?.invoiceDate || data?.createdAt)}</span>
            </div>
            <div className="details-row">
              <span className="label">Document No</span>
              <span className="value">
                {data?.invoiceNumber ||
                  data?.quotationNumber ||
                  data?.creditNoteNumber ||
                  data?.debitNoteNumber ||
                  data?.orderNumber ||
                  data?.id}
              </span>
            </div>
          </div>
        </section>

        <table className="items">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Description</th>
              <th className="num">Qty</th>
              <th className="num">Price Excl.</th>
              <th className="num">Disc.</th>
              <th className="num">Vat Amt</th>
              <th className="num">Total Incl.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, idx: any) => (
              <tr key={idx}>
                <td>{it?.CompanyStockDetail?.itemCode || it?.itemCode || ""}</td>
                <td>{it?.description || it?.CompanyStockDetail?.description || ""}</td>
                <td className="num">{formatNumber(it?.quantity)}</td>
                <td className="num">{formatNumber(it?.unitPrice || it?.priceExclusive)}</td>
                <td className="num">{formatNumber(it?.discount || it?.discountAmount)}</td>
                <td className="num">{formatNumber(it?.taxAmount || it?.vatAmount)}</td>
                <td className="num">{formatNumber(it?.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="footer-area">
          <div className="banking">
            <h2>Banking Details:</h2>
            <div>
              <strong>{company?.bankName}</strong>
            </div>
            <div>ACC. NO: {company?.bankAccountNumber}</div>
            <div>BRANCH: {company?.bankBranchCode}</div>
          </div>

           <div className="totals">
            <div className="total-row">
              <span>Subtotal (Exclusive)</span>
              <strong>{formatMoney(subtotalExclusive)}</strong>
            </div>
            {totalLineDiscount > 0 && (
              <div className="total-row">
                <span>Total Savings</span>
                <strong>-{formatMoney(totalLineDiscount)}</strong>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="total-row">
                <span>Discount</span>
                <strong>-{formatMoney(discountAmount)}</strong>
              </div>
            )}
            <div className="total-row">
              <span>Vat</span>
              <strong>{formatMoney(vatTotal)}</strong>
            </div>
            <div className="total-row boxed-total">
              <span>Total</span>
              <strong>{formatMoney(grandTotal)}</strong>
            </div>
          </div>

          <div className="branch-lines">
            <strong>Conditions: No refunds and exchange allowed on all items.</strong>
            <div>Created: {formatDateTime(data?.createdAt)}</div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DynamicInvoice;