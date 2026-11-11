// import { Button } from '@/components/ui/button';
// import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
// import AccountSalesInvoice from './invoice';
// import { useRef } from 'react';
// import { useReactToPrint } from 'react-to-print';
// import { AccountSaleInvoiceType } from '@/api-queries/point-of-sale/account-sales/account-sales';
// import { QuotationInvoiceType } from '@/api-queries/point-of-sale/account-sales/quotations';
// import { SaleOrderInvoiceType } from '@/api-queries/point-of-sale/account-sales/sale-order';
// import { Download, Mail, Printer } from 'lucide-react';

// export interface AccountSalesInvoiceDialogProps {
//     onClose: () => void;
//     printData: AccountSaleInvoiceType | SaleOrderInvoiceType | QuotationInvoiceType;
// }

// const AccountSalesInvoiceDialog = ({ onClose, printData }: AccountSalesInvoiceDialogProps) => {
//     if (!printData) return null;
//     console.log("print data",printData)
//     const contentRef = useRef<HTMLDivElement>(null);
//     const handlePrint = useReactToPrint({ contentRef });

//     const handleDownload = useReactToPrint({ contentRef });

//     return (
//         <Dialog open={!!printData} onOpenChange={onClose}>
//             <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col !gap-0 !space-y-0 overflow-hidden bg-white p-0">
//                 <DialogHeader className="flex items-center justify-between border-b px-4 py-2">
//                     <div className="flex items-center gap-2">
//                         <Button size="sm" onClick={handleDownload}>
//                             <Download /> Download PDF
//                         </Button>
//                         <Button size="sm" onClick={handlePrint}>
//                             <Printer /> Print
//                         </Button>
//                         <Button size="sm" onClick={handlePrint}>
//                             <Mail /> Email
//                         </Button>
//                     </div>
//                 </DialogHeader>

//                 <div ref={contentRef}>
//                     <AccountSalesInvoice printData={printData} />
//                 </div>
//             </DialogContent>
//         </Dialog>
//     );
// };

// export default AccountSalesInvoiceDialog;
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import AccountSalesInvoice from './invoice';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { AccountSaleInvoiceType } from '@/api-queries/point-of-sale/account-sales/account-sales';
import { QuotationInvoiceType } from '@/api-queries/point-of-sale/account-sales/quotations';
import { SaleOrderInvoiceType } from '@/api-queries/point-of-sale/account-sales/sale-order';
import { Download, Mail, Printer } from 'lucide-react';

export interface AccountSalesInvoiceDialogProps {
    onClose: () => void;
    printData: AccountSaleInvoiceType | SaleOrderInvoiceType | QuotationInvoiceType;
}

const AccountSalesInvoiceDialog = ({ onClose, printData }: AccountSalesInvoiceDialogProps) => {
    if (!printData) return null;

    const contentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({ contentRef });
    const handleDownload = useReactToPrint({contentRef});

    const handleEmail = () => {
   
        console.log('email invoice', printData);
    };

    return (
        <Dialog open={!!printData} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col !gap-0 !space-y-0 overflow-hidden bg-white p-0">
                <DialogHeader className="flex items-center justify-between border-b px-4 py-2">
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleDownload}>
                            <Download /> Download PDF
                        </Button>
                        <Button size="sm" onClick={handlePrint}>
                            <Printer /> Print
                        </Button>
                        <Button size="sm" onClick={handleEmail}>
                            <Mail /> Email
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto bg-neutral-200 py-6">
                    <div ref={contentRef} className="mx-auto w-fit shadow-lg">
                        <AccountSalesInvoice printData={printData} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AccountSalesInvoiceDialog;