import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import ClaimInvoice, { ClaimInvoiceData } from './claim-invoice';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Download, Mail, Printer } from 'lucide-react';

export interface ClaimInvoiceDialogProps {
    onClose: () => void;
    printData: ClaimInvoiceData;
}

const ClaimInvoiceDialog = ({ onClose, printData }: ClaimInvoiceDialogProps) => {
    if (!printData) return null;
    const contentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ contentRef });

    const handleDownload = useReactToPrint({ contentRef });

    return (
        <Dialog open={!!printData} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[420px] !max-w-none flex-col !gap-0 !space-y-0 overflow-hidden bg-white p-0">
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

                <div className="flex-1 overflow-auto">
                    <div ref={contentRef}>
                        <ClaimInvoice printData={printData} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ClaimInvoiceDialog;