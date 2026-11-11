import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import CreditNoteInvoice from './invoice';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { CreditNoteInvoiceType } from '@/api-queries/credit-note';
import { Download, Mail, Printer } from 'lucide-react';

export interface CreditNoteInvoiceDialogProps {
    onClose: () => void;
    printData: CreditNoteInvoiceType;
}

const CreditNoteInvoiceDialog = ({ onClose, printData }: CreditNoteInvoiceDialogProps) => {
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

                <div ref={contentRef}>
                    <CreditNoteInvoice printData={printData} />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreditNoteInvoiceDialog;
