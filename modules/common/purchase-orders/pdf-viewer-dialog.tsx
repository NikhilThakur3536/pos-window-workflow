'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, X } from 'lucide-react';
import { toast } from 'sonner';
import { blobToBase64, DocumentType, useDocumentPrint } from '@/api-queries/print';

interface PdfViewerDialogProps {
    open: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    base64?: string | null;
    fileName?: string;
    title?: string;
}

export function PdfViewerDialog({
    open,
    onClose,
    pdfUrl,
    base64 = null,
    fileName = 'document.pdf',
    title = 'PDF Preview',
}: PdfViewerDialogProps) {
    useEffect(() => {
        if (open && pdfUrl) {
            const url = pdfUrl;
            return () => URL.revokeObjectURL(url);
        }
    }, [open, pdfUrl]);

    if (!open || !pdfUrl) return null;

    const handlePrint = () => {
        const iframe = document.getElementById('document-pdf-iframe') as HTMLIFrameElement | null;
        iframe?.contentWindow?.print();
    };

    const handleDownload = async () => {
        const electron =
            typeof window !== 'undefined'
                ? (window as unknown as {
                      electronAPI?: {
                          downloadPdf?: (payload: { fileName: string; base64: string }) => Promise<{ success: boolean; cancelled?: boolean; filePath?: string; message?: string }>;
                      };
                  }).electronAPI
                : undefined;
        if (electron?.downloadPdf && base64) {
            try {
                const result = await electron.downloadPdf({ fileName, base64 });
                if (result?.success) {
                    toast.success(`PDF saved to ${result.filePath}`);
                } else if (!result?.cancelled) {
                    toast.error(result?.message || 'Failed to save PDF');
                }
            } catch (error) {
                console.error('Electron PDF download error:', error);
                toast.error('Failed to save PDF');
            }
            return;
        }

        const anchor = document.createElement('a');
        anchor.href = pdfUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative h-[90vh] w-[90vw] overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b p-4">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePrint} type="button">
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                        <Button variant="outline" onClick={handleDownload} type="button">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </Button>
                        <Button variant="destructive" onClick={onClose} type="button">
                            <X className="mr-2 h-4 w-4" />
                            Close
                        </Button>
                    </div>
                </div>
                <iframe
                    id="document-pdf-iframe"
                    src={pdfUrl}
                    title={title}
                    className="h-[calc(90vh-64px)] w-full"
                />
            </div>
        </div>
    );
}

interface PdfDocumentState {
    pdfUrl: string;
    base64?: string | null;
    fileName: string;
    title: string;
}

export function useDocumentPdf() {
    const printMut = useDocumentPrint();
    const [pdfState, setPdfState] = useState<PdfDocumentState | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const generate = async (
        documentType: DocumentType,
        documentId: string,
        printType: 'ORIGINAL' | 'DUPLICATE',
        fileName: string,
        title: string,
    ) => {
        setIsLoading(true);
        try {
            const blob = await printMut.mutateAsync({ documentType, documentId, printType });
            const pdfUrl = URL.createObjectURL(blob);
            const base64 = await blobToBase64(blob);
            setPdfState({ pdfUrl, base64, fileName, title: `${title} (${printType})` });
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            // @ts-ignore
            toast.error(error?.response?.data?.message || 'Failed to generate document PDF');
        } finally {
            setIsLoading(false);
        }
    };

    const close = () => setPdfState(null);

    return { generate, pdfState, isLoading, close, open: !!pdfState };
}