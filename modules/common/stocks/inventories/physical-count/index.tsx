import { createContext, useContext, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Box, QrCode, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import {
    StockInventoryDetails,
    useGetStockInventories,
    FilterProps,
    usePhysicalCountStock,
} from '@/api-queries/company/stock-inventories';
import { generateUniqueUUID } from '@/utils/helpers';

type CountEntry = { countedQuantity: string; remarks: string; lastPhysicalCountDate: string };

type PhysicalCountContextValue = {
    counts: Record<string, CountEntry>;
    savedIds: Record<string, boolean>;
    isSavingId: string | null;
    setCountValue: (id: string, key: 'countedQuantity' | 'remarks' | 'lastPhysicalCountDate', value: string) => void;
    handleSave: (row: StockInventoryDetails) => void;
};

/**
 * WHY A CONTEXT?
 * Previously the `columns` array was created inside the component and depended on the `counts` state.
 * Every keystroke changed `counts`, which created brand-new cell functions, and React treats a new
 * function as a new component type. That unmounted and remounted the <Input>, so it lost focus after
 * each character.
 *
 * Now the columns are defined ONCE (outside the component) and the cells read the changing state
 * from this context. State updates only re-render the cells; they never remount them, so the input
 * keeps focus and you can type "123" in one go.
 */
const PhysicalCountContext = createContext<PhysicalCountContextValue | null>(null);

const usePhysicalCountContext = () => {
    const ctx = useContext(PhysicalCountContext);
    if (!ctx) throw new Error('usePhysicalCountContext must be used inside PhysicalCountContext.Provider');
    return ctx;
};

const CountedQuantityCell = ({ id }: { id: string }) => {
    const { counts, setCountValue } = usePhysicalCountContext();
    return (
        <Input
            type="number"
            min={0}
            placeholder="0"
            value={counts[id]?.countedQuantity ?? ''}
            onChange={(e) => setCountValue(id, 'countedQuantity', e.target.value)}
            className="!w-28"
        />
    );
};

const RemarksCell = ({ id }: { id: string }) => {
    const { counts, setCountValue } = usePhysicalCountContext();
    return (
        <Input
            placeholder="Remarks (optional)"
            value={counts[id]?.remarks ?? ''}
            onChange={(e) => setCountValue(id, 'remarks', e.target.value)}
            className="!min-w-[160px]"
        />
    );
};

const PhysicalCountDateCell = ({ id }: { id: string }) => {
    const { counts, setCountValue } = usePhysicalCountContext();
    return (
        <Input
            type="date"
            value={counts[id]?.lastPhysicalCountDate ?? ''}
            onChange={(e) => setCountValue(id, 'lastPhysicalCountDate', e.target.value)}
            className="!w-40"
        />
    );
};

const ActionCell = ({ row }: { row: StockInventoryDetails }) => {
    const { savedIds, isSavingId, handleSave } = usePhysicalCountContext();
    return (
        <div className="flex items-center justify-center gap-2">
            {savedIds[row.id] ? (
                <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                    <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
            ) : (
                <Button
                    size="sm"
                    disabled={isSavingId === row.id}
                    onClick={() => handleSave(row)}
                    className="flex items-center gap-1.5"
                >
                    <Save className="h-4 w-4" />
                    {isSavingId === row.id ? 'Saving...' : 'Save Count'}
                </Button>
            )}
        </div>
    );
};

// Stable column definitions: created once, never re-created on state change.
// const columns: ColumnDef<StockInventoryDetails>[] = [
//     {
//         accessorKey: 'CompanyStockDetail.description',
//         header: 'Stock Details',
//         cell: ({ row }) => {
//             const name = row?.original?.CompanyStockDetail?.description || 'N/A';
//             const itemCode = row?.original?.CompanyStockDetail?.itemCode || 'N/A';
//             return (
//                 <div className="space-y-1">
//                     <div className="flex items-center gap-2">
//                         <Box className="!h-4 !w-4" />
//                         {name || 'N/A'}
//                     </div>
//                     <div className="flex items-center gap-2">
//                         <QrCode className="!h-4 !w-4" /> {itemCode || 'N/A'}
//                     </div>
//                 </div>
//             );
//         },
//     },
//     {
//         accessorKey: 'warehouse.warehouse',
//         header: 'Warehouse',
//         cell: ({ row }) => {
//             const wh = row?.original?.warehouse;
//             return <div>{wh?.warehouse || wh?.name || wh?.description || 'N/A'}</div>;
//         },
//     },
//     {
//         accessorKey: 'stockOnHand',
//         header: 'Stock On Hand',
//         cell: ({ row }) => <div className="font-medium">{row.original.stockOnHand}</div>,
//     },
//     {
//         accessorKey: 'availableStock',
//         header: 'Available',
//         cell: ({ row }) => <div>{row.original.availableStock}</div>,
//     },
//     {
//         id: 'countedQuantity',
//         header: () => <div className="min-w-[120px]">Counted Quantity</div>,
//         cell: ({ row }) => <CountedQuantityCell id={row.original.id} />,
//     },
//     {
//         id: 'remarks',
//         header: () => <div className="min-w-[160px]">Remarks</div>,
//         cell: ({ row }) => <RemarksCell id={row.original.id} />,
//     },
//     {
//         id: 'action',
//         header: () => <div className="text-center">Action</div>,
//         cell: ({ row }) => <ActionCell row={row.original} />,
//     },
// ];
const columns: ColumnDef<StockInventoryDetails>[] = [
    {
        accessorKey: 'CompanyStockDetail.description',
        header: 'Stock Details',
        cell: ({ row }) => {
            const name =
                row?.original?.CompanyStockDetail?.description || 'N/A';
            const itemCode =
                row?.original?.CompanyStockDetail?.itemCode || 'N/A';

            return (
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Box className="!h-4 !w-4" />
                        {name || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                        <QrCode className="!h-4 !w-4" />
                        {itemCode || 'N/A'}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'warehouse.warehouse',
        header: 'Warehouse',
        cell: ({ row }) => {
            const wh = row?.original?.warehouse;

            return (
                <div>
                    {wh?.warehouse ||
                        wh?.name ||
                        wh?.description ||
                        'N/A'}
                </div>
            );
        },
    },
    {
        accessorKey: 'stockOnHand',
        header: 'Stock On Hand',
        cell: ({ row }) => (
            <div className="font-medium">
                {row.original.stockOnHand}
            </div>
        ),
    },
    {
        accessorKey: 'availableStock',
        header: 'Available',
        cell: ({ row }) => (
            <div>{row.original.availableStock}</div>
        ),
    },

    // Expiry Date
    {
        accessorKey: 'expiryDate',
        header: 'Expiry Date',
        cell: ({ row }) => {
            const date = row.original.expiryDate;

            return (
                <div>
                    {date
                        ? new Date(date).toLocaleDateString()
                        : 'N/A'}
                </div>
            );
        },
    },

    // Last Restock Date
    {
        accessorKey: 'lastRestockDate',
        header: 'Last Restock',
        cell: ({ row }) => {
            const date = row.original.lastRestockDate;

            return (
                <div>
                    {date
                        ? new Date(date).toLocaleDateString()
                        : 'N/A'}
                </div>
            );
        },
    },

    // Last Sale Date
    {
        accessorKey: 'lastSaleDate',
        header: 'Last Sale',
        cell: ({ row }) => {
            const date = row.original.lastSaleDate;

            return (
                <div>
                    {date
                        ? new Date(date).toLocaleDateString()
                        : 'N/A'}
                </div>
            );
        },
    },

    // Last Physical Count Date
    {
        accessorKey: 'lastPhysicalCountDate',
        header: 'Last Physical Count',
        cell: ({ row }) => {
            const date = row.original.lastPhysicalCountDate;

            return (
                <div>
                    {date
                        ? new Date(date).toLocaleDateString()
                        : 'N/A'}
                </div>
            );
        },
    },

    // Created Date
    {
        accessorKey: 'createdAt',
        header: 'Created Date',
        cell: ({ row }) => {
            const date = row.original.createdAt;

            return (
                <div>
                    {date
                        ? new Date(date).toLocaleDateString()
                        : 'N/A'}
                </div>
            );
        },
    },

    // Updated Date
    {
        accessorKey: 'updatedAt',
        header: 'Updated Date',
        cell: ({ row }) => {
            const date = row.original.updatedAt;

            return (
                <div>
                    {date
                        ? new Date(date).toLocaleDateString()
                        : 'N/A'}
                </div>
            );
        },
    },

    {
        id: 'physicalCountDate',
        header: () => (
            <div className="min-w-[160px]">
                Physical Count Date
            </div>
        ),
        cell: ({ row }) => (
            <PhysicalCountDateCell id={row.original.id} />
        ),
    },
    {
        id: 'countedQuantity',
        header: () => (
            <div className="min-w-[120px]">
                Counted Quantity
            </div>
        ),
        cell: ({ row }) => (
            <CountedQuantityCell id={row.original.id} />
        ),
    },
    {
        id: 'remarks',
        header: () => (
            <div className="min-w-[160px]">
                Remarks
            </div>
        ),
        cell: ({ row }) => (
            <RemarksCell id={row.original.id} />
        ),
    },
    {
        id: 'action',
        header: () => (
            <div className="text-center">
                Action
            </div>
        ),
        cell: ({ row }) => (
            <ActionCell row={row.original} />
        ),
    },
];

const PhysicalStockCount = () => {
    const [counts, setCounts] = useState<Record<string, CountEntry>>({});
    const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
    const [isSavingId, setIsSavingId] = useState<string | null>(null);

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

    const query = useGetStockInventories({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: stockInventories, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const physicalCount = usePhysicalCountStock();

    const setCountValue = (id: string, key: 'countedQuantity' | 'remarks' | 'lastPhysicalCountDate', value: string) => {
        setCounts((prev) => ({
            ...prev,
            [id]: {
                ...(prev[id] || { countedQuantity: '', remarks: '', lastPhysicalCountDate: '' }),
                [key]: value,
            },
        }));
        setSavedIds((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const handleSave = (row: StockInventoryDetails) => {
        const entry = counts[row.id] || { countedQuantity: '', remarks: '', lastPhysicalCountDate: '' };
        const countedQuantity = Number(entry.countedQuantity);

        if (entry.countedQuantity === '' || Number.isNaN(countedQuantity) || countedQuantity < 0) {
            toast.error('Please enter a valid counted quantity');
            return;
        }

        if (!entry.lastPhysicalCountDate) {
            toast.error('Please select a physical count date');
            return;
        }
        // if (!row.warehouseId) {
        //     toast.error('Warehouse is not available for this stock item');
        //     return;
        // }

        setIsSavingId(row.id);
        physicalCount.mutate(
            {
                companyStockInventoryId: row.id,
                countedQuantity,
                clientEventId: generateUniqueUUID(),
                lastPhysicalCountDate: entry.lastPhysicalCountDate,
                ...(row.warehouseId ? { warehouseId: row.warehouseId } : {}),
                remarks: entry.remarks,
            },
            {
                onSuccess: (data) => {
                    setIsSavingId(null);
                    if (data.success) {
                        setSavedIds((prev) => ({ ...prev, [row.id]: true }));
                        setCounts((prev) =>
                            prev[row.id] ? { ...prev, [row.id]: { ...prev[row.id], remarks: '' } } : prev,
                        );
                        toast.success('Stock count submitted successfully');
                    } else {
                        toast.error(data.message || 'Stock count submission failed');
                    }
                },
                onError: (error: any) => {
                    setIsSavingId(null);
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
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

    const handleRowClick = () => {};

    return (
        <PhysicalCountContext.Provider value={{ counts, savedIds, isSavingId, setCountValue, handleSave }}>
            <PageLoader isLoading={isLoading}>
                <div className="space-y-4">
                    <div className="px-4 pt-4">
                        <h1 className="text-2xl font-semibold">Physical Stock Count</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Enter the counted quantity for each stock item and submit the physical count.
                        </p>
                    </div>

                    <div className="px-4 pb-4">
                        <DataTable
                            query={query}
                            data={stockInventories?.data?.rows || []}
                            columns={columns}
                            pagination={pagination}
                            setPagination={setPagination}
                            totalRowCount={totalRowCount}
                            onRowClick={handleRowClick}
                            getRowId={(row) => row.id}
                        >
                            <div className="mb-3 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                                <div className="flex w-full items-center gap-2">
                                    <Input
                                        placeholder="Search by stock description or item code..."
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

                                <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Label className="text-xs">Total Items:</Label>
                                        <span className="font-medium">{totalRowCount}</span>
                                    </div>
                                </div>
                            </div>
                        </DataTable>
                    </div>
                </div>
            </PageLoader>
        </PhysicalCountContext.Provider>
    );
};

export default PhysicalStockCount;
