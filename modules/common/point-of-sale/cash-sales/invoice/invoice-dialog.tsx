import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CashSaleInvoice from './invoice';
import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { InvoiceProps } from './invoice';
import { Download, Eye, Mail, Printer } from 'lucide-react';

export type CashSaleInvoiceDialogProps = {
    onClose: () => void;
    isDuplicate?: boolean;
} & InvoiceProps;

const CashSaleInvoiceDialog = ({
    onClose,
    printData,
    type = 'CASH',
    isDuplicate = false,
}: CashSaleInvoiceDialogProps) => {
    const [mode, setMode] = useState<'choice' | 'view'>('choice');
    const contentRef = useRef<HTMLDivElement>(null);

    const handleDirectPrint = useReactToPrint({
        contentRef,
        onAfterPrint: () => {
            onClose();
        },
    });

    const handlePrint = useReactToPrint({ contentRef });
    const handleDownload = useReactToPrint({ contentRef });

    if (!printData) return null;

    return (
        <Dialog open={!!printData} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={
                    mode === 'view'
                        ? 'flex h-[95vh] w-[80vw] !max-w-none flex-col !gap-0 !space-y-0 overflow-hidden bg-white p-0'
                        : 'flex max-w-sm flex-col items-center gap-4 bg-white p-6'
                }
            >
                {mode === 'choice' ? (
                    <>
                        <DialogHeader className="text-center">
                            <DialogTitle className="text-xl font-semibold">Sale Successful!</DialogTitle>
                        </DialogHeader>

                        <p className="text-center text-sm text-muted-foreground">
                            Would you like to view the invoice, or send it straight to the printer?
                        </p>

                        <div className="mt-2 flex w-full flex-col gap-2">
                            <Button size="lg" className="w-full" onClick={() => handleDirectPrint()}>
                                <Printer className="mr-2 h-4 w-4" /> Print Invoice
                            </Button>

                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full"
                                onClick={() => setMode('view')}
                            >
                                <Eye className="mr-2 h-4 w-4" /> View Invoice
                            </Button>

                            <Button size="sm" variant="ghost" className="w-full" onClick={onClose}>
                                Skip
                            </Button>
                        </div>

                        {/*
                            The invoice must stay mounted so react-to-print has something to print
                            the moment "Print Invoice" is clicked — it's just kept off-screen so the
                            user doesn't see it in choice mode.
                        */}
                        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px' }} aria-hidden="true">
                            <div ref={contentRef}>
                                <CashSaleInvoice {...({ printData, type, isDuplicate } as InvoiceProps)} />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <DialogHeader className="flex items-center justify-between border-b px-4 py-2">
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => handleDownload()}>
                                    <Download /> Download PDF
                                </Button>
                                <Button size="sm" onClick={() => handlePrint()}>
                                    <Printer /> Print
                                </Button>
                                <Button size="sm" onClick={() => handlePrint()}>
                                    <Mail /> Email
                                </Button>
                            </div>
                        </DialogHeader>

                        <div ref={contentRef} className="!my-4 overflow-y-auto py-1">
                            <CashSaleInvoice {...({ printData, type, isDuplicate } as InvoiceProps)} />
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default CashSaleInvoiceDialog;