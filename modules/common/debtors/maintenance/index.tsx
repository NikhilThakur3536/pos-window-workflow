import { TableHeaderToggle } from '@/components/table';
import { DataTable } from '@/components/dynamic-table/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CompanyCreditor, CompanyDebtor } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { Edit, Plus, Trash2, Phone, Smartphone, Mail, MapPin, User, Copy } from 'lucide-react';
import { useState } from 'react';
import MaintenanceModal from './maintenance-modal';
import { debtorListFn, FilterProps, useDebtor, useDebtorList, useDeleteDebtorFn } from '@/api-queries/debtor';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { PageLoader } from '@/components/custom-components/PageLoader';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import ImportModule from '@/components/import-sheets/import-module';
import ExportSheets from '@/components/export-sheets';
import { getLabelFromEnumValue } from '@/utils/helpers';

const COMPANY_DEBTOR_TYPE_OPTIONS = [
    { value: 'COMPANY_OWNED', label: 'Company-Owned' },
    { value: 'EXTERNAL', label: 'External' },
] as const;

type CompanyDebtorTypeValue = 'COMPANY_OWNED' | 'EXTERNAL' | '';

const Maintenance = () => {
    const copyToClipboard = (value: string, type: string) => {
        navigator.clipboard.writeText(value);
        toast.success(`${getLabelFromEnumValue(type)} copied to clipboard`);
    };

    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const initialFilters: FilterProps = {
        search: '',
        companyDebtorType: undefined,
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

    const [isModalOpen, setIsModalOpen] = useState(false);

    const query = useDebtorList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.companyDebtorType ? { companyDebtorType: appliedFilters?.companyDebtorType } : {}),
    });
    const data = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const [selectedDebtor, setSelectedDebtor] = useState<string | null>(null);
    const { data: debtor, isLoading } = useDebtor(selectedDebtor || '', !!selectedDebtor && isModalOpen);
    console.log("Detor",debtor)

    const [selectedItem, setSelectedItem] = useState<CompanyDebtor | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const columns: ColumnDef<any>[] = [
        { accessorKey: 'accountNumber', header: (data) => <TableHeaderToggle {...data}>Account</TableHeaderToggle> },
        { accessorKey: 'name', header: (data) => <TableHeaderToggle {...data}>Name</TableHeaderToggle> },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = row.original?.status ?? row.original?.CompanyDebtorSetting?.status;

                if (!status) {
                    return <span className="text-muted-foreground text-xs italic">—</span>;
                }

                const normalized = String(status).toUpperCase();

                return (
                    <Badge
                        variant="outline"
                        className={
                            normalized === 'INACTIVE'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-emerald-100 text-emerald-800'
                        }
                    >
                        {normalized}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'companyDebtorType',// this is the 
            header: () => <div className="text-center">Debtor Type</div>,
            cell: ({ row }) => (
                <div className="text-center">{getLabelFromEnumValue(row.original?.companyDebtorType)}</div>
            ),
        },
        {
        accessorKey: 'terms',
        header: () => <div className="text-center">Terms</div>,
        cell: ({ row }) => {
            const terms = row.original?.terms;

            if (!terms) {
                return <span className="text-muted-foreground text-xs italic">—</span>;
            }

            const getChipStyle = (value: string) => {
                switch (value) {
                    case 'COD':
                        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    case '7 Days':
                        return 'bg-blue-100 text-blue-800 border-blue-200';
                    case '15 Days':
                        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
                    case '30 Days':
                        return 'bg-violet-100 text-violet-800 border-violet-200';
                    case '45 Days':
                        return 'bg-purple-100 text-purple-800 border-purple-200';
                    case '60 Days':
                        return 'bg-amber-100 text-amber-800 border-amber-200';
                    case '90 Days':
                        return 'bg-orange-100 text-orange-800 border-orange-200';
                    default:
                        return 'bg-gray-100 text-gray-800 border-gray-200';
                }
            };

            return (
                <div className="flex justify-center">
                    <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getChipStyle(terms)}`}
                    >
                        {terms}
                    </span>
                </div>
            );
        },
    },

        {
            accessorKey: 'contact',
            header: (data) => <TableHeaderToggle {...data}>Contact & Addresses</TableHeaderToggle>,
            cell: ({ row }) => {
                const { contact, telephoneNumberOne, cellphoneNumber, postalAddress, emailAddress } = row.original;

                const hasAny = contact || telephoneNumberOne || cellphoneNumber || postalAddress || emailAddress;

                if (!hasAny) {
                    return <span className="text-muted-foreground text-xs italic">No contact details available</span>;
                }

                return (
                    <div className="group flex flex-col space-y-1 text-xs">
                        <div className="flex flex-wrap items-center gap-4">
                            {contact && (
                                <div className="flex items-center gap-1 font-medium">
                                    <User className="text-muted-foreground h-4 w-4" />
                                    {contact}
                                </div>
                            )}

                            {telephoneNumberOne && (
                                <div className="flex items-center gap-1">
                                    <Phone className="text-muted-foreground h-4 w-4" />
                                    <span>{telephoneNumberOne}</span>
                                    <Copy
                                        className="h-3 w-3 cursor-pointer opacity-0 group-hover:opacity-100"
                                        onClick={() => copyToClipboard(telephoneNumberOne, 'telephone')}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="text-muted-foreground flex flex-wrap items-center gap-4">
                            {cellphoneNumber && (
                                <div className="flex items-center gap-1">
                                    <Smartphone className="h-4 w-4" />
                                    <span>{cellphoneNumber}</span>
                                    <Copy
                                        className="h-3 w-3 cursor-pointer opacity-0 group-hover:opacity-100"
                                        onClick={() => copyToClipboard(cellphoneNumber, 'mobile')}
                                    />
                                </div>
                            )}

                            {emailAddress && (
                                <div className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    <span>{emailAddress}</span>
                                    <Copy
                                        className="h-3 w-3 cursor-pointer opacity-0 group-hover:opacity-100"
                                        onClick={() => copyToClipboard(emailAddress, 'email')}
                                    />
                                </div>
                            )}
                        </div>

                        {postalAddress && (
                            <div className="text-muted-foreground flex items-center gap-1 pt-1 text-xs">
                                <MapPin className="h-3 w-3" />
                                {postalAddress}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "BillingCompany.companyName",
            header: (data) => (
                <TableHeaderToggle {...data}>
                    Billing Company
                </TableHeaderToggle>
            ),
            cell: ({ row }) => {
                const billing = row.original.BillingCompany || row.original.billingCompany;

                if (!billing) {
                    return (
                        <span className="text-xs italic text-orange-600">
                            External
                        </span>
                    );
                }

                return (
                    <div className="space-y-1 text-xs">
                        <div className="font-semibold text-foreground">
                            {billing.companyName}
                        </div>

                        {billing.emailAddress && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                {billing.emailAddress}
                            </div>
                        )}

                        {billing.taxNumber && (
                            <div className="text-muted-foreground">
                                <span className="font-medium">Tax:</span>{" "}
                                {billing.taxNumber}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.MAINTENANCE.code, [
                                    SYSTEM_PERMISSIONS.UPDATE,
                                ])
                            ) {
                                e.stopPropagation();
                                handleRowClick(row);
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
                                hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.MAINTENANCE.code, [
                                    SYSTEM_PERMISSIONS.DELETE,
                                ])
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    const handleDebtorTypeChange = (value: string) => {
        const nextValue = value === 'ALL' ? undefined : (value as "EXTERNAL" | "COMPANY_OWNED");
        const nextFilters: FilterProps = { 
            ...filters, 
            companyDebtorType: nextValue 
        };
        setFilters(nextFilters);
        handleFilters(nextFilters);
    };

    const handleRowClick = (row: any) => {
        if (row.original?.id) {
            setSelectedDebtor(row.original.id);
            setIsModalOpen(true);
        }
    };

    const handleAdd = () => {
        setSelectedDebtor(null);
        setIsModalOpen(true);
    };

    const { mutate: removeDebtor } = useDeleteDebtorFn();

    const handleDelete = () => {
        if (selectedItem?.id) {
            removeDebtor(
                { debtorId: selectedItem?.id },
                {
                    onSuccess: () => {
                        setSelectedItem(null);
                        toast.success('Debtor deleted successfully');
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response.data.message || 'Internal Server Error!');
                    },
                },
            );
        }
    };

    // Export

    async function downloadCSV() {
        debtorListFn({
            isCsv: true,
            csvLabel: 'Debtors',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
            ...(appliedFilters?.companyDebtorType ? { companyDebtorType: appliedFilters?.companyDebtorType } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 bg-white px-2 pt-4">
                <DataTable
                    query={query}
                    data={data || []}
                    columns={columns}
                    totalRowCount={totalRowCount}
                    pagination={pagination}
                    setPagination={setPagination}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by account, name, cellphone or telephone"
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />

                            <Select
                                value={filters.companyDebtorType || 'ALL'}
                                onValueChange={handleDebtorTypeChange}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Debtor Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Debtor Types</SelectItem>
                                    {COMPANY_DEBTOR_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <ExportSheets downloadCSV={downloadCSV} />

                            <ImportModule
                                module="Debtors"
                                route="companyDebtor"
                                noLabel
                                hasPermission={hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.DEBTORS.MAINTENANCE.code,
                                    [SYSTEM_PERMISSIONS.CREATE],
                                )}
                            />

                            <Button
                                onClick={() => {
                                    if (
                                        hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.MAINTENANCE.code, [
                                            SYSTEM_PERMISSIONS.CREATE,
                                        ])
                                    ) {
                                        handleAdd();
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Debtor
                            </Button>
                        </div>
                    </div>
                </DataTable>

                <MaintenanceModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    debtor={isModalOpen && debtor ? debtor?.data : null}
                    isLoading={isLoading}
                />

                <ViewAccessDeniedDialog
                    open={isPermissionDeniedOpen}
                    onClose={() => setIsPermissionDeniedOpen(false)}
                    options={{ description: "You don't have access to add/update debtors." }}
                />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete ${selectedItem?.name}`}
                    onConfirm={handleDelete}
                />
            </div>
        </PageLoader>
    );
};

export default Maintenance;