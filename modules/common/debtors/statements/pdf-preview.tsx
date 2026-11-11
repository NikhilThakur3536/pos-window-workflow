import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface PdfPreviewOverlayProps {
    open: boolean;
    onClose: () => void;
    pdfUrl: string;
}

export function PdfPreviewOverlay({ open, onClose, pdfUrl }: PdfPreviewOverlayProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative h-[90vh] w-[90vw] overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b p-4">
                    <h2 className="text-lg font-semibold">Statement PDF Preview</h2>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                const iframe = document.getElementById('statement-pdf-iframe') as HTMLIFrameElement | null;
                                iframe?.contentWindow?.print();
                            }}
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                        <Button variant="destructive" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
                <iframe
                    id="statement-pdf-iframe"
                    src={pdfUrl}
                    title="Statement PDF Preview"
                    className="h-[calc(90vh-64px)] w-full"
                />
            </div>
        </div>
    );
}