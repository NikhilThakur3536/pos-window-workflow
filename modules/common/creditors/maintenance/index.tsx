import { TableHeaderToggle } from '@/components/table';
import { DataTable } from '@/components/dynamic-table/data-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    creditorListFn,
    CreditorListPayload,
    useCreditor,
    useCreditorList,
    useDeleteCreditorFn,
} from '@/api-queries/creditor';
import { Button } from '@/components/ui/button';
import { CompanyCreditor } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { Edit, Plus, Trash2, Phone, Smartphone, Mail, MapPin, User, Copy } from 'lucide-react';
import { useState } from 'react';
import MaintenanceModal from './maintenance-modal';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import ImportModule from '@/components/import-sheets/import-module';
import ExportSheets from '@/components/export-sheets';
import { getLabelFromEnumValue } from '@/utils/helpers';

const Maintenance = () => {
    const copyToClipboard = (value: string, type: string) => {
        navigator.clipboard.writeText(value);
        toast.success(`${getLabelFromEnumValue(type)} copied to clipboard`);
    };

    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

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
    } = useTableFilters<CreditorListPayload>(initialFilters);

    const [isModalOpen, setIsModalOpen] = useState(false);

    const query = useCreditorList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const data = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const [selectedCreditor, setSelectedCreditor] = useState<string | null>(null);
    const { data: creditor, isLoading } = useCreditor(selectedCreditor || '', !!selectedCreditor && isModalOpen);

    const [selectedItem, setSelectedItem] = useState<CompanyCreditor | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const columns: ColumnDef<CompanyCreditor>[] = [
        // {
        //     id: 'select',
        //     header: ({ table }) => (
        //         <Checkbox
        //             checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        //             onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        //             aria-label="Select all"
        //         />
        //     ),
        //     cell: ({ row }) => (
        //         <Checkbox
        //             checked={row.getIsSelected()}
        //             onCheckedChange={(value) => row.toggleSelected(!!value)}
        //             aria-label="Select row"
        //             onClick={(e) => e.stopPropagation()}
        //         />
        //     ),
        //     enableSorting: false,
        //     enableHiding: false,
        // },
        { accessorKey: 'accountNumber', header: (data) => <TableHeaderToggle {...data}>Account</TableHeaderToggle> },
        { accessorKey: 'name', header: (data) => <TableHeaderToggle {...data}>Name</TableHeaderToggle> },
        {
            accessorKey: 'contact',
            header: (data) => <TableHeaderToggle {...data}>Contact & Addresses</TableHeaderToggle>,
            cell: ({ row }) => {
                const { contact, telephoneNumberOne, cellphoneNumber, postalAddress, emailAddress, deliveryAddress } =
                    row.original;

                const hasAny =
                    contact ||
                    telephoneNumberOne ||
                    cellphoneNumber ||
                    postalAddress ||
                    deliveryAddress ||
                    emailAddress;

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
        // {
        //     accessorKey: 'sellprice_no',
        //     header: (data) => (
        //         <TableHeaderToggle {...data} className="text-center">
        //             Sellprice_No
        //         </TableHeaderToggle>
        //     ),
        //     cell: ({ row }) => <div className="text-center">{row.original?.taxNumber}</div>, //selleprice number aayaga yaha
        // },
        // {
        //     accessorKey: 'normalrep',
        //     header: (data) => (
        //         <TableHeaderToggle {...data} className="text-center">
        //             Normal Rep
        //         </TableHeaderToggle>
        //     ),
        //     cell: ({ row }) => <div className="text-center">__</div>,
        // },
        // {
        //     accessorKey: 'terms',
        //     header: (data) => (
        //         <TableHeaderToggle {...data} className="text-center">
        //             Terms
        //         </TableHeaderToggle>
        //     ),
        //     cell: ({ row }) => <div className="text-center">{row.original?.CompanyCreditorBankingInfo?.terms}</div>,
        // },
        // {
        //     accessorKey: 'crlimit',
        //     header: (data) => (
        //         <TableHeaderToggle {...data} className="text-center">
        //             CRLIMIT
        //         </TableHeaderToggle>
        //     ),
        //     cell: ({ row }) => (
        //         <div className="text-right">{row.original?.CompanyCreditorBankingInfo?.creditLimit}</div>
        //     ),
        // },
        // {
        //     accessorKey: 'balance',
        //     header: (data) => (
        //         <TableHeaderToggle {...data} className="text-right">
        //             Balance
        //         </TableHeaderToggle>
        //     ),
        //     cell: ({ row }) => <div className="text-right">__</div>,
        // },
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
                                hasPermission(userGroupPermissions, SYSTEM_MODULES.CREDITORS.MAINTENANCE.code, [
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
                                hasPermission(userGroupPermissions, SYSTEM_MODULES.CREDITORS.MAINTENANCE.code, [
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

    const handleRowClick = (row: any) => {
        if (row.original?.id) {
            setSelectedCreditor(row.original.id);
            setIsModalOpen(true);
        }
    };

    const handleAdd = () => {
        setSelectedCreditor(null);
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    const { mutate: removeCreditor } = useDeleteCreditorFn();

    const handleDelete = () => {
        if (selectedItem?.id) {
            removeCreditor(
                { creditorId: selectedItem?.id },
                {
                    onSuccess: () => {
                        setSelectedItem(null);
                        toast.success('Creditor deleted successfully');
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response.data.message || 'Internal Server Error!');
                    },
                },
            );
        }
    };

    async function downloadCSV() {
        creditorListFn({
            isCsv: true,
            csvLabel: 'Creditors',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 bg-white px-2">
                <DataTable
                    query={query}
                    data={data || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between pt-3">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by account, name, cellphone or telephone"
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
                                module="Creditors"
                                route="companyCreditor"
                                noLabel
                                hasPermission={hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.CREDITORS.MAINTENANCE.code,
                                    [SYSTEM_PERMISSIONS.CREATE],
                                )}
                            />

                            <Button
                                onClick={() => {
                                    if (
                                        hasPermission(userGroupPermissions, SYSTEM_MODULES.CREDITORS.MAINTENANCE.code, [
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
                                Add Creditor
                            </Button>
                        </div>
                    </div>
                </DataTable>

                <MaintenanceModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    creditor={isModalOpen && creditor ? creditor?.data : null}
                    isLoading={isLoading}
                    key={creditor?.id || null}
                />

                <ViewAccessDeniedDialog
                    open={isPermissionDeniedOpen}
                    onClose={onClosePermissionDenied}
                    options={{ description: "You don't have access to add/update the creditors." }}
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
