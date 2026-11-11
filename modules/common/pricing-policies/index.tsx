import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, FlaskConical } from 'lucide-react';
import PricingPolicyForm from './pricing-policy-form';
import PricingPolicyResolveDialog from './pricing-policy-resolve-dialog';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetPricingPolicies,
    useGetPricingPolicyById,
    PricingPolicyFilterProps,
    PricingPolicyDetails,
    useDeletePricingPolicy,
} from '@/api-queries/pricing-policy';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import ConfirmDialog from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';

const SYSTEM_MODULE = SYSTEM_MODULES?.POINT_OF_SALE?.PRICING_POLICIES;

interface PricingPoliciesProps {
    module?: { code: string };
}

const PricingPolicies = ({ module = SYSTEM_MODULE }: PricingPoliciesProps) => {
    const MODULE_CODE = module?.code || SYSTEM_MODULE?.code;
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PricingPolicyDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<PricingPolicyDetails | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [isResolveOpen, setIsResolveOpen] = useState(false);

    const { data: freshPolicy } = useGetPricingPolicyById(editId);
    const freshPolicyData = Array.isArray(freshPolicy?.data) ? freshPolicy?.data?.[0] : freshPolicy?.data;
    const resolvedEditData = freshPolicyData || editData;

    const initialFilters: PricingPolicyFilterProps = { search: '' };

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<PricingPolicyFilterProps>(initialFilters);

    const query = useGetPricingPolicies({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });

    const { data, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;
    const policies = data?.data?.rows || [];

    const columns: ColumnDef<PricingPolicyDetails>[] = [
        {
            accessorKey: 'name',
            header: 'Policy Name',
            cell: ({ row }) => <div className="font-medium">{row.original.name || 'N/A'}</div>,
        },
        {
            accessorKey: 'transactionType',
            header: 'Transaction Type',
            cell: ({ row }) => <Badge variant="secondary" className="text-xs">{row.original.transactionType || 'N/A'}</Badge>,
        },
        {
            accessorKey: 'maxDiscountPercent',
            header: 'Max Disc. %',
            cell: ({ row }) => <div className="text-right">{row.original.maxDiscountPercent}%</div>,
        },
        {
            accessorKey: 'maxDiscountAmount',
            header: 'Max Disc. Amount',
            cell: ({ row }) => (
                <div className="text-right">
                    {row.original.maxDiscountAmount == null
                        ? 'Unlimited'
                        : Number(row.original.maxDiscountAmount).toFixed(2)}
                </div>
            ),
        },
        {
            accessorKey: 'allowPriceOverride',
            header: 'Price Override',
            cell: ({ row }) => (
                <Badge variant={row.original.allowPriceOverride ? 'default' : 'secondary'} className="text-xs">
                    {row.original.allowPriceOverride ? 'Allowed' : 'Blocked'}
                </Badge>
            ),
        },
        {
            accessorKey: 'requireApprovalAboveLimit',
            header: 'Approval Required',
            cell: ({ row }) => (
                <Badge variant={row.original.requireApprovalAboveLimit ? 'default' : 'secondary'} className="text-xs">
                    {row.original.requireApprovalAboveLimit ? 'Yes' : 'No'}
                </Badge>
            ),
        },
        {
            accessorKey: 'priority',
            header: 'Priority',
            cell: ({ row }) => <div className="text-center">{row.original.priority}</div>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                    {row.original.status}
                </Badge>
            ),
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
                                hasPermission(userGroupPermissions, MODULE_CODE, [
                                    SYSTEM_PERMISSIONS.UPDATE,
                                ])
                            ) {
                                e.stopPropagation();
                                onEditData(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
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
                                hasPermission(userGroupPermissions, MODULE_CODE, [
                                    SYSTEM_PERMISSIONS.DELETE,
                                ])
                            ) {
                                e.preventDefault();
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

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: PricingPolicyDetails) => {
        setEditId(data.id);
        setEditData(data);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditId(null);
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    const { mutate: deletePolicy } = useDeletePricingPolicy();

    const handleDelete = () => {
        if (selectedItem?.id)
            deletePolicy(selectedItem?.id, {
                onSuccess: (res) => {
                    if (res?.success) {
                        setSelectedItem(null);
                        setIsDeleteOpen(false);
                        toast.success('Pricing policy deleted');
                    } else {
                        toast.error(res?.message || 'Failed to delete pricing policy');
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Failed to delete pricing policy');
                },
            });
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
                <DataTable
                    query={query}
                    data={policies}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
<div className="mt-2 flex items-center justify-between">
                            <div className="flex w-full items-center gap-2">
                                <Input
                                    placeholder="Search by policy name..."
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
                                <Button
                                    variant="outline"
                                    onClick={() => setIsResolveOpen(true)}
                                    className="flex items-center gap-2"
                                >
                                    <FlaskConical className="h-4 w-4" />
                                    Test Resolve
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (
                                            hasPermission(userGroupPermissions, MODULE_CODE, [
                                                SYSTEM_PERMISSIONS.CREATE,
                                            ])
                                        ) {
                                            onAddData();
                                        } else {
                                            setIsPermissionDeniedOpen(true);
                                        }
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Pricing Policy
                                </Button>
                            </div>
                        </div>
                    </DataTable>

                {open && (
                    <PricingPolicyForm
                        open={open}
                        onClose={onClose}
                        editData={resolvedEditData}
                        key={resolvedEditData?.id || null}
                    />
                )}

                <PricingPolicyResolveDialog open={isResolveOpen} onClose={() => setIsResolveOpen(false)} />

                <ConfirmDialog
                    open={isDeleteOpen}
                    setOpen={setIsDeleteOpen}
                    title="Delete pricing policy?"
                    description={`This will permanently delete the policy "${selectedItem?.name || ''}".`}
                    confirmBtnTitle="Delete"
                    onConfirm={handleDelete}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to pricing policies." }}
            />
        </PageLoader>
    );
};

export default PricingPolicies;
