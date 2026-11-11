// grv-claim-invoice.tsx
import React from 'react';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment';

export interface GRVClaimData {
  id: string;
  claimNumber?: string;
  claimDate: string;
  claimReason?: string;
  sourceType?: string;
  supplierInvoiceNumber?: string;
  goodsReceivingOrderId?: string;
  totalClaimExclusive: number;
  totalClaimInclusive: number;
  taxAmount?: number;
  notes?: string;

  CompanyCreditor: {
    name: string;
    accountNumber?: string;
  };

  CreditorGoodsReceivingOrder?: {
    supplierInvoiceNumber?: string;
    orderNumber?: string;
    grvDate?: string;
  };

  GoodsReceivingClaimItems: Array<{
    itemCode: string;
    description: string;
    quantity: number;
    unitClaimExclusive: number;
    taxPercent: number;
    totalClaimExclusive: number;
    totalClaimInclusive: number;
    dealDateFrom?: string;
    dealDateTo?: string;
    dealAmount?: number;
  }>;

  createdAt: string;
}

export interface GRVClaimInvoiceProps {
  printData: GRVClaimData;
}

const GRVClaimInvoice: React.FC<GRVClaimInvoiceProps> = ({ printData }) => {
  const company = useAuthUser((state) => state?.company);
  const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

  const creditor = printData.CompanyCreditor;
  const order = printData.CreditorGoodsReceivingOrder;
  const items = printData.GoodsReceivingClaimItems || [];
  const firstItem = items[0];

  const subtotal = printData.totalClaimExclusive || 0;
  const totalItems = items.length;

  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white text-[11px] font-sans relative flex flex-col p-[8mm] box-border print:shadow-none">
      <style>{`
        @media print {
          html, body { margin: 0; padding: 0; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      <div className="border border-black flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center font-bold text-[14px] py-1.5 border-b border-black bg-white">
          Goods Receiving Voucher
        </div>

        {/* Company & Contact Info */}
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="w-1/2 border-b border-r border-black p-2 align-top">
                <div className="font-bold">
                  {company?.companyName || 'One Touch Domain Technologies (Pty) Ltd'}
                </div>
                <div>Block B, Tech Park</div>
                <div>123 Rivonia Road</div>
                <div>Sandton</div>
                <div>Gauteng</div>
                <div>2196</div>
              </td>
              <td className="w-1/2 border-b border-black p-2 align-top">
                <div className="text-center font-bold text-red-600 mb-1">
                  *** Copy of Original ***
                </div>
                <table className="w-full border-collapse text-[11px]">
                  <tbody>
                    <tr>
                      <td className="font-bold w-[45%]">Telephone</td>
                      <td>{company?.telephone || '+27 11 123 4567'}</td>
                    </tr>
                    <tr>
                      <td className="font-bold">Fax</td>
                      <td>+27 11 123 4568</td>
                    </tr>
                    <tr>
                      <td className="font-bold">E Mail</td>
                      <td>{company?.email || 'info@onetowntech.co.za'}</td>
                    </tr>
                    <tr>
                      <td className="font-bold">Vat Registration No</td>
                      <td>{company?.vatNumber || '9876543210'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Supplier & Deliver To */}
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="w-1/2 border-b border-r border-black p-2 align-top h-16">
                <div className="font-bold">Supplier</div>
                <div className="font-bold mt-1">{creditor.name}</div>
              </td>
              <td className="w-1/2 border-b border-black p-2 align-top h-16">
                <div className="font-bold">Deliver To</div>
                <div className="font-bold mt-2">
                  {company?.companyName || 'One Touch Domain Technologies (Pty) Ltd'}
                </div>
                <div>Block B, Tech Park</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Meta Grid */}
        <table className="w-full border-collapse border-b border-black text-center text-[11px]">
          <thead>
            <tr className="font-bold">
              <th className="p-1">Account No</th>
              <th className="p-1">Orig. Inv. Date</th>
              <th className="p-1">Grv. Cap. Date</th>
              <th className="p-1">Rec. Date</th>
              <th className="p-1">Order Number</th>
              <th className="p-1">Representative</th>
              <th className="p-1">GRV Number</th>
              <th className="p-1">Page</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-1">{creditor.accountNumber || 'N/A'}</td>
              <td className="p-1">
                {order?.grvDate ? moment(order.grvDate).format('DD/MM/YYYY') : moment(printData.claimDate).format('DD/MM/YYYY')}
              </td>
              <td className="p-1">{moment(printData.claimDate).format('DD/MM/YYYY')}</td>
              <td className="p-1">{moment(printData.claimDate).format('DD/MM/YYYY')}</td>
              <td className="p-1">{order?.orderNumber || ''}</td>
              <td className="p-1"></td>
              <td className="p-1">{printData.supplierInvoiceNumber || printData.claimNumber || 'N/A'}</td>
              <td className="p-1">2 of 2</td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table className="w-full border-collapse text-[11px] mt-1">
          <thead>
            <tr className="font-bold border-b border-black">
              <th className="p-1 text-left">Item Code</th>
              <th className="p-1 text-left">Description</th>
              <th className="p-1 text-right">Quantity</th>
              <th className="p-1 text-right">Unit Price</th>
              <th className="p-1 text-right">Disc %</th>
              <th className="p-1 text-right">Vat %</th>
              <th className="p-1 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="p-1">{item.itemCode}</td>
                <td className="p-1">{item.description}</td>
                <td className="p-1 text-right">{item.quantity}</td>
                <td className="p-1 text-right">{item.unitClaimExclusive}</td>
                <td className="p-1 text-right">0.00%</td>
                <td className="p-1 text-right">{item.taxPercent}%</td>
                <td className="p-1 text-right">{item.totalClaimInclusive}</td>
              </tr>
            ))}

            {/* Claim Detail Row */}
            {firstItem && (
              <tr>
                <td colSpan={7} className="p-3 border-b border-black text-sm bg-gray-50">
                  Deal Date from: {firstItem.dealDateFrom ? moment(firstItem.dealDateFrom).format('DD/MM/YYYY') : 'N/A'} 
                  to: {firstItem.dealDateTo ? moment(firstItem.dealDateTo).format('DD/MM/YYYY') : 'N/A'}
                  &nbsp; Deal: {(firstItem.dealAmount || 0)}
                  &nbsp; unit claim: {firstItem.unitClaimExclusive} excl.
                  &nbsp; Total claim: {firstItem.totalClaimInclusive} incl.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer Section (pinned to bottom) */}
        <div className="mt-auto">
          <table className="w-full border-collapse border-t border-black text-[11px]">
            <tbody>
              <tr>
                {/* Extra Charges */}
                <td className="w-1/3 border-r border-black p-2 align-top">
                  <div className="font-bold mb-1">Extra Charges</div>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>No Description</span>
                      <span>0.00</span>
                    </div>
                  ))}
                </td>

                {/* Number of Items */}
                <td className="w-1/3 border-r border-black p-2 align-middle text-center">
                  <div className="font-bold">Number of Items</div>
                  <div className="text-[16px] font-bold mt-8">{totalItems}</div>
                </td>

                {/* Totals */}
                <td className="w-1/3 p-2 align-top">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="p-0.5">Subtotal (Exclusive)</td>
                        <td className="p-0.5 text-right font-bold">{subtotal}</td>
                      </tr>
                      <tr>
                        <td className="p-0.5">Discount 0%</td>
                        <td className="p-0.5 text-right font-bold">0.00</td>
                      </tr>
                      <tr>
                        <td className="p-0.5">Vat</td>
                        <td className="p-0.5 text-right font-bold">{(printData.taxAmount || 0)}</td>
                      </tr>
                      <tr className="font-bold">
                        <td className="p-0.5">Total</td>
                        <td className="p-0.5 text-right">
                          {printData.totalClaimInclusive}
                        </td>
                      </tr>
                      <tr className="font-bold border-t border-black">
                        <td className="p-0.5">Total Claim</td>
                        <td className="p-0.5 text-right">
                          {printData.totalClaimInclusive} incl.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Created Date */}
          <div className="text-center text-[11px] py-2 border-t border-black">
            Created: {moment(printData.createdAt).format('DD/MM/YYYY HH:mm:ss')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GRVClaimInvoice;