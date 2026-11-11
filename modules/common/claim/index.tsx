'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Plus, Printer } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { useAuthUser } from '@/stores/auth-user.store';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import moment from 'moment';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { documentPrintPayload, useDocumentPrint, DocumentType } from '@/api-queries/print';
import ConfirmDialog from '@/components/confirm-dialog';

import {
    GoodsReceivingClaimFilterProps,
    useGetGoodsReceivingClaims,
    GoodsReceivingClaimDetails,
} from '@/api-queries/claims';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ClaimForm from './form';           
import ClaimDetailDialog from './dialog';

const GoodsReceivingClaims = () => {
    const userGroupPermissions = useUsersPermissions();
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState<GoodsReceivingClaimDetails | null>(null);
    const [openForm, setOpenForm] = useState(false);
        const systemMode = localStorage.getItem("systemMode");
           const invoicePrint= useDocumentPrint()

               const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedPrintPayload, setSelectedPrintPayload] = useState<documentPrintPayload | null>(null);


    const initialFilters = {
        search: '',
    };

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<GoodsReceivingClaimFilterProps>(initialFilters);

    const query = useGetGoodsReceivingClaims({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        // ...(appliedFilters?.search ? { search: appliedFilters.search } : {}), // Uncomment if backend supports search
    });

    const { data: claimsResponse, isLoading } = query;
    const totalRowCount = claimsResponse?.data?.count || 0;

    const columns: ColumnDef<GoodsReceivingClaimDetails>[] = [
        {
            accessorKey: 'supplierInvoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>Invoice Details</TableHeaderToggle>,
            cell: ({ row }) => (
                <>
                    <div>{row.original.supplierInvoiceNumber || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">
                        {row.original.claimDate 
                            ? moment(row.original.claimDate).format('Do MMM, YY') 
                            : 'N/A'}
                    </div>
                </>
            ),
        },
        {
            accessorKey: 'claimReason',
            header: (data) => <TableHeaderToggle {...data}>Claim Reason</TableHeaderToggle>,
            cell: ({ row }) => <div className="capitalize">{row.original.claimReason}</div>,
        },
        {
            accessorKey: 'companyCreditorId',
            header: (data) => <TableHeaderToggle {...data}>Creditor</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.CompanyCreditor?.name}</div>,
        },
        {
            accessorKey: 'itemsCount',
            header: 'Items',
            cell: ({ row }) => <div>{row.original.items?.length || 0}</div>,
        },
        {
    accessorKey: 'claimAmount',
    header: 'Claim Amount',
    cell: ({ row }) => {
        const exclusive = row.original.totalClaimExclusive || 0;
        const inclusive = row.original.totalClaimInclusive || 0;

        return (
            <div className="flex flex-col">
                <span className="font-medium">
                    {currencySymbol} {inclusive.toFixed(2)} <span className="text-xs text-muted-foreground">(incl.)</span>
                </span>
                <span className="text-xs text-muted-foreground">
                    {currencySymbol} {exclusive.toFixed(2)} (excl.)
                </span>
            </div>
        );
    },
},
        {
    id: 'view',
    header: () => <div className="text-center">View</div>,
    cell: ({ row }) => (
        <div className="flex items-center justify-center">
            {/* <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    if (systemMode === 'offline') {
                        
                        setSelectedClaim(row.original);
                    } else if (row.original.pdfUrl) {
                        console.log(row.original)
                        window.open(row.original.pdfUrl, '_blank', 'noopener,noreferrer');
                    }
                }}
                className="h-8 w-8 p-0"
                title="View Invoice"
                disabled={systemMode !== 'offline' && !row.original.pdfUrl}
            >
                <Eye className="h-4 w-4" />
            </Button> */}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                title="Print"
                            >
                                <Printer className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {(['ORIGINAL', 'DUPLICATE'] as const).map((item) => (
                                <DropdownMenuItem
                                    key={item}
                                    onClick={async() => {

                                            setSelectedPrintPayload({
                                            documentType: DocumentType.GOODS_RECEIVING_CLAIM,
                                            documentId: row?.original?.id,
                                            printType: item,
                                        });
                                        setIsConfirmOpen(true);

     
                                    }}
                                >
                                    {item}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
        </div>
    ),
},
    ];

    const handleAddClaim = () => {
        if (hasPermission(userGroupPermissions, SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.code, [SYSTEM_PERMISSIONS.CREATE])) {
            setOpenForm(true);
        } else {
            setIsPermissionDeniedOpen(true);
        }
    };

    const onCloseForm = () => setOpenForm(false);

     const handleConfirmPrint = async () => {
        if (!selectedPrintPayload) return;
        try {
            const blob = await invoicePrint.mutateAsync(selectedPrintPayload);
            console.log(blob, "see blob");
            const url = URL.createObjectURL(blob);
            const iframe = document.createElement('iframe');

            iframe.style.display = 'none';
            iframe.src = url;

            document.body.appendChild(iframe);

            iframe.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            };
        } catch (error) {
            console.error("Print error:", error);
        }
    };


    return (
        <PageLoader isLoading={isLoading}>
            {openForm ? (
                <ClaimForm onClose={onCloseForm} />
            ) : (
                <div className="space-y-4 px-2">
                    <div className="item-center my-2 flex w-full justify-between space-y-2">
                        <div className="text-lg font-bold">Goods Receiving Claims</div>
                    </div>

                    <DataTable
                        query={query}
                        data={claimsResponse?.data?.rows || []}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={totalRowCount}
                    >
                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex w-full items-center gap-2">
                                <Input
                                    placeholder="Search by invoice or reason..."
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="!max-w-sm"
                                />

                                <FilterActionButtons
                                    onApplyFilters={handleFilters}
                                    onClearClick={clearFilters}
                                    showClearButton={showClearButton}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleAddClaim}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Claim
                                </Button>
                            </div>
                        </div>
                    </DataTable>

                    <ViewAccessDeniedDialog
                        open={isPermissionDeniedOpen}
                        onClose={() => setIsPermissionDeniedOpen(false)}
                        options={{ description: "You don't have access to create goods receiving claims." }}
                    />

                    {/* Claim Detail Dialog */}
                    {selectedClaim && (
                        <ClaimDetailDialog
                            claim={selectedClaim}
                            open={!!selectedClaim}
                            onClose={() => setSelectedClaim(null)}
                        />
                    )}

                        <ConfirmDialog
                                        open={isConfirmOpen}
                                        setOpen={setIsConfirmOpen}
                                        title={`Are you sure you want to print ${selectedPrintPayload?.printType} Document`}
                                        description="This action will print the selected debit note document."
                                        onConfirm={handleConfirmPrint}
                                    />
                </div>
            )}
        </PageLoader>
    );
};

export default GoodsReceivingClaims;