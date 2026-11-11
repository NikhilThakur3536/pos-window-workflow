import { useEffect, useState } from 'react';
import moment from 'moment-timezone';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getStockDispositionLabel, type StockDisposition, type StockDispositionLabel } from '@/api-queries/nst';

interface NSTLabelDialogProps {
    disposition: StockDisposition | null;
    onClose: () => void;
}

// The barcode is rendered as a Code-39 style block from the label's own value; the value
// itself is always printed underneath so it stays scannable if the font is unavailable.
const NSTLabelDialog = ({ disposition, onClose }: NSTLabelDialogProps) => {
    const [label, setLabel] = useState<StockDispositionLabel | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        if (!disposition?.id) {
            setLabel(null);
            return;
        }
        let cancelled = false;
        const run = async () => {
            setIsFetching(true);
            try {
                const res = await getStockDispositionLabel({
                    id: disposition.id,
                    ...(disposition.companyDebtorId ? { companyDebtorId: disposition.companyDebtorId } : {}),
                });
                if (!cancelled) setLabel(res?.data || null);
            } catch (error) {
                if (!cancelled) {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Could not load the NST label');
                }
            } finally {
                if (!cancelled) setIsFetching(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [disposition?.id, disposition?.companyDebtorId]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={!!disposition} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">NST Label</DialogTitle>
                </DialogHeader>

                <div className="rounded-md border-2 border-dashed border-gray-400 p-4 text-center">
                    <p className="text-xs font-semibold uppercase">Near Expiry / Damaged Stock</p>
                    <p className="font-mono text-lg tracking-[0.3em]">{label?.barcodeValue || '—'}</p>
                    <div className="mt-2 space-y-0.5 text-xs">
                        <p>
                            <span className="text-muted-foreground">Batch:</span>{' '}
                            {label?.batchNumber || disposition?.batchNumber || 'N/A'}
                        </p>
                        <p>
                            <span className="text-muted-foreground">Expiry:</span>{' '}
                            {label?.expiryDate
                                ? moment(label.expiryDate).format('DD MMM, YY')
                                : disposition?.expiryDate
                                  ? moment(disposition.expiryDate).format('DD MMM, YY')
                                  : 'N/A'}
                        </p>
                        <p>
                            <span className="text-muted-foreground">Remaining:</span>{' '}
                            {label?.remainingQuantity ?? disposition?.remainingQuantity ?? 'N/A'}
                        </p>
                        <p>
                            <span className="text-muted-foreground">Price:</span>{' '}
                            {label?.originalUnitPrice != null && label?.discountedUnitPrice != null
                                ? `R${label.originalUnitPrice.toFixed(2)} → R${label.discountedUnitPrice.toFixed(2)}`
                                : 'N/A'}
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    <Button type="button" onClick={handlePrint} disabled={isFetching}>
                        <Printer className="h-4 w-4" />
                        Print
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NSTLabelDialog;
