'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GoodsReceivingDetails } from '@/api-queries/goods-receiving';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment-timezone';
import { Printer, X, Download, Loader2 } from 'lucide-react';

interface ClaimPrintDocument {
    claimId?: string;
    claimNumber: string;
    total: number;
    pdfUrl: string | null;
}

interface GRVInvoiceDialogProps {
    printData: GoodsReceivingDetails;
    includeClaimPage?: boolean;
    onClose: () => void;
    onRefreshClaimPrint?: (claimId: string) => Promise<ClaimPrintDocument | null>;
}

export default function GRVInvoiceDialog({ printData, includeClaimPage = false, onClose, onRefreshClaimPrint }: GRVInvoiceDialogProps) {
    const company = useAuthUser((state) => state.user?.company);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || '';

    const data: any = printData || {};

    const grvItems = data?.CreditorGoodsReceivingOrderItems || data?.DebtorGoodsReceivingOrderItems || data?.items || [];

    const claimHeader = data?.GoodsReceivingClaims?.[0] || data?.goodsReceivingClaims?.[0] || null;

    const claimLineItems = grvItems.filter(
        (it: any) =>
            Number(it?.dealAmount) > 0 ||
            Number(it?.unitClaimExclusive) > 0 ||
            Number(it?.totalClaimInclusive) > 0,
    );

    const claim = claimHeader;
    // console.log("claim",claim)
    const claimItems = claimHeader?.GoodsReceivingClaimItems?.length ? claimHeader.GoodsReceivingClaimItems : claimLineItems;

    const showClaimPage = includeClaimPage && claimItems.length > 0;

    const claimPrintDocuments: ClaimPrintDocument[] = data?.claimPrintDocuments || [];
    const matchedClaimPrintDocument =
        claimPrintDocuments.find((doc) => doc.claimNumber === (claim?.invoiceNumber || claim?.claimNumber)) ||
        claimPrintDocuments[0] ||
        null;

    const [claimPdf, setClaimPdf] = useState<ClaimPrintDocument | null>(matchedClaimPrintDocument);
    const [checkingPdf, setCheckingPdf] = useState(false);

    useEffect(() => {
        setClaimPdf(matchedClaimPrintDocument);
    }, [matchedClaimPrintDocument]);


    // ---- formatting helpers -------------------------------------------------
    const fmt = (val: any) => (Number(val) || 0).toFixed(2);
    const fmtPct = (val: any) => `${(Number(val) || 0).toFixed(2)}%`;
    const fmtDate = (val: any) => (val ? moment(val).format('DD/MM/YYYY') : 'N/A');
    const fmtDateTime = (val: any) => (val ? moment(val).format('DD/MM/YYYY HH:mm:ss') : 'N/A');

    const addressLines: string[] = [
        company?.addressLineOne,
        company?.addressLineTwo,
        company?.addressLineThree,
        company?.addressLineFour,
        company?.postalCode,
    ].filter(Boolean);

    const companyName = company?.companyName || 'Company Name';
    const companyVat = company?.vatNumber || company?.taxNumber || 'N/A';
    const companyTel = company?.telephone || 'N/A';
    const companyFax = company?.fax || 'N/A';
    const companyEmail = company?.emailAddress || 'N/A';

    const supplierName = data?.CompanyCreditor?.name || data?.name || 'N/A';
    const supplierAccount = data?.CompanyCreditor?.accountNumber || 'N/A';
    const supplierInvoice = data?.supplierInvoiceNumber || 'N/A';

    const grvNumber = data?.invoiceNumber || 'N/A';
    const orderNumber = data?.orderNumber || data?.purchaseOrderNumber || 'N/A';
    const representative = data?.createdByName || 'N/A';

    const grvItemCount = grvItems.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);
    const claimItemCount = claimItems.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);

    const grvTaxAmount = Number(data?.taxAmount) || 0;
    const grvGoodsTotal = Number(data?.goodsTotal) || 0;
    const grvDiscount = Number(data?.discountAmount) || 0;
    const grvTotal = grvGoodsTotal + grvTaxAmount - grvDiscount;

    const claimExclusive =
        claim?.totalClaimExclusive != null
            ? Number(claim.totalClaimExclusive)
            : claimItems.reduce((sum: number, ci: any) => sum + (Number(ci.unitClaimExclusive) || 0), 0);

    const claimInclusive =
        claim?.totalClaimInclusive != null
            ? Number(claim.totalClaimInclusive)
            : claimItems.reduce((sum: number, ci: any) => sum + (Number(ci.totalClaimInclusive) || 0), 0);

    const claimTax = claim?.taxAmount != null ? Number(claim.taxAmount) : claimInclusive - claimExclusive;

    const totalPages = showClaimPage ? 2 : 1;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="!max-w-none flex h-[95vh] w-[95vw] flex-col overflow-hidden p-0">
                <style>{`
                    @page { size: A4 portrait; margin: 8mm; }
                    .grv-print-root * { box-sizing: border-box; }
                    .grv-print-root {
                        margin: 0;
                        background: #e5e7eb;
                        color: #000;
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 12px;
                        line-height: 1.25;
                    }
                    .grv-print-root .grv-page {
                        position: relative;
                        width: 210mm;
                        min-height: 277mm;
                        margin: 12px auto;
                        padding: 5mm 4mm 48mm;
                        background: #fff;
                        box-shadow: 0 2px 12px rgba(0, 0, 0, .14);
                        page-break-after: always;
                    }
                    .grv-print-root .grv-page:last-child { page-break-after: auto; }
                    .grv-print-root .title-bar {
                        border: 1px solid #000;
                        text-align: center;
                        font-weight: 700;
                        padding: 2px 0;
                        margin-bottom: 4mm;
                        text-transform: uppercase;
                    }
                    .grv-print-root .box-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm; }
                    .grv-print-root .info-box { border: 1px solid #000; border-radius: 7px; min-height: 43mm; padding: 4mm 5mm; }
                    .grv-print-root .company-box { font-weight: 700; }
                    .grv-print-root .contact-box { padding-top: 1mm; }
                    .grv-print-root .party-box { min-height: 44mm; }
                    .grv-print-root .box-heading { text-align: center; font-weight: 700; margin-bottom: 12mm; }
                    .grv-print-root .plain { width: 100%; border-collapse: collapse; margin-top: 2mm; }
                    .grv-print-root .plain td, .grv-print-root .plain th { border: 0; padding: 2px; vertical-align: top; }
                    .grv-print-root .plain td:first-child { width: 43%; }
                    .grv-print-root .bold { font-weight: 700; }
                    .grv-print-root .meta-grid {
                        display: grid;
                        grid-template-columns: 1.1fr 1fr 1fr 1fr 1.1fr 1.1fr 1fr .55fr;
                        gap: 4mm;
                        padding: 5mm 2mm 6mm;
                    }
                    .grv-print-root .meta-label { font-weight: 700; margin-bottom: 4mm; white-space: nowrap; }
                    .grv-print-root .items { width: 100%; border-collapse: collapse; table-layout: fixed; }
                    .grv-print-root .items th { border: 1px solid #000; padding: 2px 3px; font-weight: 700; text-align: left; background: #fff; }
                    .grv-print-root .items td { border: 0; padding: 2px 3px; vertical-align: top; word-break: break-word; }
                    .grv-print-root .item-row td { height: 18px; }
                    .grv-print-root .claim-page .item-row td { padding-top: 4px; font-size: 11px; }
                    .grv-print-root .claim-detail { border-bottom: 1px dashed #000 !important; font-size: 11px; padding: 4px 3px 6px !important; }
                    .grv-print-root .num { text-align: right !important; white-space: nowrap; }
                    .grv-print-root .claim-notice { border: 1px solid #000; margin-top: 8mm; padding: 3mm 4mm; font-weight: 700; text-align: center; }
                    .grv-print-root .footer-wrap {
                        position: absolute;
                        left: 4mm; right: 4mm; bottom: 14mm;
                        display: grid;
                        grid-template-columns: 1.65fr .9fr 1.7fr;
                        gap: 5mm;
                        align-items: stretch;
                    }
                    .grv-print-root .extra-box, .grv-print-root .item-count-box, .grv-print-root .totals-box {
                        border: 1px solid #000; min-height: 38mm; padding: 4mm;
                    }
                    .grv-print-root .charge-row, .grv-print-root .total-line {
                        display: flex; justify-content: space-between; gap: 5mm; margin-top: 3mm;
                    }
                    .grv-print-root .item-count-box { text-align: center; font-size: 16px; padding-top: 5mm; }
                    .grv-print-root .item-count-value { font-weight: 700; margin-top: 20mm; font-size: 13px; }
                    .grv-print-root .total-row { font-weight: 700; }
                    .grv-print-root .created {
                        position: absolute; left: 0; right: 0; bottom: -8mm; text-align: center; font-size: 11px;
                    }
                    .grv-print-root .col-code { width: 18%; }
                    .grv-print-root .col-description { width: 34%; }
                    .grv-print-root .col-qty { width: 10%; }
                    .grv-print-root .col-price { width: 12%; }
                    .grv-print-root .col-disc { width: 8%; }
                    .grv-print-root .col-vat { width: 8%; }
                    .grv-print-root .col-total { width: 10%; }
                    @media print {
                        .grv-print-hide { display: none !important; }
                        .grv-print-root { background: #fff; }
                        .grv-print-root .grv-page { margin: 0; box-shadow: none; width: auto; min-height: auto; }
                    }
                `}</style>

                <div className="grv-print-hide flex items-center justify-between border-b p-3">
                    <h2 className="text-lg font-semibold">
                        GRV {showClaimPage ? '& Supplier Claim' : ''}
                    </h2>
                    <div className="flex items-center gap-2">
                        {showClaimPage && (
                            claimPdf?.pdfUrl && (
                                <Button asChild size="sm" variant="outline">
                                    <a href={claimPdf.pdfUrl} target="_blank" rel="noreferrer">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Claim PDF
                                    </a>
                                </Button>
                            )
                        )}
                        <Button onClick={handlePrint} size="sm">
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                        <Button onClick={onClose} variant="outline" size="sm">
                            <X className="mr-2 h-4 w-4" />
                            Close
                        </Button>
                    </div>
                </div>

                <div className="grv-print-root flex-1 overflow-y-auto">
                    {/* -------------------- PAGE 1: GRV -------------------- */}
                    <section className="grv-page">
                        <div className="title-bar">Goods Received Voucher</div>

                        <div className="box-grid">
                            <div className="info-box company-box">
                                <div className="bold">{companyName}</div>
                                {addressLines.map((line, i) => (
                                    <div key={i}>{line}</div>
                                ))}
                            </div>
                            <div className="info-box contact-box">
                                <table className="plain">
                                    <tbody>
                                        <tr><td className="bold">Telephone</td><td>{companyTel}</td></tr>
                                        <tr><td className="bold">Fax</td><td>{companyFax}</td></tr>
                                        <tr><td className="bold">E Mail</td><td>{companyEmail}</td></tr>
                                        <tr><td className="bold">Vat Registration No</td><td>{companyVat}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="info-box party-box">
                                <div className="box-heading">Supplier</div>
                                <div className="bold">{supplierName}</div>
                                <div>Supplier Account: {supplierAccount}</div>
                                <div>Supplier Invoice: {supplierInvoice}</div>
                            </div>
                            <div className="info-box party-box">
                                <div className="box-heading">Deliver To</div>
                                <div className="bold">{companyName}</div>
                                {addressLines.slice(0, 2).map((line, i) => (
                                    <div key={i}>{line}</div>
                                ))}
                            </div>
                        </div>

                        <div className="meta-grid">
                            <div><div className="meta-label">Account No</div><div>{supplierAccount}</div></div>
                            <div><div className="meta-label">Orig. Inv. Date</div><div>{fmtDate(data?.supplierInvoiceDate || data?.grvDate)}</div></div>
                            <div><div className="meta-label">Grv. Cap. Date</div><div>{fmtDate(data?.grvDate)}</div></div>
                            <div><div className="meta-label">Rec. Date</div><div>{fmtDate(data?.receivedDate || data?.grvDate)}</div></div>
                            <div><div className="meta-label">Order Number</div><div>{orderNumber}</div></div>
                            <div><div className="meta-label">Representative</div><div>{representative}</div></div>
                            {/* <div><div className="meta-label">GRV Number</div><div>{grvNumber}</div></div> */}
                            <div>
                                <div className="meta-label">GRV Number</div>
                                <div className="w-[100px] line-clamp-3 break-all">
                                    {grvNumber}
                                </div>
                            </div>
                            <div><div className="meta-label">Page</div><div>1 of {totalPages}</div></div>
                        </div>

                        <table className="items">
                            <colgroup>
                                <col className="col-code" />
                                <col className="col-description" />
                                <col className="col-qty" />
                                <col className="col-price" />
                                <col className="col-disc" />
                                <col className="col-vat" />
                                <col className="col-total" />
                            </colgroup>
                            <thead>
                                <tr className="item-head">
                                    <th>Item Code</th>
                                    <th>Description</th>
                                    <th className="num">Quantity</th>
                                    <th className="num">Unit Price</th>
                                    <th className="num">Disc %</th>
                                    <th className="num">Vat %</th>
                                    <th className="num">Line Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grvItems.map((item: any, index: number) => (
                                    <tr className="item-row" key={item.id || index}>
                                        <td>{item.CompanyStockDetail?.itemCode || item.itemCode || 'N/A'}</td>
                                        <td>{item.description || item.CompanyStockDetail?.description || 'N/A'}</td>
                                        <td className="num">{fmt(item.quantity)}</td>
                                        <td className="num">{fmt(item.originalUnitPrice ?? item.unitPrice)}</td>
                                        <td className="num">{fmtPct(item.discountPercentage)}</td>
                                        <td className="num">{fmtPct(item.taxPercent ?? item.taxPercentage ?? item.vatPercentage)}</td>
                                        <td className="num">{fmt(item.lineTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* {claimItems.length > 0 && (
                            <div className="claim-notice">
                                A claim has been raised on this GRV. Do you want to print the claim?
                            </div>
                        )} */}

                        <div className="footer-wrap">
                            <div className="extra-box">
                                <div className="bold">Extra Charges</div>
                                {(data?.extraCharges && data.extraCharges.length > 0
                                    ? data.extraCharges
                                    : [{}, {}, {}, {}]
                                ).slice(0, 4).map((charge: any, i: number) => (
                                    <div className="charge-row" key={i}>
                                        <span>{charge?.description || 'No Description'}</span>
                                        <span>{fmt(charge?.amount)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="item-count-box">
                                <div>Number of Items</div>
                                <div className="item-count-value">{grvItemCount}</div>
                            </div>
                            <div className="totals-box">
                                <div className="total-line"><span>Subtotal (Exclusive)</span><span>{fmt(grvGoodsTotal)}</span></div>
                                <div className="total-line"><span>Discount {fmtPct(data?.discountPercentage)}</span><span>{fmt(grvDiscount)}</span></div>
                                <div className="total-line"><span>Vat</span><span>{fmt(grvTaxAmount)}</span></div>
                                <div className="total-line total-row"><span>Total</span><span>{fmt(grvTotal)}</span></div>
                            </div>
                            <div className="created">Created: {fmtDateTime(data?.createdAt)}</div>
                        </div>
                    </section>

                    {/* -------------------- PAGE 2: CLAIM -------------------- */}
                    {showClaimPage && (
                        <section className="grv-page claim-page">
                            <div className="title-bar">GRV Claim</div>

                            <div className="box-grid">
                                <div className="info-box company-box">
                                    <div className="bold">{companyName}</div>
                                    {addressLines.map((line, i) => (
                                        <div key={i}>{line}</div>
                                    ))}
                                </div>
                                <div className="info-box contact-box">
                                    <table className="plain">
                                        <tbody>
                                            <tr><td className="bold">Telephone</td><td>{companyTel}</td></tr>
                                            <tr><td className="bold">Fax</td><td>{companyFax}</td></tr>
                                            <tr><td className="bold">E Mail</td><td>{companyEmail}</td></tr>
                                            <tr><td className="bold">Vat Registration No</td><td>{companyVat}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="info-box party-box">
                                    <div className="box-heading">Supplier</div>
                                    <div className="bold">{supplierName}</div>
                                    <div>Supplier Account: {supplierAccount}</div>
                                    <div>Supplier Invoice: {supplierInvoice}</div>
                                </div>
                                <div className="info-box party-box">
                                    <div className="box-heading">Original GRV</div>
                                    <div className="bold">GRV Number: {grvNumber}</div>
                                    <div>Original Invoice Date: {fmtDate(data?.supplierInvoiceDate || data?.grvDate)}</div>
                                    <div>Claim Number: {claim?.invoiceNumber || claim?.claimNumber || grvNumber}</div>
                                </div>
                            </div>

                            <div className="meta-grid">
                                <div><div className="meta-label">Account No</div><div>{supplierAccount}</div></div>
                                <div><div className="meta-label">Claim Date</div><div>{fmtDate(claim?.claimDate || data?.grvDate)}</div></div>
                                {/* <div><div className="meta-label">Orig. Inv. No</div><div>{grvNumber}</div></div> */}
                                <div>
                                <div className="meta-label">Orig. Inv. No</div>
                                <div className="w-[100px] line-clamp-3 break-all">
                                    {grvNumber}
                                </div>
                                </div>
                                <div><div className="meta-label">Reason</div><div>{claim?.claimReason || 'Supplier Deal'}</div></div>
                                <div><div className="meta-label">Source</div><div>{claim?.sourceType || 'GRV'}</div></div>
                                <div><div className="meta-label">Reference</div><div>{orderNumber}</div></div>
                                <div><div className="meta-label">Claim Number</div><div>{ claim?.claimNumber || grvNumber}</div></div>
                                <div><div className="meta-label">Page</div><div>2 of {totalPages}</div></div>
                            </div>

                            <table className="items">
                                <colgroup>
                                    <col className="col-code" />
                                    <col className="col-description" />
                                    <col className="col-qty" />
                                    <col className="col-price" />
                                    <col className="col-disc" />
                                    <col className="col-vat" />
                                    <col className="col-total" />
                                </colgroup>
                                <thead>
                                    <tr className="item-head">
                                        <th>Item Code</th>
                                        <th>Description</th>
                                        <th className="num">Quantity</th>
                                        <th className="num">Latest Cost</th>
                                        <th className="num">Deal Price</th>
                                        <th className="num">Unit Claim</th>
                                        <th className="num">Total Claim</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {claimItems.map((ci: any, idx: number) => (
                                        <>
                                            <tr className="item-row" key={ci.id || idx}>
                                                <td>{ci.CompanyStockDetail?.itemCode || ci.itemCode || 'N/A'}</td>
                                                <td>{ci.description || ci.CompanyStockDetail?.description || 'N/A'}</td>
                                                <td className="num">{fmt(ci.quantity)}</td>
                                                <td className="num">{fmt(ci.originalUnitPrice ?? ci.unitCost ?? ci.unitPrice)}</td>
                                                <td className="num">{fmt(ci.dealAmount)}</td>
                                                <td className="num">{fmt(ci.unitClaimExclusive)}</td>
                                                <td className="num">{fmt(ci.totalClaimInclusive ?? ci.totalClaimExclusive)}</td>
                                            </tr>
                                            <tr key={`${ci.id || idx}-detail`}>
                                                <td colSpan={7} className="claim-detail">
                                                    Deal Date from: {fmtDate(ci.dealDateFrom)} to: {fmtDate(ci.dealDateTo)}
                                                    &nbsp; Deal: {fmt(ci.dealAmount)}
                                                    &nbsp; unit claim: {fmt(ci.unitClaimExclusive)} excl.
                                                    &nbsp; Total claim: {fmt(ci.totalClaimInclusive ?? ci.totalClaimExclusive)} incl.
                                                </td>
                                            </tr>
                                        </>
                                    ))}
                                </tbody>
                            </table>

                            <div className="footer-wrap">
                                <div className="extra-box">
                                    <div className="bold">Claim Note</div>
                                    <div className="charge-row"><span>GRV inventory valuation</span><span>Latest Cost</span></div>
                                    <div className="charge-row"><span>Claim basis</span><span>Latest Cost - Deal Price</span></div>
                                    <div className="charge-row"><span>Claim status</span><span>{claim?.status || 'ACTIVE'}</span></div>
                                </div>
                                <div className="item-count-box">
                                    <div>Number of Items</div>
                                    <div className="item-count-value">{claimItemCount}</div>
                                </div>
                                <div className="totals-box">
                                    <div className="total-line"><span>Claim Exclusive</span><span>{fmt(claimExclusive)}</span></div>
                                    <div className="total-line"><span>Vat</span><span>{fmt(claimTax)}</span></div>
                                    <div className="total-line total-row"><span>Total Claim</span><span>{fmt(claimInclusive)} incl.</span></div>
                                </div>
                                <div className="created">Created: {fmtDateTime(data?.createdAt)}</div>
                            </div>
                        </section>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}