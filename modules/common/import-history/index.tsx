// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Eye, Download, Printer } from 'lucide-react';
// import moment from 'moment';
// import { useRouter } from 'next/router';
// import { useState } from 'react';
// import { StockPrintLabelItem, StockPrintLabels } from '@/components/custom-components/print-labels';
// import { generateImportBatchLabels } from '@/api-queries/barcode';
// import {
//     ImportHistoryDetails,
//     ImportHistoryTypesType,
//     useGetImportHistory,
//     FilterProps,
//     getImportHistory,
// } from '@/api-queries/import-history';
// import useTableFilters from '@/components/list-only-table/use-table-filters';
// import { PageLoader } from '@/components/custom-components/PageLoader';
// import { type ColumnDef } from '@tanstack/react-table';
// import ExportSheets from '@/components/export-sheets';
// import { DataTable } from '@/components/dynamic-table/data-table';

// export interface ImportHistoryProps {
//     importType: ImportHistoryTypesType;
//     isPrintLabel?: boolean;
// }

// export default function ImportHistory({ importType, isPrintLabel = false }: ImportHistoryProps) {
//     // const importTypeTitle = `${importType?.replaceAll('_', ' ')} IMPORT HISTORY`;
//     const importTypeTitle =
//   importType === "SIMPLE_PRICING"
//     ? "Markup Pricing Import History"
//     : `${importType?.replaceAll("_", " ")} IMPORT HISTORY`;
//     const router = useRouter();

//     const [openPrint, setOpenPrint] = useState(false);
//     const [printData, setPrintData] = useState<StockPrintLabelItem[]>([]);
//     const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);

//     const formatDate = (date?: string | null) => {
//     if (!date) return "-";

//     return new Intl.DateTimeFormat("en-IN", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//         hour12: true,
//     }).format(new Date(date));
// };

//     const testData = [
//         {
//             code: '3003',
//             description: 'Cheese | Kg - Variable Weighted',
//             price: 62.4,
//             company: 'Demo Company',
//         },
//         {
//             code: 'CREAMSODA12',
//             description: 'Cream Soda Single Can',
//             price: 6.24,
//             company: 'Demo Company',
//         },
//         {
//             code: 'CREAMSODA113',
//             description: 'Milk 1L Full Cream',
//             price: 3.5,
//             company: 'Demo Company',
//         },
//         {
//             code: '21213',
//             description: 'Brown Bread Large',
//             price: 2.75,
//             company: 'Demo Company',
//         },
//         {
//             code: '232323',
//             description: 'Butter 500g Salted',
//             price: 4.8,
//             company: 'Demo Company',
//         },
//         {
//             code: '3231231',
//             description: 'Eggs Tray (12 pcs)',
//             price: 5.4,
//             company: 'Demo Company',
//         },
//         {
//             code: '2003',
//             description: 'Cheese | Kg - Variable Weighted',
//             price: 62.4,
//             company: 'Demo Company',
//         },
//         {
//             code: 'CREAMSODA',
//             description: 'Cream Soda Single Can',
//             price: 6.24,
//             company: 'Demo Company',
//         },
//         {
//             code: '1001',
//             description: 'Milk 1L Full Cream',
//             price: 3.5,
//             company: 'Demo Company',
//         },
//         {
//             code: '1002',
//             description: 'Brown Bread Large',
//             price: 2.75,
//             company: 'Demo Company',
//         },
//         {
//             code: '1003',
//             description: 'Butter 500g Salted',
//             price: 4.8,
//             company: 'Demo Company',
//         },
//         {
//             code: '1004',
//             description: 'Eggs Tray (12 pcs)',
//             price: 5.4,
//             company: 'Demo Company',
//         },
//         {
//             code: '1005',
//             description: 'Orange Juice 1L',
//             price: 4.2,
//             company: 'Demo Company',
//         },
//         {
//             code: '1006',
//             description: 'Chicken Breast | Kg',
//             price: 9.6,
//             company: 'Demo Company',
//         },
//         {
//             code: '1007',
//             description: 'Rice Basmati 5Kg',
//             price: 18.9,
//             company: 'Demo Company',
//         },
//         {
//             code: '1008',
//             description: 'Sugar 1Kg',
//             price: 1.9,
//             company: 'Demo Company',
//         },
//         {
//             code: '1009',
//             description: 'Salt 1Kg',
//             price: 0.9,
//             company: 'Demo Company',
//         },
//         {
//             code: '1010',
//             description: 'Potato | Kg',
//             price: 1.5,
//             company: 'Demo Company',
//         },
//         {
//             code: '1011',
//             description: 'Onion | Kg',
//             price: 1.8,
//             company: 'Demo Company',
//         },
//         {
//             code: '1012',
//             description: 'Tomato | Kg',
//             price: 2.2,
//             company: 'Demo Company',
//         },
//         {
//             code: '1013',
//             description: 'Coca Cola 1.5L Bottle',
//             price: 3.25,
//             company: 'Demo Company',
//         },
//     ];

