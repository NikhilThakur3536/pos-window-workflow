import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, Mail, Phone, MapPin, Building2, Link as LinkIcon, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CompanyDetailForm from './company-detail-form';
import InterCompanyMappingForm from './inter-comany-mapping-form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetCompanies,
    useRemoveCompany,
    useCreateCompany,
    useUpdateCompany,
    useGetCompanyById,
    FilterProps,
    CompanyCreateSchema,
    CompanyUpdateSchema,
} from '@/api-queries/company-details';
import {
    // Mapping APIs
    useListInterCompanyMappings,
    useCreateInterCompanyMapping,
    useUpdateInterCompanyMapping,
    useDeleteInterCompanyMapping,
    useInventorySummaryReport,
} from '@/api-queries/company-details/multi-company';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { Badge } from '@/components/ui/badge';

const CompaniesList = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // Inter-Company Mapping Modal State (the child form now owns its own list/add/edit view state)
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

    // Inventory Summary Report modal state
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);

    const initialFilters = { search: '' };

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<FilterProps>(initialFilters, 5);

    const query = useGetCompanies({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });

    const { data: companiesData, isLoading } = query;
    const totalRowCount = query?.data?.count || 0;

    // ==================== MAPPINGS ====================
    const { data: mappingsData, isLoading: isMappingsLoading } = useListInterCompanyMappings(selectedItem?.id);
    const { mutate: createMapping, isPending: isCreatingMapping } = useCreateInterCompanyMapping();
    const { mutate: updateMapping, isPending: isUpdatingMapping } = useUpdateInterCompanyMapping();
    const { mutate: deleteMapping, isPending: isDeletingMapping } = useDeleteInterCompanyMapping();
    // ===================================================

    // Note: per the API impact doc, the logged-in company is always resolved from auth and clients
    // cannot override visible company scope — this report reflects the current session's company
    // (plus any active mapped destinations), not necessarily the row that was clicked.
    const { data: inventoryReport, refetch: refetchInventoryReport, isFetching: isReportLoading } =
        useInventorySummaryReport({
            reportType: "STORES",
            includeCompanyOwnedStores: true,
            limit: 100,
            offset: 0,
        }, false);
    const [editData, setEditData] = useState<any | null>(null);

    const { mutate: createCompany, isPending: isCreating } = useCreateCompany();
    const { mutate: updateCompany, isPending: isUpdating } = useUpdateCompany();
    const { data: singleCompanyData, refetch: refetchSingleCompany } = useGetCompanyById(
        editData?.id || ''
    );

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'companyIdentificationNumber',
            header: (data) => <TableHeaderToggle {...data}>UID</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium">{row.original.companyIdentificationNumber}</div>,
        },
        {
            accessorKey: 'companyName',
            header: (data) => <TableHeaderToggle {...data}>Company Name</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium">{row.original.companyName}</div>,
        },
        {
            accessorKey: 'companyRegistrationNumber',
            header: (data) => <TableHeaderToggle {...data}>Reg. No.</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.companyRegistrationNumber || 'N/A'}</div>,
        },
        {
            accessorKey: 'contact',
            header: (data) => <TableHeaderToggle {...data}>Contact Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const contact = row.original;
                return (
                    <div className="max-w-[300px] space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                            <MapPin className="!h-4 !w-4 shrink-0" />
                            <span className="text-wrap">
                                {contact.addressLineOne || ''} 
                                {contact.addressLineTwo ? `, ${contact.addressLineTwo}` : ''}
                                {contact.addressLineThree ? `, ${contact.addressLineThree}` : ''}
                                {contact.addressLineFour ? `, ${contact.addressLineFour}` : ''}
                                {contact.postalCode ? `, ${contact.postalCode}` : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="!h-4 !w-4 shrink-0" /> 
                            {contact.emailAddress || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="!h-4 !w-4 shrink-0" /> 
                            {contact.telephone || 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'interCompanyTransferDestinationCompanyIds',
            header: (data) => <TableHeaderToggle {...data}>Inter-Company Destinations</TableHeaderToggle>,
            cell: ({ row }) => {
                const company = row.original;
                const count = company.interCompanyTransferDestinationCompanyIds?.length || 0;
                const destinationNames = company.interCompanyTransferDestinationCompanies?.map((c: any) => c.companyName).join(', ') || '';

                return count > 0 ? (
                    <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {count} Companies
                        </Badge>
                        {destinationNames && (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                                {destinationNames}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">No mappings</span>
                );
            },
        },
        {
            accessorKey: 'bankAccountNumber',
            header: (data) => <TableHeaderToggle {...data}>Bank Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const bank = row.original;
                return (
                    <div className="space-y-1 text-sm">
                        <div><strong>Acc No:</strong> {bank.bankAccountNumber || 'N/A'}</div>
                        <div className="text-muted-foreground">{bank.bankName || 'N/A'}</div>
                        <div className="text-muted-foreground">{bank.bankBranchCode || 'N/A'}</div>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: ({ column }) => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    {/* Edit */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (hasPermission(userGroupPermissions, SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.COMPANY_DETAILS.code, [SYSTEM_PERMISSIONS.UPDATE])) {
                                onEditData(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
                            }
                        }}
                        className="h-8 w-8 p-0"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>

                    {/* Manage Mappings */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(row.original);
                            setIsMappingModalOpen(true);
                        }}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        title="Manage Inter-Company Mappings"
                    >
                        <LinkIcon className="h-4 w-4" />
                    </Button>

                    {/* Inventory Report */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(row.original);
                            setIsInventoryOpen(true);
                            refetchInventoryReport();
                        }}
                        className="h-8 w-8 p-0"
                        title="View Mapped Stores Inventory"
                        disabled={isReportLoading}
                    >
                        <FileText className="h-4 w-4" />
                    </Button>

                    {/* Delete */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (hasPermission(userGroupPermissions, SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.COMPANY_DETAILS.code, [SYSTEM_PERMISSIONS.DELETE])) {
                                setSelectedItem(row.original);
                                setIsDeleteOpen(true);
                            } else {
                                setIsPermissionDeniedOpen(true);
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

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: any) => {
        setEditData(data);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    const { mutate: removeCompanyDetails } = useRemoveCompany();

    // ==================== COMPANY HANDLERS ====================
    const handleCreateCompany = (data: CompanyCreateSchema) => {
        createCompany(data, {
            onSuccess: () => {
                toast.success('Company created successfully');
                onClose();
                query.refetch();
            },
            onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to create company'),
        });
    };

    const handleUpdateCompany = (data: CompanyUpdateSchema) => {
        updateCompany(data, {
            onSuccess: () => {
                toast.success('Company updated successfully');
                onClose();
                query.refetch();
            },
            onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update company'),
        });
    };
    // =========================================================

    // ==================== MAPPING HANDLERS ====================
    const handleCreateMapping = (data: any) => {
        createMapping(data, {
            onSuccess: () => {
                toast.success('Inter-company mapping created successfully');
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Failed to create mapping');
            },
        });
    };

    const handleUpdateMapping = (data: any) => {
        updateMapping(data, {
            onSuccess: () => {
                toast.success('Inter-company mapping updated successfully');
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Failed to update mapping');
            },
        });
    };

    const handleDeleteMapping = (id: string) => {
        deleteMapping(id, {
            onSuccess: () => {
                toast.success('Inter-company mapping removed');
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Failed to remove mapping');
            },
        });
    };
    // =========================================================

    const handleDelete = () => {
        if (selectedItem?.id) {
            removeCompanyDetails(selectedItem.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    setIsDeleteOpen(false);
                    toast.success('Company deleted successfully');
                    query.refetch();
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Failed to delete company');
                },
            });
        }
    };

    const onClosePermissionDenied = () => setIsPermissionDeniedOpen(false);

    const closeInventoryModal = () => {
        setIsInventoryOpen(false);
        setSelectedItem(null);
    };

    const inventoryRows: any[] = inventoryReport?.data || [];

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4">
                <DataTable
                    query={query}
                    data={companiesData?.data || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 w-full max-w-md">
                            <Input
                                placeholder="Search by company name or UID..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilters(filters)}
                            />
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>

                        <Button
                            onClick={() => {
                                if (hasPermission(userGroupPermissions, SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.COMPANY_DETAILS.code, [SYSTEM_PERMISSIONS.CREATE])) {
                                    onAddData();
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                }
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Company
                        </Button>
                    </div>
                </DataTable>

                {/* Company Form */}
                <CompanyDetailForm
                    open={open}
                    onClose={onClose}
                    editData={editData}
                    key={editData?.id || 'new'}
                    onCreate={handleCreateCompany}
                    onUpdate={handleUpdateCompany}
                    isCreating={isCreating}
                    isUpdating={isUpdating}
                />

                {/* Inter-Company Mapping Form */}
                <InterCompanyMappingForm
                    open={isMappingModalOpen}
                    onClose={() => {
                        setIsMappingModalOpen(false);
                        setSelectedItem(null);
                    }}
                    sourceCompanyId={selectedItem?.id || ''}
                    sourceCompanyName={selectedItem?.companyName}
                    mappings={mappingsData?.data?.rows || []}
                    isMappingsLoading={isMappingsLoading}
                    onCreate={handleCreateMapping}
                    onUpdate={handleUpdateMapping}
                    onDelete={handleDeleteMapping}
                    isCreating={isCreatingMapping}
                    isUpdating={isUpdatingMapping}
                    isDeleting={isDeletingMapping}
                />

                {/* Inventory Summary Report */}
                <Dialog open={isInventoryOpen} onOpenChange={(o) => !o && closeInventoryModal()}>
                    <DialogContent className="sm:max-w-[720px]">
                        <DialogHeader>
                            <DialogTitle>Inventory Summary — {selectedItem?.companyName}</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-auto text-sm">
                            {isReportLoading ? (
                                <p className="text-muted-foreground">Loading inventory summary...</p>
                            ) : inventoryRows.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b">
                                            {Object.keys(inventoryRows[0]).map((key) => (
                                                <th key={key} className="p-2 font-medium capitalize">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryRows.map((row, idx) => (
                                            <tr key={idx} className="border-b">
                                                {Object.keys(inventoryRows[0]).map((key) => (
                                                    <td key={key} className="p-2">
                                                        {String(row[key])}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-muted-foreground">
                                    No inventory data returned. This report reflects the company you're currently
                                    logged into plus any active mapped destinations — company scope can't be
                                    overridden from the client, so it isn't necessarily scoped to the row clicked.
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button variant="outline" onClick={closeInventoryModal}>
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation */}
                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Delete ${selectedItem?.companyName}?`}
                    description="This action cannot be undone. All related data may be affected."
                    onConfirm={handleDelete}
                />

                <ViewAccessDeniedDialog
                    open={isPermissionDeniedOpen}
                    onClose={onClosePermissionDenied}
                    options={{ description: "You don't have permission to perform this action on companies." }}
                />
            </div>
        </PageLoader>
    );
};

export default CompaniesList;