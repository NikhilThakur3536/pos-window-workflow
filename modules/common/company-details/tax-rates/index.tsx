import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, Check, X } from 'lucide-react';
import TaxRateForm from './tax-rate-form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetTaxRates,
    FilterProps,
    TaxRateDetails,
    useRemoveTaxRate,
    getTaxRates,
} from '@/api-queries/company-details/tax-rates';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import moment from 'moment';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import ImportModule from '@/components/import-sheets/import-module';
import ExportSheets from '@/components/export-sheets';

const TaxRates = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<TaxRateDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const initialFilters = {
        search: '',
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
    } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetTaxRates({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: taxRates, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<TaxRateDetails>[] = [
        {
            accessorKey: 'taxRateId',
            header: (data) => <TableHeaderToggle {...data}>Tax Rate ID</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('taxRateId')}</div>,
        },
        {
            accessorKey: 'internalTaxId',
            header: (data) => <TableHeaderToggle {...data}>Internal Tax ID</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('internalTaxId')}</div>,
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => {
                const value = row.getValue('description') as string;
                return <div>{value || 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'taxRatePercent',
            header: 'Percent',
            cell: ({ row }) => {
                const taxRatePercent = row.original.taxRatePercent;
                return <div>{taxRatePercent ? taxRatePercent.toFixed(4) : 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'taxOnly',
            header: () => <div className="text-center">Tax Only</div>,
            cell: ({ row }) => {
                const taxOnly = row.original.taxOnly;
                return (
                    <div className="mx-auto w-max text-center">
                        {taxOnly ? (
                            <Check className="h-5 w-5 text-green-700" />
                        ) : (
                            <X className="h-5 w-5 text-red-600" />
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'priorityRate',
            header: () => <div className="text-center">Priority</div>,
            cell: ({ row }) => {
                const priorityRate = row.original.priorityRate;
                return (
                    <div className="mx-auto w-max text-center">
                        {priorityRate ? (
                            <Check className="h-5 w-5 text-green-700" />
                        ) : (
                            <X className="h-5 w-5 text-red-600" />
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'userSelectable',
            header: () => <div className="text-center">Selectable</div>,
            cell: ({ row }) => {
                const userSelectable = row.original.userSelectable;
                return (
                    <div className="mx-auto w-max text-center">
                        {userSelectable ? (
                            <Check className="h-5 w-5 text-green-700" />
                        ) : (
                            <X className="h-5 w-5 text-red-600" />
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'default',
            header: () => <div className="text-center">Default</div>,
            cell: ({ row }) => {
                const isDefault = row.original.default;
                return (
                    <div className="mx-auto w-max text-center">
                        {isDefault ? (
                            <Check className="h-5 w-5 text-green-700" />
                        ) : (
                            <X className="h-5 w-5 text-red-600" />
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'taxAgencyId',
            header: 'Tax Agency',
            cell: ({ row }) => {
                const value = row.original?.taxAgency?.description;
                return <div>{value || 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'startDate',
            header: 'Start Date',
            cell: ({ row }) => {
                const startDate = row.original.startDate;
                return <div>{startDate ? moment(startDate).format('DD MMM, YY') : 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'endDate',
            header: 'End Date',
            cell: ({ row }) => {
                const endDate = row.original.endDate;
                return <div>{endDate ? moment(endDate).format('DD MMM, YY') : 'N/A'}</div>;
            },
        },
        {
            id: 'actions',
            header: ({ column }) => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.TAX_RATES.code,
                                    [SYSTEM_PERMISSIONS.UPDATE],
                                )
                            ) {
                                e.stopPropagation();
                                onEditData(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.TAX_RATES.code,
                                    [SYSTEM_PERMISSIONS.DELETE],
                                )
                            ) {
                                e.preventDefault();
                                setSelectedItem(row.original);
                                setIsDeleteOpen(true);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<TaxRateDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: TaxRateDetails) => {
        setEditData(data);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    const { mutate: removeCompany } = useRemoveTaxRate();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeCompany(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Tax rate deleted successfully');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            });
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    // Export

    async function downloadCSV() {
        getTaxRates({
            isCsv: true,
            csvLabel: 'Tax_Rates',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2">
                <DataTable
                    query={query}
                    data={taxRates?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by tax rate name..."
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

                        <div className="flex items-center gap-2">
                            <ExportSheets downloadCSV={downloadCSV} />

                            <ImportModule
                                module="Tax_Rates"
                                route="companyTaxRate"
                                noLabel
                                hasPermission={hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.TAX_RATES.code,
                                    [SYSTEM_PERMISSIONS.CREATE],
                                )}
                            />
                            <Button
                                onClick={() => {
                                    if (
                                        hasPermission(
                                            userGroupPermissions,
                                            SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.TAX_RATES.code,
                                            [SYSTEM_PERMISSIONS.CREATE],
                                        )
                                    ) {
                                        onAddData();
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                        return;
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Tax Rate
                            </Button>
                        </div>
                    </div>
                </DataTable>

                <TaxRateForm open={open} onClose={onClose} editData={editData} key={editData?.id || null} />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete ${selectedItem?.description}`}
                    onConfirm={handleDelete}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the tax rates." }}
            />
        </PageLoader>
    );
};

export default TaxRates;
