'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import SelectPopover from '@/components/select-popover';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import {
    useGetStockItemTagList,
    useRemoveStockItemTag,
    useSaveStockItemTag,
    type StockItemTag,
} from '@/api-queries/stock-item-tag';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { Save, Trash2 } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

const SkuTagsManagement = () => {
    const [stockItemId, setStockItemId] = useState('');
    const [tagCode, setTagCode] = useState('');
    const [tagValue, setTagValue] = useState('');
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
    const [effectiveTo, setEffectiveTo] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<StockItemTag | null>(null);
    const [searchText, setSearchText] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const stockQuery = useCompanyStockDetailsList({ limit: 200, offset: 0, status: 'ACTIVE' });
    const stockOptions = (stockQuery?.data?.data?.rows || []).map((stock) => ({
        label: stock.description || stock.itemCode || stock.id,
        value: stock.id,
    }));

    const initialFilters = { search: '' };
    const { pagination, setPagination } = useTableFilters<typeof initialFilters>(initialFilters);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchText.trim());
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchText]);

    const listQuery = useGetStockItemTagList({
        activeOnly: true,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
    });
    const rows = listQuery?.data?.data?.rows || [];
    const totalRowCount = listQuery?.data?.data?.count || 0;

    const saveMutation = useSaveStockItemTag();
    const removeMutation = useRemoveStockItemTag();

    const handleSave = () => {
        if (!stockItemId) {
            toast.error('Select a stock item');
            return;
        }
        if (!tagCode.trim() || !tagValue.trim()) {
            toast.error('Tag code and tag value are required');
            return;
        }
        saveMutation.mutate(
            {
                stockItemId,
                tagCode: tagCode.trim(),
                tagValue: tagValue.trim(),
                source: 'MANUAL',
                effectiveFrom: effectiveFrom ? new Date(`${effectiveFrom}T00:00:00.000Z`).toISOString() : undefined,
                effectiveTo: effectiveTo ? new Date(`${effectiveTo}T00:00:00.000Z`).toISOString() : null,
            },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success('Tag saved');
                        setTagCode('');
                        setTagValue('');
                    } else {
                        toast.error(response.message || 'Save failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const handleRemove = () => {
        if (!deleteTarget?.id) return;
        removeMutation.mutate(deleteTarget.id, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success('Tag removed');
                    setDeleteTarget(null);
                } else {
                    toast.error(response.message || 'Remove failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    const columns: ColumnDef<StockItemTag>[] = [
        {
            accessorKey: 'stockItemName',
            header: 'Stock Item',
            cell: ({ row }) => <div>{row.original.stockDetail?.itemCode || row.original.stockItemCode || '—'}</div>,
        },
        { accessorKey: 'tagCode', header: 'Tag Code' },
        { accessorKey: 'tagValue', header: 'Tag Value' },
        { accessorKey: 'source', header: 'Source' },
        {
            accessorKey: 'createdby',
            header: 'Created By',
            cell: ({ row }) => <div>{row.original.createdByUser?.firstName|| '—'}</div>,
        },
        {
            accessorKey: 'effectiveFrom',
            header: 'Effective From',
            cell: ({ row }) => <div>{row.original.effectiveFrom || '—'}</div>,
        },
        {
            accessorKey: 'effectiveTo',
            header: 'Effective To',
            cell: ({ row }) => <div>{row.original.effectiveTo || '—'}</div>,
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Remove tag"
                        onClick={() => setDeleteTarget(row.original)}
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={listQuery.isLoading || stockQuery.isLoading}>
            <div className="space-y-4">
                <Card>
                    <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
                        <div>
                            <Label>Stock Item</Label>
                            <SelectPopover
                                title="Stock Item"
                                onlyTitle="Select stock item"
                                selectedValue={stockItemId}
                                options={stockOptions}
                                onSelect={(value) => setStockItemId(String(value || ''))}
                            />
                        </div>
                        <div>
                            <Label>Tag Code</Label>
                            <Input
                                value={tagCode}
                                onChange={(event) => setTagCode(event.target.value)}
                                placeholder="FAST_MOVING"
                            />
                        </div>
                        <div>
                            <Label>Tag Value</Label>
                            <Input
                                value={tagValue}
                                onChange={(event) => setTagValue(event.target.value)}
                                placeholder="TIER_1"
                            />
                        </div>
                        <div>
                            <Label>Effective From</Label>
                            <Input
                                type="date"
                                value={effectiveFrom}
                                onChange={(event) => setEffectiveFrom(event.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Effective To</Label>
                            <Input
                                type="date"
                                value={effectiveTo}
                                onChange={(event) => setEffectiveTo(event.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                disabled={saveMutation.isPending}
                                onClick={handleSave}
                            >
                                <Save className="mr-1 h-4 w-4" /> Save
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <DataTable
                    query={listQuery}
                    data={rows}
                    columns={columns}
                    totalRowCount={totalRowCount}
                    pagination={pagination}
                    setPagination={setPagination}
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            className="h-9 w-60"
                            placeholder="Search"
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                        />
                    </div>
                    <div className="text-lg font-bold">SKU Tags</div>
                </DataTable>
            </div>

            <DeleteConfirmation
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleRemove}
                description={`Remove tag ${deleteTarget?.tagCode || ''} from ${
                    deleteTarget?.stockItemName || deleteTarget?.stockItemId || ''
                }?`}
            />
        </PageLoader>
    );
};

export default SkuTagsManagement;