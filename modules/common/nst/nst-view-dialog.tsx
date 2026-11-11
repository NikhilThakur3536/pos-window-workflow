import moment from 'moment';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { StockDisposition, useGetStockDispositionById } from '@/api-queries/nst';

interface NSTViewDialogProps {
    open: boolean;
    id: string | null;
    // The saved record's own scope. Omitted for company/DC allocations so the backend
    // resolves the location itself; a store allocation carries its companyDebtorId.
    companyDebtorId?: string;
    onClose: () => void;
}

const toNum = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between gap-3 py-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-right font-medium">{value ?? '—'}</span>
    </div>
);

// Read-only snapshot of one allocation, fetched fresh via /stockDisposition/get using the
// row's saved scope so a company/DC allocation is never re-scoped to the current filter.
const NSTViewDialog = ({ open, id, companyDebtorId, onClose }: NSTViewDialogProps) => {
    const query = useGetStockDispositionById(
        id ? { id, ...(companyDebtorId ? { companyDebtorId } : {}) } : null,
    );
    const disposition: StockDisposition | undefined = query?.data?.data;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[620px]" onWheel={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="font-semibold">Discounted Stock Details</DialogTitle>
                </DialogHeader>

                <PageLoader isLoading={query.isLoading}>
                    {!disposition ? (
                        <p className="text-muted-foreground py-4 text-xs">No details available.</p>
                    ) : (
                        <div className="space-y-3 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                    {disposition.stockDetail?.description || disposition.CompanyStockDetail?.description || 'N/A'}
                                </span>
                                <span className="text-muted-foreground">
                                    {disposition.stockDetail?.itemCode || disposition.CompanyStockDetail?.itemCode || ''}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2">
                                <Row label="NST Number" value={disposition.dispositionNumber || disposition.id} />
                                <Row
                                    label="Stock Location"
                                    value={disposition.CompanyDebtor?.name || (disposition.companyDebtorId ? '—' : 'Company / DC')}
                                />
                                <Row label="Warehouse" value={disposition.warehouseId || '—'} />
                                <Row label="Batch" value={disposition.batchNumber || '—'} />
                                <Row
                                    label="Expiry"
                                    value={disposition.expiryDate ? moment(disposition.expiryDate).format('DD MMM, YY') : '—'}
                                />
                                <Row
                                    label="Type"
                                    value={(disposition.dispositionType || '').replace(/_/g, ' ') || '—'}
                                />
                                <Row label="Source" value={(disposition.sourceType || '').replace(/_/g, ' ') || '—'} />
                                <Row label="Allocated Quantity" value={toNum(disposition.allocatedQuantity)} />
                                <Row label="Remaining Quantity" value={toNum(disposition.remainingQuantity)} />
                                <Row label="Sold Quantity" value={toNum(disposition.soldQuantity)} />
                                <Row label="Original Price" value={`R ${fmt(toNum(disposition.originalUnitPrice))}`} />
                                <Row label="NST Price" value={`R ${fmt(toNum(disposition.discountedUnitPrice))}`} />
                                <Row
                                    label="Rule"
                                    value={disposition.rule?.name || disposition.stockDispositionRuleName || '—'}
                                />
                                <Row label="Reason" value={disposition.reason || '—'} />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <span className="text-muted-foreground">Approval</span>
                                <Badge className="bg-gray-100 text-xs">{disposition.approvalStatus || '—'}</Badge>
                                <span className="text-muted-foreground ml-2">Status</span>
                                <Badge className="bg-gray-100 text-xs">
                                    {(disposition.status || '').replace(/_/g, ' ') || '—'}
                                </Badge>
                            </div>

                            {disposition.photoUrls?.length ? (
                                <div className="flex flex-wrap gap-2">
                                    {disposition.photoUrls.map((url, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            className="h-12 w-12 overflow-hidden rounded-md border"
                                            onClick={() => window.open(url, '_blank')}
                                        >
                                            <img src={url} alt="NST" className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    )}
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
};

export default NSTViewDialog;
