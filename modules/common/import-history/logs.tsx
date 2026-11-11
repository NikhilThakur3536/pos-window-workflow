import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';
import { ArrowLeft, Download } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { useRouter } from 'next/router';
import { useGetImportHistoryLogs, FilterProps, ImportHistoryLogDetails } from '@/api-queries/import-history/logs';
import { ImportHistoryTypesType } from '@/api-queries/import-history';
import { Separator } from '@/components/ui/separator';
import { ReactNode } from 'react';

export interface ImportHistoryLogsProps {
    importBatchId: string;
    importType: ImportHistoryTypesType;
    children: ReactNode;
}

export default function ImportLogs({ importBatchId, importType, children }: ImportHistoryLogsProps) {
    const router = useRouter();

    const initialFilters = {
        importBatchId,
    };

    const { pagination, setPagination } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetImportHistoryLogs({
        importBatchId,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const { data: historyLogs, isLoading } = query;
    const historyLogsData = historyLogs?.data?.importDetails;
    const totalRowCount = historyLogs?.data?.count || 0;

    const columns: ColumnDef<ImportHistoryLogDetails>[] = [
        {
            accessorKey: 'importBatchId',
            header: 'Import Batch Id',
            cell: ({ row }) => (
                <div className="font-medium">
                    #{row.original.importBatchId?.replaceAll('-', '')?.toUpperCase() || 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'message',
            header: 'Message',
            cell: ({ row }) => <div className="max-w-md truncate">{row.original.message || 'N/A'}</div>,
        },
        {
            accessorKey: 'action',
            header: 'Action',
            cell: ({ row }) => <div className="font-semibold">{row.original.action || 'N/A'}</div>,
        },
        {
            accessorKey: 'performedBy',
            header: 'Performed By',
            cell: ({ row }) => <div>{row.original.performedBy?.name || 'N/A'}</div>,
        },
    ];

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 p-4">
                <div className="bg-background space-y-4 rounded-lg border p-4">
                    <div className="grid grid-cols-4 gap-x-6 gap-y-3 text-sm">
                        <div>
                            <p className="text-muted-foreground text-xs">Imported By</p>
                            <p className="font-medium">{historyLogsData?.createdBy?.name}</p>
                        </div>

                        <div>
                            <p className="text-muted-foreground text-xs">Date</p>
                            <p className="font-medium">
                                {moment(historyLogsData?.createdAt).format('DD MMM YYYY, hh:mm A')}
                            </p>
                        </div>

                        <div>
                            <p className="text-muted-foreground text-xs">Sheet Name</p>
                            <p className="truncate font-medium">{historyLogsData?.fileName}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">Import Results</p>
                            <p className="flex gap-2 truncate font-medium">
                                <Badge className="bg-green-100 text-green-700">
                                    Success : {historyLogsData?.validRows}
                                </Badge>
                                <Badge className="bg-red-100 text-red-700">
                                    Failed : {historyLogsData?.invalidRows}
                                </Badge>
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div></div>

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
                                <a href={historyLogsData?.s3FileUrl} download>
                                    <Download className="h-4 w-4" /> Download
                                </a>
                            </Button>

                            {children}
                        </div>
                    </div>
                </div>

                <DataTable
                    query={query}
                    data={historyLogs?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                />
            </div>
        </PageLoader>
    );
}
