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
  sourceDocumentId?: string;
  supplierInvoiceNumber?: string;
  goodsReceivingOrderId?: string;
  notes?: string;
  totalClaimExclusive: number;
  totalClaimInclusive: number;
  taxAmount?: number;

  CompanyCreditor: {
    name: string;
    accountNumber?: string;
    taxNumber?: string;
  };

  CreditorGoodsReceivingOrder?: {
    supplierInvoiceNumber?: string;
    orderNumber?: string;
    grvDate?: string;
    totalQuantity?: number;
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

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 text-black font-sans text-[12px] leading-tight print:shadow-none">
      {/* ====================== PAGE 1: Goods Received Voucher ====================== */}
      <div className="mb-12 print:mb-0">
        <div className="border border-black text-center font-bold py-2 mb-6 text-xl">
          Goods Received Voucher
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {/* Company Info */}
          <div className="border border-black rounded p-5 font-bold">
            <div>{company?.companyName || 'One Touch Domain Technologies (Pty) Ltd'}</div>
            <div>Block B, Tech Park</div>
            <div>123 Rivonia Road</div>
            <div>Sandton</div>
            <div>Gauteng</div>
            <div>2196</div>
          </div>

          {/* Contact + Copy */}
          <div className="border border-black rounded p-5">
            <div className="text-red-600 text-3xl text-center font-bold mb-4">*** Copy of Original ***</div>
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="font-bold w-1/2">Telephone</td><td>{company?.telephone || '+27 11 123 4567'}</td></tr>
                <tr><td className="font-bold">Fax</td><td>+27 11 123 4568</td></tr>
                <tr><td className="font-bold">E Mail</td><td>{company?.email || 'info@onetowntech.co.za'}</td></tr>
                <tr><td className="font-bold">Vat Registration No</td><td>{company?.vatNumber || '9876543210'}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Supplier */}
          <div className="border border-black rounded p-5">
            <div className="text-center font-bold mb-8">Supplier</div>
            <div className="font-bold text-lg">{creditor.name}</div>
          </div>

          {/* Deliver To */}
          <div className="border border-black rounded p-5">
            <div className="text-center font-bold mb-8">Deliver To</div>
            <div className="font-bold">{company?.companyName || 'One Touch Domain Technologies (Pty) Ltd'}</div>
            <div>Block B, Tech Park</div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="grid grid-cols-8 gap-4 border border-black p-5 mb-6 text-sm">
          <div><div className="font-bold">Account No</div><div>{creditor.accountNumber || 'N/A'}</div></div>
          <div><div className="font-bold">Orig. Inv. Date</div><div>{moment(order?.grvDate || printData.claimDate).format('DD/MM/YYYY')}</div></div>
          <div><div className="font-bold">Grv. Cap. Date</div><div>{moment(printData.claimDate).format('DD/MM/YYYY')}</div></div>
          <div><div className="font-bold">Rec. Date</div><div>{moment(printData.claimDate).format('DD/MM/YYYY')}</div></div>
          <div><div className="font-bold">Order Number</div><div>{order?.orderNumber || ''}</div></div>
          <div><div className="font-bold">Representative</div><div></div></div>
          <div><div className="font-bold">GRV Number</div><div>{printData.supplierInvoiceNumber || printData.claimNumber || 'N/A'}</div></div>
          <div><div className="font-bold">Page</div><div>1 of 2</div></div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-8 text-sm">
          <colgroup>
            <col style={{ width: '18%' }} />
            <col style={{ width: '34%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr className="border border-black bg-gray-50">
              <th className="text-left p-2 border border-black font-bold">Item Code</th>
              <th className="text-left p-2 border border-black font-bold">Description</th>
              <th className="text-right p-2 border border-black font-bold">Quantity</th>
              <th className="text-right p-2 border border-black font-bold">Unit Price</th>
              <th className="text-right p-2 border border-black font-bold">Disc %</th>
              <th className="text-right p-2 border border-black font-bold">Vat %</th>
              <th className="text-right p-2 border border-black font-bold">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="p-2 border border-black">{item.itemCode}</td>
                <td className="p-2 border border-black">{item.description}</td>
                <td className="p-2 border border-black text-right">{item.quantity.toFixed(2)}</td>
                <td className="p-2 border border-black text-right">{item.unitClaimExclusive.toFixed(2)}</td>
                <td className="p-2 border border-black text-right">0.00%</td>
                <td className="p-2 border border-black text-right">{item.taxPercent.toFixed(2)}%</td>
                <td className="p-2 border border-black text-right">{item.totalClaimInclusive.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="grid grid-cols-[1.65fr_0.9fr_1.7fr] gap-4 relative">
          <div className="border border-black p-4">
            <div className="font-bold mb-2">Extra Charges</div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between text-sm mb-1.5">
                <span>No Description</span>
                <span>0.00</span>
              </div>
            ))}
          </div>

          <div className="border border-black p-4 text-center">
            <div>Number of Items</div>
            <div className="text-3xl font-bold mt-10">{items.length}</div>
          </div>

          <div className="border border-black p-4">
            <div className="flex justify-between mb-1.5">
              <span>Subtotal (Exclusive)</span>
              <span>{printData.totalClaimExclusive.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-1.5">
              <span>Discount 0%</span>
              <span>0.00</span>
            </div>
            <div className="flex justify-between mb-1.5">
              <span>Vat</span>
              <span>{printData.taxAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-black pt-2">
              <span>Total</span>
              <span>{printData.totalClaimInclusive.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="text-center text-xs mt-12">
          Created: {moment(printData.createdAt).format('DD/MM/YYYY HH:mm:ss')}
        </div>
      </div>

      {/* ====================== PAGE 2: GRV CLAIM ====================== */}
      <div>
        <div className="border border-black text-center font-bold py-2 mb-6 text-xl">
          GRV CLAIM
        </div>

        {/* Same Header as Page 1 */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="border border-black rounded p-5 font-bold">
            <div>{company?.companyName || 'One Touch Domain Technologies (Pty) Ltd'}</div>
            <div>Block B, Tech Park</div>
            <div>123 Rivonia Road</div>
            <div>Sandton</div>
            <div>Gauteng</div>
            <div>2196</div>
          </div>

          <div className="border border-black rounded p-5">
            <div className="text-red-600 text-3xl text-center font-bold mb-4">*** Copy of Original ***</div>
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="font-bold w-1/2">Telephone</td><td>{company?.telephone || '+27 11 123 4567'}</td></tr>
                <tr><td className="font-bold">Fax</td><td>+27 11 123 4568</td></tr>
                <tr><td className="font-bold">E Mail</td><td>{company?.email || 'info@onetowntech.co.za'}</td></tr>
                <tr><td className="font-bold">Vat Registration No</td><td>{company?.vatNumber || '9876543210'}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="border border-black rounded p-5">
            <div className="text-center font-bold mb-8">Supplier</div>
            <div className="font-bold text-lg">{creditor.name}</div>
          </div>

          <div className="border border-black rounded p-5">
            <div className="text-center font-bold mb-8">Deliver To</div>
            <div className="font-bold">{company?.companyName || 'One Touch Domain Technologies (Pty) Ltd'}</div>
            <div>Block B, Tech Park</div>
          </div>
        </div>

        {/* Meta Grid Page 2 */}
        <div className="grid grid-cols-8 gap-4 border border-black p-5 mb-6 text-sm">
          <div><div className="font-bold">Account No</div><div>{creditor.accountNumber || 'N/A'}</div></div>
          <div><div className="font-bold">Orig. Inv. Date</div><div>{moment(order?.grvDate || printData.claimDate).format('DD/MM/YYYY')}</div></div>
          <div><div className="font-bold">Grv. Cap. Date</div><div>{moment(printData.claimDate).format('DD/MM/YYYY')}</div></div>
          <div><div className="font-bold">Rec. Date</div><div>{moment(printData.claimDate).format('DD/MM/YYYY')}</div></div>
          <div><div className="font-bold">Order Number</div><div>{order?.orderNumber || ''}</div></div>
          <div><div className="font-bold">Representative</div><div></div></div>
          <div><div className="font-bold">GRV Number</div><div>{printData.supplierInvoiceNumber || printData.claimNumber || 'N/A'}</div></div>
          <div><div className="font-bold">Page</div><div>2 of 2</div></div>
        </div>

        {/* Items Table with Claim Detail */}
        <table className="w-full border-collapse mb-8 text-sm">
          <colgroup>
            <col style={{ width: '18%' }} />
            <col style={{ width: '34%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr className="border border-black bg-gray-50">
              <th className="text-left p-2 border border-black font-bold">Item Code</th>
              <th className="text-left p-2 border border-black font-bold">Description</th>
              <th className="text-right p-2 border border-black font-bold">Quantity</th>
              <th className="text-right p-2 border border-black font-bold">Unit Price</th>
              <th className="text-right p-2 border border-black font-bold">Disc %</th>
              <th className="text-right p-2 border border-black font-bold">Vat %</th>
              <th className="text-right p-2 border border-black font-bold">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="p-2 border border-black">{item.itemCode}</td>
                <td className="p-2 border border-black">{item.description}</td>
                <td className="p-2 border border-black text-right">{item.quantity.toFixed(2)}</td>
                <td className="p-2 border border-black text-right">{item.unitClaimExclusive.toFixed(2)}</td>
                <td className="p-2 border border-black text-right">0.00%</td>
                <td className="p-2 border border-black text-right">{item.taxPercent.toFixed(2)}%</td>
                <td className="p-2 border border-black text-right">{item.totalClaimInclusive.toFixed(2)}</td>
              </tr>
            ))}
            {firstItem && (
              <tr>
                <td colSpan={7} className="border border-black p-4 text-sm bg-gray-50">
                  Deal Date from: {firstItem.dealDateFrom ? moment(firstItem.dealDateFrom).format('DD/MM/YYYY') : 'N/A'} 
                  to: {firstItem.dealDateTo ? moment(firstItem.dealDateTo).format('DD/MM/YYYY') : 'N/A'}
                  &nbsp; Deal: {firstItem.dealAmount?.toFixed(2) || '0.00'}
                  &nbsp; unit claim: {firstItem.unitClaimExclusive.toFixed(2)} excl.
                  &nbsp; Total claim: {firstItem.totalClaimInclusive.toFixed(2)} incl.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer with Total Claim */}
        <div className="grid grid-cols-[1.65fr_0.9fr_1.7fr] gap-4 relative">
          <div className="border border-black p-4">
            <div className="font-bold mb-2">Extra Charges</div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between text-sm mb-1.5">
                <span>No Description</span>
                <span>0.00</span>
              </div>
            ))}
          </div>

          <div className="border border-black p-4 text-center">
            <div>Number of Items</div>
            <div className="text-3xl font-bold mt-10">{items.length}</div>
          </div>

          <div className="border border-black p-4">
            <div className="flex justify-between mb-1.5">
              <span>Subtotal (Exclusive)</span>
              <span>{printData.totalClaimExclusive.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-1.5">
              <span>Discount 0%</span>
              <span>0.00</span>
            </div>
            <div className="flex justify-between mb-1.5">
              <span>Vat</span>
              <span>{printData.taxAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-black pt-2">
              <span>Total</span>
              <span>{printData.totalClaimInclusive.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-black pt-2 mt-2">
              <span>Total Claim</span>
              <span>{printData.totalClaimInclusive.toFixed(2)} incl.</span>
            </div>
          </div>
        </div>

        <div className="text-center text-xs mt-12">
          Created: {moment(printData.createdAt).format('DD/MM/YYYY HH:mm:ss')}
        </div>
      </div>
    </div>
  );
};

export default GRVClaimInvoice;