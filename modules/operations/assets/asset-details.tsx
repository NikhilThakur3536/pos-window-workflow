import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGetAssetById } from '@/api-queries/company-asset';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses } from '@/api-queries/warehouse';

interface AssetDetailsProps {
    assetId: string | null;
    onClose: () => void;
}

const fmt = (value: string | number | null | undefined) =>
    value == null || value === '' ? '—' : String(value);

const fmtDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : '—';

const STATUS_COLOR: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-700',
    ASSIGNED: 'bg-blue-100 text-blue-700',
    IN_REPAIR: 'bg-amber-100 text-amber-700',
    RETIRED: 'bg-gray-100 text-gray-600',
    LOST: 'bg-red-100 text-red-700',
    DELETED: 'bg-gray-100 text-gray-400',
};

const AssetDetails = ({ assetId, onClose }: AssetDetailsProps) => {
    const query = useGetAssetById(assetId ? { id: assetId, includeEvents: true } : null);
    const asset = query.data?.data;

    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED', limit: 200 })?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 100 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehousesRes)
        ? (warehousesRes as { id: string; name: string }[])
        : ((warehousesRes as { rows?: { id: string; name: string }[] } | undefined)?.rows || []);

    const debtorName = (id?: string | null) => debtors?.find((d) => d.id === id)?.name || id || '—';
    const warehouseName = (id?: string | null) => warehouses.find((w) => w.id === id)?.name || id || '—';

    const rows: { label: string; value: string }[] = asset
        ? [
              { label: 'Asset Code', value: fmt(asset.assetCode) },
              { label: 'Name', value: fmt(asset.name) },
              { label: 'Category', value: fmt(asset.category) },
              { label: 'Status', value: fmt(asset.status) },
              { label: 'Condition', value: fmt(asset.condition) },
              { label: 'Location', value: asset.companyDebtorId ? debtorName(asset.companyDebtorId) : asset.warehouseId ? warehouseName(asset.warehouseId) : 'Head Office' },
              { label: 'Brand', value: fmt(asset.brand) },
              { label: 'Model', value: fmt(asset.model) },
              { label: 'Serial Number', value: fmt(asset.serialNumber) },
              { label: 'Supplier', value: fmt(asset.supplierName) },
              { label: 'Purchase Date', value: fmt(asset.purchaseDate) },
              { label: 'Purchase Cost', value: asset.purchaseCost != null ? fmt(asset.purchaseCost) : '—' },
              { label: 'Service Interval (days)', value: fmt(asset.serviceIntervalDays) },
              { label: 'Last Service Date', value: fmt(asset.lastServiceDate) },
              { label: 'Warranty Start', value: fmt(asset.warrantyStartDate) },
              { label: 'Warranty Expiry', value: fmt(asset.warrantyExpiryDate) },
              { label: 'Warranty Provider', value: fmt(asset.warrantyProvider) },
          ]
        : [];

    return (
        <Dialog open={!!assetId} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[760px]" onWheel={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="font-semibold">
                        <span className="flex items-center gap-2">
                            {asset ? (
                                <>
                                    [{asset.assetCode || '—'}] {asset.name}
                                    <Badge className={STATUS_COLOR[asset.status] || 'bg-gray-100 text-gray-600'}>
                                        {asset.status}
                                    </Badge>
                                </>
                            ) : (
                                'Asset Details'
                            )}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-4 gap-x-4 gap-y-2 rounded-md border border-gray-200 bg-white p-3 text-xs">
                    {rows.map((row) => (
                        <div key={row.label}>
                            <div className="text-[10px] font-medium text-gray-500">{row.label}</div>
                            <div className="truncate">{row.value}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-2">
                    <div className="mb-1 text-sm font-semibold underline">Event History</div>
                    {asset?.events?.length ? (
                        <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white p-3">
                            <ol className="relative space-y-4 border-l border-gray-300 pl-4">
                                {(asset.events || []).map((event) => (
                                    <li key={event.id} className="relative">
                                        <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full border-2 border-blue-500 bg-white" />
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{event.eventType}</span>
                                            <span className="text-[10px] text-gray-400">{fmtDateTime(event.createdAt)}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-600">
                                            {event.toUserId ? <span>To: {event.toUserId}</span> : null}
                                            {event.toCompanyDebtorId ? <span>Store: {event.toCompanyDebtorId}</span> : null}
                                            {event.toWarehouseId ? <span>Warehouse: {event.toWarehouseId}</span> : null}
                                            {event.toHeadOffice ? <span>Head Office</span> : null}
                                            {event.vendorName ? <span>Vendor: {event.vendorName}</span> : null}
                                            {event.cost != null ? <span>Cost: {event.cost}</span> : null}
                                            {event.scheduledFor ? <span>Scheduled: {fmtDateTime(event.scheduledFor)}</span> : null}
                                            {event.completedAt ? <span>Completed: {fmtDateTime(event.completedAt)}</span> : null}
                                            {event.conditionAfter ? <span>Condition: {event.conditionAfter}</span> : null}
                                            {event.returnStatus ? <span>Return: {event.returnStatus}</span> : null}
                                            {event.externalReference ? <span>Ref: {event.externalReference}</span> : null}
                                        </div>
                                        {event.notes ? <div className="mt-0.5 text-[10px] italic text-gray-500">{event.notes}</div> : null}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ) : (
                        <div className="rounded-md border border-dashed border-gray-300 bg-white p-3 text-center text-xs text-gray-400">
                            No events logged for this asset.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AssetDetails;