import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Edit, Plus, Trash2 } from 'lucide-react';
import {
    DebtorAdjustment,
    DebtorAdjustmentType,
    useGetDebtorAdjustments,
    useDeleteDebtorAdjustment,
} from '@/api-queries/debtor/statements';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import TableDateFilter from '@/components/table/table-date-filter';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import AdjustmentForm from './adjustment-form';
import { AdjustmentTypeBadge, formatDate, formatAmount, StatementFilters, useCurrencySymbol } from './shared';
import { toast } from 'sonner';

interface AdjustmentsTabProps {
    filters: StatementFilters;
    isCompanyDebtorUser: boolean;
    hasCreate: boolean;
    hasUpdate: boolean;
    hasDelete: boolean;
}

type AdjustmentListFilters = {
    adjustmentType: '' | DebtorAdjustmentType;
    fromDate: string;
    toDate: string;
};

const AdjustmentsTab = ({ filters, isCompanyDebtorUser, hasCreate, hasUpdate, hasDelete }: AdjustmentsTabProps) => {
    const currency = useCurrencySymbol();

    const {
        filters: listFilters,
        setFilters: setListFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<AdjustmentListFilters>({ adjustmentType: '', fromDate: '', toDate: '' });

    const companyDebtorId = !isCompanyDebtorUser ? filters.companyDebtorId : '';

    const query = useGetDebtorAdjustments({
        ...(companyDebtorId ? { companyDebtorId } : {}),
        ...(appliedFilters.adjustmentType ? { adjustmentType: appliedFilters.adjustmentType } : {}),
        ...(appliedFilters.fromDate ? { dateFrom: appliedFilters.fromDate } : {}),
        ...(appliedFilters.toDate ? { dateTo: appliedFilters.toDate } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const totalRowCount = query?.data?.data?.count || 0;

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAdjustment, setEditingAdjustment] = useState<DebtorAdjustment | null>(null);
    const [deletingAdjustment, setDeletingAdjustment] = useState<DebtorAdjustment | null>(null);

    const { mutate: deleteAdjustment, isPending: isDeleting } = useDeleteDebtorAdjustment();

    const handleDelete = () => {
        if (!deletingAdjustment?.id) return;
        deleteAdjustment(deletingAdjustment.id, {
            onSuccess: (data) => {
                setDeletingAdjustment(null);
                toast.success(data.success ? 'Adjustment deleted successfully' : data.message || 'Adjustment deletion failed');
            },
            onError: (error) => {
                toast.error('Adjustment deletion failed', {
                    description: error instanceof Error ? error.message : 'Internal Server Error!',
                });
            },
        });
    };

    const handleAdd = () => {
        setEditingAdjustment(null);
        setIsFormOpen(true);
    };

    const columns: ColumnDef<DebtorAdjustment>[] = [
        {
            accessorKey: 'referenceNumber',
            header: 'Reference',
            cell: ({ row }) => <div className="font-semibold">{row.original.referenceNumber || '—'}</div>,
        },
        {
            accessorKey: 'adjustmentDate',
            header: 'Date',
            cell: ({ row }) => formatDate(row.original.adjustmentDate),
        },
        {
            accessorKey: 'adjustmentType',
            header: 'Type',
            cell: ({ row }) => <AdjustmentTypeBadge type={row.original.adjustmentType} />,
        },
        {
            accessorKey: 'amount',
            header: () => <div className="text-right">Amount</div>,
            cell: ({ row }) => {
                const isDebit = row.original.adjustmentType === 'DEBIT';
                return (
                    <div className={`text-right font-semibold tabular-nums ${isDebit ? '' : 'text-emerald-700'}`}>
                        {isDebit ? '+' : '-'} {currency} {formatAmount(row.original.amount)}
                    </div>
                );
            },
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => row.original.description || <span className="text-muted-foreground italic">—</span>,
        },
        ...(hasUpdate || hasDelete
            ? [
                  {
                      id: 'actions',
                      header: () => <div className="text-center">Actions</div>,
                      cell: ({ row }: { row: { original: DebtorAdjustment } }) => (
                          <div className="flex items-center justify-center gap-1">
                              {hasUpdate && (
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingAdjustment(row.original);
                                          setIsFormOpen(true);
                                      }}
                                  >
                                      <Edit className="h-4 w-4" />
                                  </Button>
                              )}
                              {hasDelete && (
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingAdjustment(row.original);
                                      }}
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              )}
                          </div>
                      ),
                  } as ColumnDef<DebtorAdjustment>,
              ]
            : []),
    ];

    return (
        <PageLoader isLoading={query.isLoading || query.isFetching || isDeleting}>
            <div className="space-y-2">
                <DataTable
                    query={query}
                    data={query?.data?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <Select
                                value={listFilters.adjustmentType || ''}
                                onValueChange={(value) =>
                                    setListFilters({
                                        ...listFilters,
                                        adjustmentType: value as AdjustmentListFilters['adjustmentType'],
                                    })
                                }
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Adjustment Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Types</SelectItem>
                                    <SelectItem value="DEBIT">Debit</SelectItem>
                                    <SelectItem value="CREDIT">Credit</SelectItem>
                                </SelectContent>
                            </Select>

                            <TableDateFilter filters={listFilters} setFilters={setListFilters} />

                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(listFilters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>

                        {hasCreate && (
                            <Button onClick={handleAdd} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Adjustment
                            </Button>
                        )}
                    </div>
                </DataTable>
            </div>

            <AdjustmentForm
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                adjustment={editingAdjustment}
                companyDebtorId={companyDebtorId}
                isCompanyDebtorUser={isCompanyDebtorUser}
            />

            <DeleteConfirmation
                open={!!deletingAdjustment}
                onClose={() => setDeletingAdjustment(null)}
                title={`Delete adjustment ${deletingAdjustment?.referenceNumber || ''}?`}
                description="This will remove the manual adjustment from the debtor's account."
                onConfirm={handleDelete}
            />
        </PageLoader>
    );
};

export default AdjustmentsTab;