//     // Import HIstory Data

//     const initialFilters = {
//         importType,
//     };

//     const { pagination, setPagination } = useTableFilters<FilterProps>(initialFilters);

//     const query = useGetImportHistory({
//         limit: pagination.pageSize,
//         offset: pagination.pageIndex * pagination.pageSize,
//         importType,
//     });
//     const { data: importHistory, isLoading } = query;
//     const totalRowCount = query?.data?.data?.count || 0;

//     const columns: ColumnDef<ImportHistoryDetails>[] = [
//         {
//             accessorKey: 'taxRatePercent',
//             header: 'Imported By',
//             cell: ({ row }) => {
//                 const createdBy = row.original.createdBy?.name;
//                 return <div>{createdBy}</div>;
//             },
//         },
//         {
//             accessorKey: 'createdAt',
//             header: 'Date & Time',
//             cell: ({ row }) => {
//                 const createdAt = row.original.createdAt;
//                 return <div>{moment(createdAt).format('DD MMM, YYYY - hh:mm A')}</div>;
//             },
//         },
//         {
//             accessorKey: 'fileName',
//             header: 'File Name',
//             cell: ({ row }) => {
//                 const fileName = row.original.fileName;
//                 return <div>{fileName}</div>;
//             },
//         },

//         {
//             accessorKey: 'totalRows',
//             header: 'Import Results',
//             cell: ({ row }) => {
//                 const status = row.original;
//                 return (
//                     <div className="flex gap-2">
//                         <Badge className="bg-green-100 text-green-700">{status.validRows}</Badge>
//                         <Badge className="bg-red-100 text-red-700">{status.invalidRows}</Badge>
//                     </div>
//                 );
//             },
//         },
//         {
//             accessorKey: 'status',
//             header: 'Status',
//             cell: ({ row }) => {
//                 const status = row.original.status ?? '';
//                 console.log("status",status)

//                 const statusStyles: Record<string,string> = {
//                     COMPLETE: 'bg-green-100 text-green-700',
//                     PENDING: 'bg-yellow-100 text-yellow-700',
//                     FAILED: 'bg-red-100 text-red-700',
//                     PROCESSING: 'bg-blue-100 text-blue-700',
//                     CANCELLED: 'bg-gray-100 text-gray-700',
//                 };

//                 return (
//                     <Badge
//                         className={`${
//                             statusStyles[status] || 'bg-gray-100 text-gray-700'
//                         }`}
//                     >
//                         {status}
//                     </Badge>
//                 );
//             },
//         },
//         {
//             accessorKey: "startedAt",
//             header: "Started At",
//             cell: ({ row }) => {
//                 return formatDate(row.original.createdAt);
//             },
//         },
//         {
//             accessorKey: "completedAt",
//             header: "Completed At",
//             cell: ({ row }) => {
//                 return formatDate(row.original.completedAt);
//             },
//         },
//         {
//             accessorKey: 'errorMessage',
//             header: 'Error',
//             cell: ({ row }) => {
//                 return (
//                     <div>{row.original.errorMessage || "-"}</div>
//                 );
//             },
//         },
//         {
//             accessorKey: 's3FileUrl',
//             header: 'Download',
//             cell: ({ row }) => {
//                 return (
//                     <Button size="sm" variant="outline" asChild>
//                         <a href={row.original.s3FileUrl} download>
//                             <Download className="mr-1 h-4 w-4" />
//                             Sheet
//                         </a>
//                     </Button>
//                 );
//             },
//         },

//         {
//             id: 'actions',
//             header: () => <div className="text-center">Actions</div>,
//             cell: ({ row }) => (
//                 <div className="flex items-center justify-center gap-1">
//                     <Button size="sm" onClick={() => router.push(`${router.route}/${row.original.id}`)}>
//                         <Eye className="mr-1 h-4 w-4" />
//                         Details
//                     </Button>

//                     {isPrintLabel ? (
//                         <Button
//                             size="sm"
//                             variant="outline"
//                             disabled={isGeneratingLabels}
//                             onClick={async () => {
//                                 const importId = row.original.id;
//                                 if (!importId) return;

