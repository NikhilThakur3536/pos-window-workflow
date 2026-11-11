import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';
import { ArrowLeft, Download } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { useRouter } from 'next/router';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IMPORT_RESULTS_STATUSES, ImportResultsStatus } from '@/api-queries/global-types';
import {
    useGetImportHistoryDetails,
    FilterProps,
    ImportHistoryDetailsType,
} from '@/api-queries/import-history/details';
import { ReactNode, useMemo } from 'react';
import { ImportHistoryTypesType } from '@/api-queries/import-history';
import { Separator } from '@/components/ui/separator';

export interface ImportHistoryDetailsProps {
    importBatchId: string;
    importType: ImportHistoryTypesType;
    children: ReactNode;
}

export default function ImportDetails({ importBatchId, importType, children }: ImportHistoryDetailsProps) {
    const router = useRouter();

    const initialFilters = {
        importBatchId,
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

    const query = useGetImportHistoryDetails({
        importBatchId,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.validationStatus ? { validationStatus: appliedFilters?.validationStatus } : {}),
    });

    const { data: historyDetails, isLoading } = query;
    const historyDetailsData = historyDetails?.data?.importDetails;

    const totalRowCount = historyDetails?.data?.count || 0;

    const dynamicColumns: ColumnDef<ImportHistoryDetailsType>[] = useMemo(() => {
        const firstRow = historyDetails?.data?.rows?.[0];

        if (!firstRow?.rawData) return [];

        return Object.keys(firstRow.rawData).map((key) => ({
            accessorFn: (row) => row.rawData?.[key],
            id: key,
            header: key,
            cell: ({ getValue }) => {
                const value = getValue();
                return <div>{value?.toString() || 'N/A'}</div>;
            },
        }));
    }, [historyDetails]);

    const columns: ColumnDef<ImportHistoryDetailsType>[] = [
        ...dynamicColumns,
        {
            accessorKey: 'validationMessage',
            header: 'Validation Message',
            cell: ({ row }) => <div className="max-w-md truncate">{row.original.validationMessage || 'N/A'}</div>,
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

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 p-4">
                <div className="bg-background space-y-4 rounded-lg border p-4">
                    <div className="grid grid-cols-4 gap-x-6 gap-y-3 text-sm">
                        <div>
                            <p className="text-muted-foreground text-xs">Imported By</p>
                            <p className="font-medium">{historyDetailsData?.createdBy?.name}</p>
                        </div>

                        <div>
                            <p className="text-muted-foreground text-xs">Date</p>
                            <p className="font-medium">
                                {moment(historyDetailsData?.createdAt).format('DD MMM YYYY, hh:mm A')}
                            </p>
                        </div>

                        <div>
                            <p className="text-muted-foreground text-xs">Sheet Name</p>
                            <p className="truncate font-medium">{historyDetailsData?.fileName}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">Import Results</p>
                            <p className="flex gap-2 truncate font-medium">
                                <Badge className="bg-green-100 text-green-700">
                                    Success : {historyDetailsData?.validRows}
                                </Badge>
                                <Badge className="bg-red-100 text-red-700">
                                    Failed : {historyDetailsData?.invalidRows}
                                </Badge>
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Select
                                value={filters.validationStatus}
                                onValueChange={(val: ImportResultsStatus) =>
                                    setFilters({ ...filters, validationStatus: val })
                                }
                            >
                                <SelectTrigger className="!w-40 capitalize">
                                    <SelectValue placeholder="Select Result Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {IMPORT_RESULTS_STATUSES.map((option) => (
                                        <SelectItem key={option} value={option} className="capitalize">
                                            {option?.toLowerCase()}
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
                            <Button
                                variant="outline"
                                onClick={() => router.push(router.route?.split('/').slice(0, -1).join('/'))}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" /> Go Back
                            </Button>

                            <Button
                                variant="default"
                                asChild
                                className="flex items-center gap-2 bg-green-100 text-green-700 hover:bg-green-300 hover:text-green-800"
                            >
                                <a href={historyDetailsData?.s3FileUrl} download>
                                    <Download className="h-4 w-4" /> Download
                                </a>
                            </Button>

                            {children}
                        </div>
                    </div>
                </div>

                <DataTable
                    query={query}
                    data={historyDetails?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                    rowClassName={(data) =>
                        data.validationStatus === 'VALID'
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            : data.validationStatus === 'INVALID'
                              ? 'bg-red-50 hover:bg-red-100 text-red-700'
                              : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
                    }
                />
            </div>
        </PageLoader>
    );
}
