import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import DebtorReceiptInvoice from './invoice';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { DebtorReceiptTypeProp } from './invoice';
import { Download, Mail, Printer } from 'lucide-react';

export type DebtorReceiptDialogProps = {
    onClose: () => void;
} & DebtorReceiptTypeProp;

const DebtorReceiptDialog = ({ onClose, printData }: DebtorReceiptDialogProps) => {
    if (!printData) return null;
    const contentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ contentRef });

    const handleDownload = useReactToPrint({ contentRef });

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
                        <Button size="sm" onClick={handlePrint}>
                            <Mail /> Email
                        </Button>
                    </div>
                </DialogHeader>

                <div ref={contentRef} className="!my-4 overflow-y-auto py-1">
                    <DebtorReceiptInvoice printData={printData} />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DebtorReceiptDialog;