//                                 setIsGeneratingLabels(true);
//                                 try {
//                                     // Call the generate labels API
//                                     const response = await generateImportBatchLabels({
//                                         importHistoryId: importId, // Adjust payload based on actual API requirement
//                                         // Add any other required fields here
//                                     });

//                                     // Assuming the API returns { s3Url: string, ... } or similar
//                                     const s3LabelUrl = response?.data?.s3Url || response?.s3FileUrl;

//                                     if (s3LabelUrl) {
//                                         // Open the generated labels in a new tab / trigger download / pass to print component
//                                         window.open(s3LabelUrl, '_blank');
//                                         // OR if StockPrintLabels expects data:
//                                         // setPrintData(/* parsed data if needed */);
//                                         // setOpenPrint(true);
//                                     } else {
//                                         console.error("No S3 URL returned from label generation");
//                                     }
//                                 } catch (error) {
//                                     console.error("Failed to generate labels:", error);
//                                     // Optionally show toast/notification
//                                 } finally {
//                                     setIsGeneratingLabels(false);
//                                 }
//                             }}
//                         >
//                             <Printer className="mr-1 h-4 w-4" />
//                             {isGeneratingLabels ? 'Generating...' : 'Generate Labels'}
//                         </Button>
//                     ) : null}
//                 </div>
//             ),
//         },
//     ];

//     async function downloadCSV() {
//         getImportHistory({
//             isCsv: true,
//             csvLabel: importTypeTitle?.replaceAll(' ', '_'),
//             importType,
//         });
//     }

//     return (
//         <PageLoader isLoading={isLoading}>
//             <div className="space-y-4 p-4">
//                 <div className="flex items-center justify-between">
//                     <h2 className="text-lg font-semibold capitalize">{importTypeTitle?.toLowerCase()}</h2>
//                     <ExportSheets downloadCSV={downloadCSV} />
//                 </div>

//                 <DataTable
//                     query={query}
//                     data={importHistory?.data?.rows || []}
//                     columns={columns}
//                     pagination={pagination}
//                     setPagination={setPagination}
//                     totalRowCount={totalRowCount}
//                 />

//                 <StockPrintLabels open={openPrint} onClose={() => setOpenPrint(false)} labels={printData} />
//             </div>
//         </PageLoader>
//     );
// }
// import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Printer } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { StockPrintLabelItem, StockPrintLabels } from '@/components/custom-components/print-labels';
import {
    ImportHistoryDetails,
    ImportHistoryTypesType,
    useGetImportHistory,
    FilterProps,
    getImportHistory,
} from '@/api-queries/import-history';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { type ColumnDef } from '@tanstack/react-table';
import ExportSheets from '@/components/export-sheets';
import { DataTable } from '@/components/dynamic-table/data-table';
import { Button } from '@/components/ui/button';
import { useGenerateImportBatchLabels } from '@/api-queries/barcode';

export interface ImportHistoryProps {
    importType: ImportHistoryTypesType;
    isPrintLabel?: boolean;
}

