import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, XCircle, Clock } from 'lucide-react';
import SchedulePricingDialog from './schedule-pricing-dialog';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetScheduledPricings,
    ScheduledPricingFilterProps,
    ScheduledPricingDetails,
    useCancelScheduledPricing,
} from '@/api-queries/scheduled-pricing';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/confirm-dialog';
import moment from 'moment';

const SCHEDULE_STATUS_OPTIONS = ['SCHEDULED', 'ACTIVE', 'CANCELLED', 'EXPIRED'];

const ScheduleStatusBadge = ({ status }: { status?: string }) => {
    const variant =
        status === 'SCHEDULED'
            ? 'default'
            : status === 'ACTIVE'
              ? 'default'
              : status === 'CANCELLED'
                ? 'destructive'
                : 'secondary';
    return <Badge variant={variant} className="text-xs">{status || 'N/A'}</Badge>;
};

const ScheduledPricing = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [cancelItem, setCancelItem] = useState<ScheduledPricingDetails | null>(null);
    const [isCancelOpen, setIsCancelOpen] = useState(false);

    const initialFilters: ScheduledPricingFilterProps = {
        search: '',
        scheduleStatus: 'SCHEDULED',
    };

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<ScheduledPricingFilterProps>(initialFilters);

    const query = useGetScheduledPricings({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        scheduleStatus: appliedFilters?.scheduleStatus || 'SCHEDULED',
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });

    const { data, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;
    const scheduledList = data?.data?.rows || [];

    const { mutate: cancelPricing } = useCancelScheduledPricing();

    const columns: ColumnDef<ScheduledPricingDetails>[] = [
        {
            accessorKey: 'stockName',
            header: 'Stock Item',
            cell: ({ row }) => {
                const stock = row.original?.CompanyStockDetail;
                return (
                    <div>
                        <div className="font-medium">{stock?.description || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{stock?.itemCode || ''}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'pricingType',
            header: 'Pricing Type',
            cell: ({ row }) => row.original?.CompanyStockPricing?.CompanyStockPricingType?.name || 'N/A',
        },
        {
            accessorKey: 'priceExclusive',
            header: 'Price (Excl.)',
            cell: ({ row }) => (
                <div className="text-right">{Number(row.original.priceExclusive ?? 0).toFixed(2)}</div>
            ),
        },
        {
            accessorKey: 'priceInclusive',
            header: 'Price (Incl.)',
            cell: ({ row }) => (
                <div className="text-right">{Number(row.original.priceInclusive ?? 0).toFixed(2)}</div>
            ),
        },
        {
            accessorKey: 'effectiveAt',
            header: 'Effective Date',
            cell: ({ row }) =>
                row.original.effectiveAt ? moment(row.original.effectiveAt).format('DD MMM YYYY HH:mm') : 'N/A',
        },
        {
            accessorKey: 'scheduleStatus',
            header: 'Status',
            cell: ({ row }) => <ScheduleStatusBadge status={row.original.scheduleStatus} />,
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const isScheduled = row.original.scheduleStatus === 'SCHEDULED';
                return (
                    <div className="flex items-center justify-center">
                        {isScheduled && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={(e) => {
                                    if (
                                        hasPermission(userGroupPermissions, SYSTEM_MODULES.POINT_OF_SALE.SCHEDULED_PRICING.code, [
                                            SYSTEM_PERMISSIONS.DELETE,
                                        ])
                                    ) {
                                        e.preventDefault();
                                        setCancelItem(row.original);
                                        setIsCancelOpen(true);
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                    }
                                }}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];

    const onClose = () => setOpen(false);

    const handleCancel = () => {
        if (!cancelItem) return;
        cancelPricing(
            { pricingId: cancelItem.pricingId, reason: 'Manual cancellation' },
            {
                onSuccess: (res) => {
                    if (res?.success) {
                        toast.success('Scheduled pricing cancelled');
                        setCancelItem(null);
                        setIsCancelOpen(false);
                    } else {
                        toast.error(res?.message || 'Failed to cancel scheduled pricing');
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Failed to cancel scheduled pricing');
                },
            },
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => clearFilters();
    const handleApplyFilters = () => handleFilters(filters);
    const onClosePermissionDenied = () => setIsPermissionDeniedOpen(false);

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-4">
                <div className="text-lg font-bold">Scheduled Pricing</div>
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Schedule price changes that apply automatically at a future date.
                </div>

                <DataTable
                    query={query}
                    data={scheduledList}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by stock item..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>

                        <Button
                            onClick={() => {
                                if (
                                    hasPermission(userGroupPermissions, SYSTEM_MODULES.POINT_OF_SALE.SCHEDULED_PRICING.code, [
                                        SYSTEM_PERMISSIONS.CREATE,
                                    ])
                                ) {
                                    setOpen(true);
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                }
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Schedule Price
                        </Button>
                    </div>
                </DataTable>

                {open && <SchedulePricingDialog open={open} onClose={onClose} />}

                <ConfirmDialog
                    open={isCancelOpen}
                    setOpen={setIsCancelOpen}
                    title="Cancel scheduled price?"
                    description={`This will cancel the scheduled price change for "${cancelItem?.CompanyStockDetail?.description || 'this stock item'}" effective ${cancelItem?.effectiveAt ? moment(cancelItem.effectiveAt).format('DD MMM YYYY') : ''}.`}
                    confirmBtnTitle="Cancel Price"
                    onConfirm={handleCancel}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to scheduled pricing." }}
            />
        </PageLoader>
    );
};

export default ScheduledPricing;
