import z from 'zod';

export const goodsReceivingSchema = z.object({
    accountNo: z.string({ error: 'Account No is required' }),
    nameAndAddressDetails: z.string({ error: 'Name and Address Details is required' }),
    tel: z.string({ error: 'Tel is required' }),
    email: z.string({ error: 'Email is required' }),
    tax: z.string({ error: 'Tax is required' }),
    grvDisc: z.number({ error: 'GRV Disc is required' }),
    grvDate: z.string({ error: 'GRV Date is required' }),
    orgDocumentDate: z.string({ error: 'Orginal Document Date is required' }),
    grvNumber: z.string({ error: 'GRV Number is required' }),
    deliveryMethod: z.string({ error: 'Delivery Method is required' }),
    orderNumber: z.string({ error: 'Order Number is required' }),
    supplierInvoiceNumber: z.string({ error: 'Supplier Invoice Number is required' }),
    grvMemo: z.string({ error: 'GRV Memo is required' }),
    deliveryNoteNo: z.string({ error: 'Delivery Note No is required' }),
    grvInclusive: z.enum(['yes', 'no']).default('yes'),
    goodsTotal: z.number({ error: 'Goods Total is required' }),
    discountAmnt: z.number({ error: 'Discount Amnt is required' }),
    taxAmount: z.number({ error: 'Tax Amount is required' }),
});

export type GoodsReceivingSchema = z.infer<typeof goodsReceivingSchema>;