export default function ImportHistory({ importType, isPrintLabel = false }: ImportHistoryProps) {
    const importTypeTitle =
        importType === "SIMPLE_PRICING"
            ? "Markup Pricing Import History"
            : `${importType?.replaceAll("_", " ")} IMPORT HISTORY`;
    const router = useRouter();

    const [openPrint, setOpenPrint] = useState(false);
    const [printData, setPrintData] = useState<StockPrintLabelItem[]>([]);

    const [showLabelModal, setShowLabelModal] = useState(false);
    const [selectedImportBatchId, setSelectedImportBatchId] = useState<string | null>(null);
    const [labelTemplateId, setLabelTemplateId] = useState<string>('65eaba4e-0094-4062-aa9c-ec286049c225');
    const [numberOfCopies, setNumberOfCopies] = useState<number>(1);

    const formatDate = (date?: string | null) => {
        if (!date) return "-";

        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        }).format(new Date(date));
    };

    const testData = [
        {
            code: '3003',
            description: 'Cheese | Kg - Variable Weighted',
            price: 62.4,
            company: 'Demo Company',
        },
        {
            code: 'CREAMSODA12',
            description: 'Cream Soda Single Can',
            price: 6.24,
            company: 'Demo Company',
        },
        {
            code: 'CREAMSODA113',
            description: 'Milk 1L Full Cream',
            price: 3.5,
            company: 'Demo Company',
        },
        {
            code: '21213',
            description: 'Brown Bread Large',
            price: 2.75,
            company: 'Demo Company',
        },
        {
            code: '232323',
            description: 'Butter 500g Salted',
            price: 4.8,
            company: 'Demo Company',
        },
        {
            code: '3231231',
            description: 'Eggs Tray (12 pcs)',
            price: 5.4,
            company: 'Demo Company',
        },
        {
            code: '2003',
            description: 'Cheese | Kg - Variable Weighted',
            price: 62.4,
            company: 'Demo Company',
        },
        {
            code: 'CREAMSODA',
            description: 'Cream Soda Single Can',
            price: 6.24,
            company: 'Demo Company',
        },
        {
            code: '1001',
            description: 'Milk 1L Full Cream',
            price: 3.5,
            company: 'Demo Company',
        },
        {
            code: '1002',
            description: 'Brown Bread Large',
            price: 2.75,
            company: 'Demo Company',
        },
        {
            code: '1003',
            description: 'Butter 500g Salted',
            price: 4.8,
            company: 'Demo Company',
        },
        {
            code: '1004',
            description: 'Eggs Tray (12 pcs)',
            price: 5.4,
            company: 'Demo Company',
        },
        {
            code: '1005',
            description: 'Orange Juice 1L',
            price: 4.2,
            company: 'Demo Company',
        },
        {
            code: '1006',
            description: 'Chicken Breast | Kg',
            price: 9.6,
            company: 'Demo Company',
        },
        {
            code: '1007',
            description: 'Rice Basmati 5Kg',
            price: 18.9,
            company: 'Demo Company',
        },
        {
            code: '1008',
            description: 'Sugar 1Kg',
            price: 1.9,
            company: 'Demo Company',
        },
        {
            code: '1009',
            description: 'Salt 1Kg',
            price: 0.9,
            company: 'Demo Company',
        },
        {
            code: '1010',
            description: 'Potato | Kg',
            price: 1.5,
            company: 'Demo Company',
        },
        {
            code: '1011',
            description: 'Onion | Kg',
            price: 1.8,
            company: 'Demo Company',
        },
        {
            code: '1012',
            description: 'Tomato | Kg',
            price: 2.2,
            company: 'Demo Company',
        },
        {
            code: '1013',
            description: 'Coca Cola 1.5L Bottle',
            price: 3.25,
            company: 'Demo Company',
        },
    ];

    const initialFilters = {
        importType,
    };

    const { pagination, setPagination } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetImportHistory({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        importType,
    });
    const { data: importHistory, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const generateLabelsMutation = useGenerateImportBatchLabels();

    const columns: ColumnDef<ImportHistoryDetails>[] = [
        {
            accessorKey: 'taxRatePercent',
            header: 'Imported By',
            cell: ({ row }) => {
                const createdBy = row.original.createdBy?.name;
                return <div>{createdBy}</div>;
            },
        },
        {
            accessorKey: 'createdAt',
            header: 'Date & Time',
            cell: ({ row }) => {
                const createdAt = row.original.createdAt;
                return <div>{moment(createdAt).format('DD MMM, YYYY - hh:mm A')}</div>;
            },
        },
        {
            accessorKey: 'fileName',
            header: 'File Name',
            cell: ({ row }) => {
                const fileName = row.original.fileName;
                return <div>{fileName}</div>;
            },
        },

        {
            accessorKey: 'totalRows',
            header: 'Import Results',
            cell: ({ row }) => {
                const status = row.original;
                return (
                    <div className="flex gap-2">
                        <Badge className="bg-green-100 text-green-700">{status.validRows}</Badge>
                        <Badge className="bg-red-100 text-red-700">{status.invalidRows}</Badge>
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status ?? '';
                console.log("status",status)

                const statusStyles: Record<string,string> = {
                    COMPLETE: 'bg-green-100 text-green-700',
                    PENDING: 'bg-yellow-100 text-yellow-700',
                    FAILED: 'bg-red-100 text-red-700',
                    PROCESSING: 'bg-blue-100 text-blue-700',
                    CANCELLED: 'bg-gray-100 text-gray-700',
                };

                return (
                    <Badge
                        className={`${
                            statusStyles[status] || 'bg-gray-100 text-gray-700'
                        }`}
                    >
                        {status}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "startedAt",
            header: "Started At",
            cell: ({ row }) => {
                return formatDate(row.original.createdAt);
            },
        },
        {
            accessorKey: "completedAt",
            header: "Completed At",
            cell: ({ row }) => {
                return formatDate(row.original.completedAt);
            },
        },
        {
            accessorKey: 'errorMessage',
            header: 'Error',
            cell: ({ row }) => {
                return (
                    <div>{row.original.errorMessage || "-"}</div>
                );
            },
        },
        {
            accessorKey: 's3FileUrl',
            header: 'Download',
            cell: ({ row }) => {
                return (
                    <Button size="sm" variant="outline" asChild>
                        <a href={row.original.s3FileUrl} download>
                            <Download className="mr-1 h-4 w-4" />
                            Sheet
                        </a>
                    </Button>
                );
            },
        },

        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button size="sm" onClick={() => router.push(`${router.route}/${row.original.id}`)}>
                        <Eye className="mr-1 h-4 w-4" />
                        Details
                    </Button>

                    {isPrintLabel ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setSelectedImportBatchId(row.original.id);
                                setLabelTemplateId('65eaba4e-0094-4062-aa9c-ec286049c225');
                                setNumberOfCopies(2);
                                setShowLabelModal(true);
                            }}
                        >
                            <Printer className="mr-1 h-4 w-4" />
                            Generate Labels
                        </Button>
                    ) : null}
                </div>
            ),
        },
    ];

    async function downloadCSV() {
        getImportHistory({
            isCsv: true,
            csvLabel: importTypeTitle?.replaceAll(' ', '_'),
            importType,
        });
    }

