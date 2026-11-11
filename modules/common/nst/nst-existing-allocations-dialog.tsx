import moment from 'moment';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
    candidateBatchNumber,
    candidateStockDetail,
    nstIsApproved,
    type DispositionCandidate,
    type StockDisposition,
} from '@/api-queries/nst';

interface NSTExistingAllocationsDialogProps {
    open: boolean;
    candidate?: DispositionCandidate | null;
    allocations: StockDisposition[];
    onClose: () => void;
}

// Shown from the recommendations screen when a batch already has an active allocation,
// so the user reviews what is allocated instead of starting a blind allocation.
const NSTExistingAllocationsDialog = ({ open, candidate, allocations, onClose }: NSTExistingAllocationsDialogProps) => {
    const detail = candidateStockDetail(candidate ?? undefined);
    const batch = candidate ? candidateBatchNumber(candidate) : '';

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[620px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Existing NST Allocations</DialogTitle>
                </DialogHeader>

                <div className="text-muted-foreground text-xs">
                    {candidate?.description || detail?.description || 'N/A'}
                    {detail?.itemCode ? ` (${detail.itemCode})` : ''}
                    {batch ? ` · Batch ${batch}` : ''}
                </div>

                {!allocations.length ? (
                    <p className="text-muted-foreground py-4 text-xs">No active allocation on this batch.</p>
                ) : (
                    <div className="max-h-[320px] space-y-2 overflow-auto">
                        {allocations.map((d) => (
                            <div key={d.id} className="rounded-md border border-gray-200 p-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">{d.dispositionNumber || d.id}</span>
                                    <div className="flex items-center gap-1">
                                        <Badge className="bg-blue-100 text-xs text-blue-700">
                                            {d.status || 'ACTIVE'}
                                        </Badge>
                                        <Badge
                                            className={
                                                nstIsApproved(d)
                                                    ? 'bg-green-100 text-xs text-green-700'
                                                    : 'bg-amber-100 text-xs text-amber-700'
                                            }
                                        >
                                            {d.approvalStatus || 'UNKNOWN'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="text-muted-foreground mt-1">
                                    {(d.dispositionType || 'NST').replace(/_/g, ' ')}
                                    {` · Allocated ${d.allocatedQuantity ?? '—'} · Remaining ${d.remainingQuantity ?? '—'}`}
                                </div>
                                {d.expiryDate && (
                                    <div className="text-muted-foreground">
                                        Expiry {moment(d.expiryDate).format('DD MMM, YY')}
                                    </div>
                                )}
                                {d.reason && <div className="mt-1">Reason: {d.reason}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default NSTExistingAllocationsDialog;
