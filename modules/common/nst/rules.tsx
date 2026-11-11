import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import ConfirmDialog from '@/components/confirm-dialog';
import {
    DispositionRule,
    useGetDispositionRules,
    useGetDispositionRuleById,
    useDeleteDispositionRule,
} from '@/api-queries/nst';
import NSTRuleForm from './nst-rule-form';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { toast } from 'sonner';

const NSTRules = () => {
    const userGroupPermissions = useUsersPermissions();
    const currencySymbol = 'R';
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<DispositionRule | null>(null);
    const [selectedItem, setSelectedItem] = useState<DispositionRule | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    const [viewRuleId, setViewRuleId] = useState<string | null>(null);
    const detailQuery = useGetDispositionRuleById(viewRuleId ? { id: viewRuleId } : null);
    const viewRule = detailQuery.data?.data;

    const query = useGetDispositionRules({ status: 'ACTIVE' });
    const { data, isLoading } = query;
    const totalRowCount = data?.data?.length || 0;
    const rules = useMemo(() => data?.data || [], [data?.data]);

    const { mutate: deleteRule } = useDeleteDispositionRule();

    const columns: ColumnDef<DispositionRule>[] = [
        {
            accessorKey: 'code',
            header: (data) => <TableHeaderToggle {...data}>Rule</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-semibold">{row.original.code || 'N/A'}</div>
                    <div className="text-xs">{row.original.name || 'N/A'}</div>
                </div>
            ),
        },
        {
            accessorKey: 'dispositionType',
            header: 'Type',
            cell: ({ row }) => (
                <Badge variant="outline" className="text-xs">
                    {row.original.dispositionType.replace(/_/g, ' ')}
                </Badge>
            ),
        },
        {
            accessorKey: 'triggerMode',
            header: 'Trigger',
            cell: ({ row }) => <div>{row.original.triggerMode}</div>,
        },
        {
            accessorKey: 'actionType',
            header: 'Action',
            cell: ({ row }) => <div>{row.original.actionType.replace(/_/g, ' ')}</div>,
        },
        {
            accessorKey: 'discount',
            header: 'Discount',
            cell: ({ row }) => (
                <div>
                    {row.original.discountValue != null
                        ? `${row.original.discountValue}${row.original.discountType === 'PERCENTAGE' ? '%' : currencySymbol}`
                        : 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'approval',
            header: 'Approval',
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div>{row.original.requireApproval ? 'Required' : 'Not required'}</div>
                    {row.original.requireApproval ? (
                        <div className="text-xs text-muted-foreground">Level {row.original.minimumApproverLevel}</div>
                    ) : null}
                </div>
            ),
        },
        {
            accessorKey: 'priority',
            header: 'Priority',
            cell: ({ row }) => <div>{row.original.priority}</div>,
        },
        {
            accessorKey: 'scopes',
            header: 'Scopes',
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {(row.original.scopes || []).map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                            {s.scopeType}
                            {s.scopeId ? `: ${s.scopeId}` : ''}
                        </Badge>
                    ))}
                </div>
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
                        className="h-8 w-8 p-0"
                        title="View Rule"
                        onClick={() => setViewRuleId(row.original.id)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.RULES.code,
                                    [SYSTEM_PERMISSIONS.UPDATE],
                                )
                            ) {
                                setEditData(row.original);
                                setOpen(true);
                            } else {
                                setIsPermissionDeniedOpen(true);
                            }
                        }}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.RULES.code,
                                    [SYSTEM_PERMISSIONS.DELETE],
                                )
                            ) {
                                setSelectedItem(row.original);
                                setIsDeleteOpen(true);
                            } else {
                                setIsPermissionDeniedOpen(true);
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const onAddData = () => {
        setEditData(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setOpen(false);
    };

    const handleDelete = () => {
        if (!selectedItem) return;
        deleteRule(selectedItem.id, {
            onSuccess: (res) => {
                if (res?.success) {
                    toast.success('NST rule deleted successfully');
                    setSelectedItem(null);
                    setIsDeleteOpen(false);
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <div className="text-lg font-bold">NST Approval Rules</div>

                <DataTable
                    query={query}
                    data={rules}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-end">
                        <Button
                            onClick={() => {
                                if (
                                    hasPermission(
                                        userGroupPermissions,
                                        SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.RULES.code,
                                        [SYSTEM_PERMISSIONS.CREATE],
                                    )
                                ) {
                                    onAddData();
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                }
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            New Rule
                        </Button>
                    </div>
                </DataTable>
            </div>

            {open && (
                <NSTRuleForm
                    open={open}
                    onClose={onClose}
                    editData={editData}
                    key={editData?.id || 'new'}
                />
            )}

            {viewRuleId && (
                <PageLoader isLoading={detailQuery.isLoading}>
                    <Dialog open={!!viewRuleId} onOpenChange={() => setViewRuleId(null)}>
                        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-[640px]">
                            <DialogHeader>
                                <DialogTitle className="font-semibold">NST Rule Details</DialogTitle>
                            </DialogHeader>
                            {viewRule ? (
                                <div className="space-y-3 text-xs">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-muted-foreground">Code</div>
                                            <div className="font-semibold">{viewRule.code || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Name</div>
                                            <div className="font-semibold">{viewRule.name || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Disposition Type</div>
                                            <div>{viewRule.dispositionType.replace(/_/g, ' ')}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Trigger Mode</div>
                                            <div>{viewRule.triggerMode}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Near-Expiry Window (days)</div>
                                            <div>
                                                {viewRule.nearExpiryFromDays} - {viewRule.nearExpiryToDays}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Action</div>
                                            <div>{viewRule.actionType.replace(/_/g, ' ')}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Discount</div>
                                            <div>
                                                {viewRule.discountValue != null
                                                    ? `${viewRule.discountValue}${viewRule.discountType === 'PERCENTAGE' ? '%' : currencySymbol}`
                                                    : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Max Discount %</div>
                                            <div>{viewRule.maximumDiscountPercentage ?? 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Min Margin %</div>
                                            <div>{viewRule.minimumMarginPercentage ?? 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Priority</div>
                                            <div>{viewRule.priority}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Status</div>
                                            <div>{viewRule.status}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Approval</div>
                                            <div>
                                                {viewRule.requireApproval
                                                    ? `Required (Level ${viewRule.minimumApproverLevel})`
                                                    : 'Not required'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Allow Sale</div>
                                            <div>{viewRule.allowSale ? 'Yes' : 'No'}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Promotion Stacking</div>
                                            <div>{viewRule.allowPromotionStacking ? 'Yes' : 'No'}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Scopes</div>
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {(viewRule.scopes || []).map((s, i) => (
                                                <Badge key={i} variant="secondary" className="text-[10px]">
                                                    {s.scopeType}
                                                    {s.scopeId ? `: ${s.scopeId}` : ''}
                                                </Badge>
                                            ))}
                                            {(viewRule.scopes || []).length === 0 ? 'N/A' : null}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </DialogContent>
                    </Dialog>
                </PageLoader>
            )}

            {isDeleteOpen && (
                <ConfirmDialog
                    open={isDeleteOpen}
                    setOpen={setIsDeleteOpen}
                    title={`Are you sure you want to delete rule ${selectedItem?.code}?`}
                    description="This action cannot be undone."
                    onConfirm={handleDelete}
                />
            )}

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{ description: "You don't have access to manage NST rules." }}
            />
        </PageLoader>
    );
};

export default NSTRules;