//     const printPDFViaElectron = async (
//     pdfUrl: string,
//     copies: number = 1,
//     deviceName?: string
// ) => {
//     try {
//         const result = await (window as any).electronAPI.printPdfFromUrl({
//             url: pdfUrl,
//             deviceName,
//             copies,
//             silent: true,
//         });

//         if (result) {
//             alert("Labels sent to printer successfully!");
//         } else {
//             alert("Print failed.");
//         }
//     } catch (error) {
//         console.error("Print error:", error);
//         alert("Failed to print. Please check console.");
//     }
// };

const printZPLViaElectron = async (zpl:any, copies = 1) => {
    //@ts-ignore
    if (!window?.electronAPI?.printLabel) {
        console.error("Electron print bridge not available");
        alert("Printing is only available in the desktop app");
        return false;
    }

    try {
        //@ts-ignore
        const success = await window.electronAPI.printLabel({
            type: "zpl",
            zpl,
            copies,
            silent: true,
        });

        if (!success) {
            alert("Print job failed. Please check the printer connection.");
        }

        return success;
    } catch (err) {
        console.error("printZPLViaElectron error:", err);
        alert("Failed to send print job.");
        return false;
    }
};

    const handleGenerateLabels = async () => {
    if (!selectedImportBatchId || !labelTemplateId) {
        alert("Label Template ID is required");
        return;
    }

    try {
        const response = await generateLabelsMutation.mutateAsync({
            importBatchId: selectedImportBatchId,
            labelTemplateId: labelTemplateId,
            numberOfCopies: numberOfCopies,
        });

        // pull zpl string out of the response instead of a pdf url
        const zplData = response?.zpl ;

        if (zplData) {
            await printZPLViaElectron(zplData, numberOfCopies);
        } else {
            alert("Generated successfully but no ZPL data returned");
        }
    } catch (error) {
        console.error("Failed to generate labels:", error);
        alert("Failed to generate labels. Please try again.");
    } finally {
        setShowLabelModal(false);
    }
};

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold capitalize">{importTypeTitle?.toLowerCase()}</h2>
                    <ExportSheets downloadCSV={downloadCSV} />
                </div>

                <DataTable
                    query={query}
                    data={importHistory?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                />

                <StockPrintLabels open={openPrint} onClose={() => setOpenPrint(false)} labels={printData} />

                {showLabelModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-xl font-semibold mb-4">Generate Import Batch Labels</h3>
                            
                            <div className="space-y-4">
                                {/* <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Label Template ID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter Label Template ID"
                                        value={labelTemplateId}
                                        onChange={(e) => setLabelTemplateId(e.target.value)}
                                    />
                                </div> */}

                                <div>
                                    <label className="block text-sm font-medium mb-1">Number of Copies</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={numberOfCopies}
                                        onChange={(e) => setNumberOfCopies(Math.max(1, parseInt(e.target.value) || 1))}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowLabelModal(false)}
                                    disabled={generateLabelsMutation.isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleGenerateLabels}
                                    disabled={generateLabelsMutation.isPending || !labelTemplateId.trim()}
                                >
                                    {generateLabelsMutation.isPending ? 'Generating...' : 'Generate & Print'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PageLoader>
    );
}