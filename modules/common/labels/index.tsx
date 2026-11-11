import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Printer, FileText } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import moment from 'moment';

import {
    useGetAllLabelTemplates,
    useDeleteLabelTemplate,
    usePreviewLabel,
    usePrintLabel,
    useUpdateLabelTemplate,
    usePrintLabelByBarcode,
    usePrintUpdatedLabels,
    type PrintByBarcodePayload,
    type PrintUpdatedLabelsPayload,
    LabelTemplate,
    LabelType,
    LabelStatus,
} from '@/api-queries/barcode';
import { useDebounce } from '../hooks/usedebounce';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import LabelTemplateForm from './label-template-form';
import BarcodeScanner from '../hoc/bar-code-scanner';
import { toast } from 'sonner';

type ViewMode = 'list' | 'form';
type DateFilter = 'lastday' | 'lastweek' | 'lastmonth' | 'custom';

const LabelTemplates = () => {
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [copies, setCopies] = useState(1);
    const [actionLoading, setActionLoading] = useState<
        'preview' | 'print' | 'barcode-print' | 'updated-print' | null
    >(null);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const initialFilters = {
        search: '',
        labelType: '' as LabelType | '',
        status: '' as LabelStatus | '',
    };

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<typeof initialFilters>(initialFilters);
        const debouncedSearchTerm = useDebounce(filters.search || '', 500);

    const query = useGetAllLabelTemplates(
        {
            search: debouncedSearchTerm || undefined,
            labelType: appliedFilters.labelType || undefined,
            status: appliedFilters.status || undefined,
        },
        true
    );

    const { data: templatesData, isLoading } = query;
    const totalRowCount = templatesData?.count || 0;

    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const deleteMutation = useDeleteLabelTemplate();
    const previewMutation = usePreviewLabel();
    const printMutation = usePrintLabel();
    const updateMutation = useUpdateLabelTemplate();
    const printByBarcodeMutation = usePrintLabelByBarcode();
    const printUpdatedLabelsMutation = usePrintUpdatedLabels();

    const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    // Stock Modal States
    const [stockPagination, setStockPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [isStockPageLoading, setIsStockPageLoading] = useState(false);

    const { data: stockList, isLoading: isStockLoading } = useCompanyStockDetailsList({
        limit: stockPagination.pageSize,
        offset: stockPagination.pageIndex * stockPagination.pageSize + 1,
    });

    const stockTotalCount = stockList?.data?.count || 0;
    const stockRows = stockList?.data?.rows || [];
    const totalStockPages = Math.ceil(stockTotalCount / stockPagination.pageSize) || 1;

    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
    const [pendingAction, setPendingAction] = useState<{
        type: 'preview' | 'print' | null;
        template: LabelTemplate | null;
    }>({
        type: null,
        template: null,
    });

    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Print Updated Labels States
    const [showUpdatedPrintModal, setShowUpdatedPrintModal] = useState(false);
    const [selectedTemplateForUpdate, setSelectedTemplateForUpdate] = useState<string>('');
    const [updatedCopies, setUpdatedCopies] = useState(1);
    const [dateFilter, setDateFilter] = useState<DateFilter>('lastday');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Printer Management (Updated for electronAPI)
    const [printers, setPrinters] = useState<any[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<string>("");
    const [loadingPrinters, setLoadingPrinters] = useState(false);

    useEffect(() => {
        const savedPrinter = localStorage.getItem('defaultLabelPrinter');
        if (savedPrinter) setSelectedPrinter(savedPrinter);
    }, []);

    const fetchPrinters = async () => {
        setLoadingPrinters(true);
        try {
            //@ts-ignore
            if (window.electronAPI?.getPrinters) {
                //@ts-ignore
                const availablePrinters = await window.electronAPI.getPrinters();
                setPrinters(availablePrinters);
                
                const saved = localStorage.getItem('defaultLabelPrinter');
                if (saved && availablePrinters.some((p: any) => p.name === saved)) {
                    setSelectedPrinter(saved);
                }
            } else {
                console.warn("Electron getPrinters not available");
            }
        } catch (error) {
            console.error("Failed to fetch printers:", error);
        } finally {
            setLoadingPrinters(false);
        }
    };

    const handlePrinterChange = (printerName: string) => {
        setSelectedPrinter(printerName);
        localStorage.setItem('defaultLabelPrinter', printerName);
    };

    useEffect(() => {
        fetchPrinters();
    }, []);

    // Date Filter Handler
    const handleDateFilterChange = (filter: DateFilter) => {
        setDateFilter(filter);
        const today = moment();

        switch (filter) {
            case 'lastday':
                setStartDate(today.clone().subtract(1, 'day').format('YYYY-MM-DD'));
                setEndDate(today.format('YYYY-MM-DD'));
                break;
            case 'lastweek':
                setStartDate(today.clone().subtract(1, 'week').format('YYYY-MM-DD'));
                setEndDate(today.format('YYYY-MM-DD'));
                break;
            case 'lastmonth':
                setStartDate(today.clone().subtract(1, 'month').format('YYYY-MM-DD'));
                setEndDate(today.format('YYYY-MM-DD'));
                break;
            case 'custom':
                break;
        }
    };

    const columns: ColumnDef<LabelTemplate>[] = [
        {
            accessorKey: 'name',
            header: (data) => (
                <TableHeaderToggle {...data}>Template Name</TableHeaderToggle>
            ),
            cell: ({ row }) => (
                <div className="font-medium">{row.original.name}</div>
            ),
        },
        {
            accessorKey: 'labelType',
            header: (data) => (
                <TableHeaderToggle {...data}>Label Type</TableHeaderToggle>
            ),
            cell: ({ row }) => (
                <div className="uppercase">{row.original.labelType}</div>
            ),
        },
        {
            accessorKey: 'pricingTypeId',
            header: 'Pricing Type',
            cell: ({ row }) => (
                <div className="text-xs text-muted-foreground">
                    {row.original.CompanyStockPricingType?.name}
                </div>
            ),
        },
        {
            accessorKey: 'paperSize',
            header: 'Paper Size (mm)',
            cell: ({ row }) => (
                <div>
                    {Number(row.original.paperWidth).toFixed(0)} ×{' '}
                    {Number(row.original.paperHeight).toFixed(0)}
                </div>
            ),
        },
        {
            id: 'elements',
            header: 'Elements',
            cell: ({ row }) => {
                const count = row.original.templateJson?.elements?.length || 0;
                return (
                    <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                        {count} elements
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const template = row.original;
                return (
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(template)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handlePrint(template)}>
                            <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                            <FileText className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const handlePreview = (template: LabelTemplate) => {
        setCopies(1);
        setPendingAction({ type: 'preview', template });
        setStockModalOpen(true);
    };

    const handlePrint = (template: LabelTemplate) => {
        setCopies(1);
        setPendingAction({ type: 'print', template });
        setStockModalOpen(true);
    };

// const printPDF = async (printData: any, copies: number = 1) => {
//     try {
//         const isElectron = !!window.electronAPI;
//         const systemMode = localStorage.getItem('systemMode') || 'online';
//         const isOnlineMode = systemMode === 'online';

//         // === Extract real data (handle Axios/React Query wrapper) ===
//         let actualData = printData;
//         console.log("actual data",actualData)
//         if (printData?.data) {
//             actualData = printData.data;           // Axios response
//         } else if (printData?.payload?.data) {
//             actualData = printData.payload.data;
//         }

//         console.log("🔍 Print Debug:", { 
//             isElectron, 
//             systemMode, 
//             isOnlineMode,
//             hasDataWrapper: !!printData?.data,
//             actualDataSuccess: actualData?.success,
//             pdfUrl: actualData?.pdfUrl
//         });

//         // Parse actual data
//         let pdfUrl: string | null = null;
//         let zplData: string | null = null;

//         if (typeof actualData === 'object' && actualData !== null) {
//             if (actualData.success === true) {
//                 pdfUrl = actualData.pdfUrl || null;
//                 zplData = actualData.zpl || null;
//             }
//         } else if (typeof actualData === 'string') {
//             pdfUrl = actualData;
//         }

//         console.log("📄 Final extracted pdfUrl:", pdfUrl);

//         // 1. ZPL - Electron + Online
//         if (isElectron && isOnlineMode && zplData && 
//             (window.electronAPI?.printLabel || window.electronAPI?.printZpl)) {
            
//             console.log("🖨️ Using ZPL direct print");
//             const apiCall = window.electronAPI.printLabel || window.electronAPI.printZpl;
//             const success = await apiCall({
//                 type: "zpl",
//                 zpl: zplData,
//                 deviceName: selectedPrinter || undefined,
//                 copies,
//                 silent: true,
//             });

//             if (success) {
//                 toast.success(`Printed ${copies} label(s) via ZPL`);
//                 return;
//             }
//         }

//         // 2. PDF
//         if (pdfUrl) {
//             if (isElectron && window.electronAPI?.printPdf) {
//                 console.log("📄 Electron PDF print");
//                 const success = await window.electronAPI.printPdf({
//                     type: "pdf-url",
//                     url: pdfUrl,
//                     deviceName: selectedPrinter || undefined,
//                     copies,
//                     silent: true,
//                 });
//                 if (success) toast.success("Print job sent successfully!");
//                 else toast.error("Print failed.");
//             } 
//             else if (isOnlineMode) {
//                 console.log("🌐 Opening PDF in browser:", pdfUrl);
//                 const newTab = window.open(pdfUrl, "_blank");

//                 if (newTab) {
//                     toast.info("PDF opened in new tab. Use Ctrl+P to print.", { duration: 6000 });
//                 } else {
//                     toast.warning("Popup blocked. Please allow popups.");
//                 }
//             }
//         } else {
//             console.warn("❌ No pdfUrl found even after unwrapping");
//             toast.error("No PDF URL received from server.");
//         }
//     } catch (error) {
//         console.error("Print error:", error);
//         toast.error("Failed to process print job");
//     }
// };
// const printPDF = async (printData: any, copies: number = 1) => {
//     try {
//         const isElectron = !!window.electronAPI;
//         const systemMode = localStorage.getItem('systemMode') || 'online';
//         const isOnlineMode = systemMode === 'online';

//         console.log("🔍 Print Debug:", { 
//             systemMode, 
//             isOnlineMode,
//             isElectron,
//             responseType: printData?.constructor?.name || typeof printData
//         });

//         let pdfUrl: string | null = null;
//         let zplData: string | null = null;
//         let blobToPrint: Blob | null = null;

//         // === Extract response data (handle multiple possible wrappers) ===
//         let response = printData;

//         if (printData?.data) response = printData.data;           // Axios wrapper
//         else if (printData?.payload?.data) response = printData.payload.data;

//         // Handle direct Blob (some mutations return Blob directly)
//         if (printData instanceof Blob) {
//             blobToPrint = printData;
//         } else if (response instanceof Blob) {
//             blobToPrint = response;
//         }

//         // Handle JSON response (most common case)
//         if (response?.success === true) {
//             pdfUrl = response.pdfUrl || null;
//             zplData = response.zpl || null;           // ← Important field
//         }

//         console.log("📄 Extracted:", { 
//             hasPdfUrl: !!pdfUrl, 
//             hasZpl: !!zplData, 
//             hasBlob: !!blobToPrint 
//         });

//         // ====================== ONLINE MODE ======================
//         if (isOnlineMode && isElectron && zplData) {
//             console.log("🖨️ ONLINE MODE → Using ZPL for thermal printer");

//             const apiCall = window.electronAPI.printLabel || window.electronAPI.printZpl;

//             if (apiCall) {
//                 const success = await apiCall({
//                     type: "zpl",
//                     zpl: zplData,
//                     deviceName: selectedPrinter || undefined,
//                     copies,
//                     silent: true,
//                     dpi: response.zplDpi || 203,        // optional
//                 });

//                 if (success) {
//                     toast.success(`Successfully printed ${copies} label(s) via ZPL`);
//                     return;
//                 }
//             }
//         }

//         // ====================== OFFLINE MODE or Fallback ======================
//         // Use Blob if available, otherwise use pdfUrl
//         if (blobToPrint) {
//             pdfUrl = URL.createObjectURL(blobToPrint);
//             console.log("📦 Using Blob → Object URL created");
//         }

//         if (pdfUrl) {
//             console.log("📄 Printing PDF:", isElectron ? "via Electron" : "via Browser");

//             if (isElectron && window.electronAPI?.printPdf) {
//                 const success = await window.electronAPI.printPdf({
//                     type: "pdf-url",
//                     url: pdfUrl,
//                     deviceName: selectedPrinter || undefined,
//                     copies,
//                     silent: true,
//                 });

//                 if (success) {
//                     toast.success(`Printed ${copies} label(s) via PDF`);
//                 } else {
//                     toast.error("Failed to send PDF to printer");
//                 }
//             } else {
//                 // Browser fallback
//                 const newTab = window.open(pdfUrl, "_blank");
//                 if (newTab) {
//                     toast.info("PDF opened in new tab. Use Ctrl+P to print.", { duration: 7000 });
//                 } else {
//                     toast.warning("Popup blocked. Please allow popups for printing.");
//                 }
//             }
//         } else {
//             toast.error("No printable content (ZPL or PDF) received from server.");
//         }
//     } catch (error) {
//         console.error("Print error:", error);
//         toast.error("Failed to process print job");
//     }
// };
const printPDF = async (printData: any, copies: number = 1) => {
    try {
        let response = printData;

        if (printData?.data) response = printData.data;
        else if (printData?.payload?.data) response = printData.payload.data;

        if (response instanceof Blob) {
            const text = await response.text();
            try {
                response = JSON.parse(text);
            } catch (e) {}
        }

        const zplData = response?.zpl;

        if (!zplData) {
            toast.error("No ZPL data received from server.");
            return;
        }
        //@ts-ignore
        if (!window.electronAPI?.printLabel && !window.electronAPI?.printZpl) {
            toast.error("Printer not available. Please use Electron desktop app.");
            return;
        }
        //@ts-ignore
        const apiCall = window.electronAPI.printLabel ;

        const success = await apiCall({
            type: "zpl",
            zpl: zplData,
            deviceName: selectedPrinter || undefined,
            copies,
            silent: true,
            dpi: response.zplDpi || 203,
        });

        if (success) {
            toast.success(`Successfully printed ${copies} label(s) via ZPL`);
        } else {
            toast.error("Failed to print via ZPL");
        }
    } catch (error) {
        console.error("Print error:", error);
        toast.error("Failed to process print job");
    }
};
const handlePrintUpdatedLabels = async () => {
    if (!selectedTemplateForUpdate) {
        toast.error("Please select a template");
        return;
    }

    if (!startDate || !endDate) {
        toast.error("Please select date range");
        return;
    }

    setActionLoading("updated-print");

    const payload: PrintUpdatedLabelsPayload = {
        templateId: selectedTemplateForUpdate,
        copies: updatedCopies,
        startDate,
        endDate,
    };

    printUpdatedLabelsMutation.mutate(payload, {
        onSuccess: async (data) => {
            try {
                console.log("Print Updated Labels Response:", data);
                await printPDF(data, updatedCopies);   // Pass full response
            } catch (err) {
                console.error("Failed to process print response:", err);
                toast.error("Failed to process print job");
            }
        },

        onError: (error: any) => {
            console.error("Print Updated Labels Error:", error);

            const errorMsg =
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                error?.message ||
                "";

            if (errorMsg.includes("No updated labels found") || error?.response?.status === 400) {
                toast.error("No updates available for the selected criteria.");
            } else {
                toast.error("Failed to print updated labels. Please try again.");
            }
        },

        onSettled: () => {
            setActionLoading(null);
            setShowUpdatedPrintModal(false);
            setSelectedTemplateForUpdate("");
            setUpdatedCopies(1);
            setDateFilter("lastday");
        },
    });
};

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode?.trim()) return;

    try {
        setActionLoading('barcode-print');

        const payload: PrintByBarcodePayload = {
            barcode: barcode.trim(),
        };

        const response = await printByBarcodeMutation.mutateAsync(payload);
        
        // Pass the full response (could be Blob or JSON)
        await printPDF(response);

    } catch (error) {
        console.error('Failed to print label by barcode:', error);
        toast.error(`Failed to print label for barcode: ${barcode}`);
    } finally {
        setActionLoading(null);
    }
};

const handleConfirmStockAction = async () => {
    if (!pendingAction.template) return;

    const payload = {
        templateId: pendingAction.template.id,
        companyStockDetailIds: selectedStocks,
    };

    try {
        setActionLoading(pendingAction.type);

        if (pendingAction.type === 'preview') {
            const blob = await previewMutation.mutateAsync(payload);
            const previewUrl = URL.createObjectURL(blob);
            setPreviewData(previewUrl);
            setShowPreviewModal(true);
        }

        if (pendingAction.type === 'print') {
            const response = await printMutation.mutateAsync({
                ...payload,
                copies,
            });

            // Let printPDF handle everything (ZPL in online, PDF in offline)
            console.log("response",response)
            await printPDF(response, copies);
        }
    } catch (error) {
        console.error("Stock action error:", error);
        toast.error("Failed to process label action");
    } finally {
        setActionLoading(null);
        setStockModalOpen(false);
        setSelectedStocks([]);
        setCopies(1);
        setPendingAction({ type: null, template: null });
        setStockPagination({ pageIndex: 0, pageSize: 10 });
    }
};

    const handleEdit = (template: LabelTemplate) => {
        setSelectedTemplate(template);
        setShowForm(true);
        setViewMode('form');
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this label template?')) {
            deleteMutation.mutate({ id });
        }
    };

    const handleAddNew = () => {
        setSelectedTemplate(null);
        setShowForm(true);
        setViewMode('form');
    };

    const onFormClose = async (refresh = false) => {
        setShowForm(false);
        setSelectedTemplate(null);
        setViewMode('list');

        if (refresh) {
            await query.refetch();
        }
    };

    const closePreview = () => {
        if (previewData) {
            URL.revokeObjectURL(previewData);
            setPreviewData(null);
        }
        setShowPreviewModal(false);
    };

    const handleStockPageChange = (newPageIndex: number) => {
        if (newPageIndex < 0 || newPageIndex >= totalStockPages) return;
        
        setIsStockPageLoading(true);
        setStockPagination(prev => ({ ...prev, pageIndex: newPageIndex }));
        
        setTimeout(() => {
            setIsStockPageLoading(false);
        }, 250);
    };

    return (
        <PageLoader isLoading={isLoading}>
            {viewMode === 'list' && (
                <div className="space-y-4 px-2">
                    <div className="flex justify-between items-center">
                        <div className="text-lg font-bold">Label Templates</div>
                        
                        <div className="flex items-center gap-3">
                            <div className="text-sm">Printer:</div>
                            <select
                                value={selectedPrinter}
                                onChange={(e) => handlePrinterChange(e.target.value)}
                                className="border rounded px-3 py-1 text-sm"
                                disabled={loadingPrinters}
                            >
                                <option value="">-- Select Printer --</option>
                                {printers.map((printer: any, index: number) => (
                                    <option key={index} value={printer.name}>
                                        {printer.name} {printer.isDefault ? '(Default)' : ''}
                                    </option>
                                ))}
                            </select>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={fetchPrinters}
                                disabled={loadingPrinters}
                            >
                                {loadingPrinters ? 'Refreshing...' : 'Refresh Printers'}
                            </Button>
                        </div>
                    </div>

                    <DataTable
                        query={query}
                        data={templatesData?.data || []}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={totalRowCount}
                    >
                        <div className="flex justify-between items-center">
                            <Input
                                className='w-44'
                                placeholder="Search template..."
                                value={filters.search || ''}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        search: e.target.value,
                                    }))
                                }
                                // onKeyDown={(e) => {
                                //     if (e.key === 'Enter') {
                                //         handleFilters?.();        // ← This is often needed
                                //     }
                                // }}
                            />

                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        setShowUpdatedPrintModal(true);
                                        handleDateFilterChange('lastday');
                                    }}
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print Updated Labels
                                </Button>

                                <Button onClick={handleAddNew}>
                                    <Plus className="h-4 w-4" />
                                    New Template
                                </Button>
                            </div>
                        </div>
                    </DataTable>

                    <BarcodeScanner 
                        onScan={handleBarcodeScan} 
                        active={true} 
                    />
                </div>
            )}

            {viewMode === 'form' && (
                <div className="p-4">
                    <LabelTemplateForm
                        editingTemplate={selectedTemplate}
                        open={true}
                        onClose={(refresh?: boolean) => {
                            setSelectedTemplate(null);
                            setViewMode('list');

                            if (refresh) {
                                query.refetch();
                            }
                        }}
                    />
                </div>
            )}

            {/* Stock Selection Modal - unchanged */}
            {stockModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-[480px] max-h-[85vh] flex flex-col">
                        <h2 className="font-bold text-xl mb-4">Select Stock Items</h2>

                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                            <div className="max-h-[320px] overflow-auto space-y-2 pr-2 border rounded-md p-3 bg-gray-50 relative flex-1">
                                {(isStockLoading || isStockPageLoading) ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p className="text-sm text-muted-foreground">Loading stock items...</p>
                                        </div>
                                    </div>
                                ) : (
                                    stockRows.map((stock: any) => (
                                        <label 
                                            key={stock.id} 
                                            className="flex gap-2 items-center p-2 hover:bg-white rounded border bg-white"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStocks.includes(stock.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedStocks((p) => [...p, stock.id]);
                                                    } else {
                                                        setSelectedStocks((p) =>
                                                            p.filter((id) => id !== stock.id)
                                                        );
                                                    }
                                                }}
                                            />
                                            <span className="text-sm">{stock.description}</span>
                                        </label>
                                    ))
                                )}

                                {!isStockLoading && !isStockPageLoading && stockRows.length === 0 && (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-center text-muted-foreground">
                                            No stock items found
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between border-t pt-4 mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Page <span className="font-medium text-foreground">{stockPagination.pageIndex + 1}</span> of {totalStockPages}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-muted-foreground">
                                        {stockRows.length} of {stockTotalCount} items
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleStockPageChange(stockPagination.pageIndex - 1)}
                                            disabled={stockPagination.pageIndex === 0 || isStockPageLoading}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleStockPageChange(stockPagination.pageIndex + 1)}
                                            disabled={
                                                stockPagination.pageIndex + 1 >= totalStockPages || 
                                                isStockPageLoading
                                            }
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {pendingAction.type === 'print' && (
                            <div className="space-y-2 mt-4">
                                <label className="text-sm font-medium">
                                    Number of Copies
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={copies}
                                    onChange={(e) =>
                                        setCopies(
                                            Math.max(
                                                1,
                                                Number(e.target.value) || 1
                                            )
                                        )
                                    }
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setStockModalOpen(false);
                                    setSelectedStocks([]);
                                    setStockPagination({ pageIndex: 0, pageSize: 10 });
                                }}
                            >
                                Cancel
                            </Button>

                            <Button 
                                onClick={handleConfirmStockAction}
                                disabled={selectedStocks.length === 0 || actionLoading !== null}
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        {actionLoading === 'preview'
                                            ? 'Generating Preview...'
                                            : 'Preparing Print...'}
                                    </>
                                ) : (
                                    `Confirm (${selectedStocks.length} selected)`
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Updated Labels Modal */}
            {showUpdatedPrintModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-[460px] space-y-5">
                        <h2 className="font-bold text-xl">Print Updated Labels</h2>

                        <div className="space-y-4">
                            <div>
                                <Label>Template</Label>
                                <Select value={selectedTemplateForUpdate} onValueChange={setSelectedTemplateForUpdate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templatesData?.data?.map((template: LabelTemplate) => (
                                            <SelectItem key={template.id} value={template.id}>
                                                {template.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Number of Copies</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={updatedCopies}
                                    onChange={(e) => setUpdatedCopies(Math.max(1, Number(e.target.value) || 1))}
                                />
                            </div>

                            <div>
                                <Label>Date Range</Label>
                                <Select value={dateFilter} onValueChange={(val: DateFilter) => handleDateFilterChange(val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lastday">Last Day</SelectItem>
                                        <SelectItem value="lastweek">Last Week</SelectItem>
                                        <SelectItem value="lastmonth">Last Month</SelectItem>
                                        <SelectItem value="custom">Custom Range</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {dateFilter === 'custom' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label>Start Date</Label>
                                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <Label>End Date</Label>
                                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setShowUpdatedPrintModal(false)}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handlePrintUpdatedLabels}
                                disabled={!selectedTemplateForUpdate || !startDate || !endDate || actionLoading !== null}
                            >
                                {actionLoading === 'updated-print' ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Printing...
                                    </>
                                ) : (
                                    'Print Updated Labels'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showPreviewModal && previewData && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl h-[90vh] rounded-lg shadow-xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="font-semibold text-lg">Label Preview</h2>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => printPDF(previewData)}
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print
                                </Button>
                                <Button variant="outline" onClick={closePreview}>
                                    Close
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 p-4 bg-gray-50 overflow-auto">
                            <iframe
                                src={previewData}
                                className="w-full h-full border rounded-lg bg-white min-h-[600px]"
                                title="Label Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </PageLoader>
    );
};

export default LabelTemplates;