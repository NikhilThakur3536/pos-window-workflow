// import { useState } from 'react';
// import { useGetReports, getReports, type FilterProps, type ReportsType, downloadCsvReport, getPdfReport } from '@/api-queries/reports';
// import { DataTable } from '@/components/dynamic-table/data-table';
// import { Button } from '@/components/ui/button';
// import { Download } from 'lucide-react';
// import useTableFilters from '@/components/list-only-table/use-table-filters';
// import { typeHandler, type TypeHandlerReturnType } from './report-utils';
// import { PageLoader } from '@/components/custom-components/PageLoader';
// import { Input } from '@/components/ui/input';
// import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
// import { SalesWiseStatsStrip } from './sales-wise-stats-strip';
// import TableDateFilter from '@/components/table/table-date-filter';

// const SalesReports = ({ type }: { type: ReportsType }) => {
//     const initialFilters = {
//         fromDate: '',
//         toDate: '',
//     };

//     const [showPreview, setShowPreview] = useState(false);
//     const [pdfUrl, setPdfUrl] = useState('');

//     const {
//         filters,
//         setFilters,
//         handleFilters,
//         clearFilters,
//         appliedFilters,
//         showClearButton,
//         pagination,
//         setPagination,
//     } = useTableFilters<FilterProps>({ ...initialFilters, sortBy: 'asc' });

//     const query = useGetReports({
//         label: type,
//         payload: {
//             limit: pagination.pageSize,
//             offset: pagination.pageIndex * pagination.pageSize,
//             ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
//             ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
//             ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
//             ...(appliedFilters?.sortBy ? { sortBy: appliedFilters?.sortBy } : {}),
//         },
//     });

//     const { data: reports, isLoading } = query;
//     const totalRowCount = query?.data?.count || 0;

//     const commonPayload = {
//         ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
//         ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
//         ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
//         ...(appliedFilters?.sortBy ? { sortBy: appliedFilters?.sortBy } : {}),
//     };

//     async function downloadCSV() {
//         await downloadCsvReport({
//             label: type,
//             payload: commonPayload,
//         });
//     }

//     async function previewPDF() {
//         try {
//             const blob = await getPdfReport({
//                 label: type,
//                 payload: commonPayload,
//             });

//             if (pdfUrl) {
//                 URL.revokeObjectURL(pdfUrl);
//             }

//             const url = URL.createObjectURL(blob);

//             setPdfUrl(url);

//             setShowPreview(true);
//         } catch (error) {
//             console.error(error);
//         }
//     }

//     const { columns, title }: TypeHandlerReturnType = typeHandler(type);

//     const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//         if (e.key === 'Enter') handleApplyFilters();
//     };

//     const handleClearSearch = () => {
//         clearFilters();
//     };

//     const handleApplyFilters = () => {
//         handleFilters(filters);
//     };

//     return (
//         <PageLoader isLoading={isLoading}>
//             <div className="space-y-2 p-3">
//                 <DataTable
//                     query={query}
//                     data={reports?.data || []}
//                     columns={columns}
//                     pagination={pagination}
//                     setPagination={setPagination}
//                     totalRowCount={totalRowCount}
//                 >
//                     {reports ? (
//                         <SalesWiseStatsStrip data={reports}>
//                             <h2 className="!m-0 !mb-2 text-2xl font-bold tracking-tight">
//                                 {title}-wise Sales
//                             </h2>

//                             <div>
//                                 <div className="flex w-full items-center gap-2">
//                                     <Input
//                                         placeholder={`Search by ${type?.replace('WiseSales', '')} name...`}
//                                         value={filters.search || ''}
//                                         onChange={(e) =>
//                                             setFilters({
//                                                 ...filters,
//                                                 search: e.target.value,
//                                             })
//                                         }
//                                         onKeyDown={handleKeyDown}
//                                         className="!max-w-sm"
//                                     />

//                                     <TableDateFilter
//                                         filters={filters}
//                                         setFilters={setFilters}
//                                     />

//                                     <FilterActionButtons
//                                         onApplyFilters={handleApplyFilters}
//                                         onClearClick={handleClearSearch}
//                                         showClearButton={showClearButton}
//                                     />

//                                     <div className="flex gap-2">
//                                         <Button
//                                             onClick={downloadCSV}
//                                             variant="outline"
//                                         >
//                                             <Download className="mr-2 h-4 w-4" />
//                                             CSV
//                                         </Button>

//                                         <Button
//                                             onClick={previewPDF}
//                                             variant="outline"
//                                         >
//                                             <Download className="mr-2 h-4 w-4" />
//                                             PDF
//                                         </Button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </SalesWiseStatsStrip>
//                     ) : null}
//                 </DataTable>
//             </div>

//             {showPreview && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//                     <div className="relative h-[90vh] w-[90vw] overflow-hidden rounded-xl bg-white shadow-xl">
                        
//                         <div className="flex items-center justify-between border-b p-4">
//                             <h2 className="text-lg font-semibold">
//                                 PDF Preview
//                             </h2>

//                             <div className="flex gap-2">
//                                 {/* <Button
//                                     variant="outline"
//                                     onClick={() => window.open(pdfUrl)}
//                                 >
//                                     Download
//                                 </Button> */}

//                                 <Button
//                                     variant="destructive"
//                                     onClick={() => {
//                                         setShowPreview(false);
//                                         URL.revokeObjectURL(pdfUrl);
//                                     }}
//                                 >
//                                     Close
//                                 </Button>
//                             </div>
//                         </div>

//                         <object
//                             data={pdfUrl}
//                             type="application/pdf"
//                             className="h-full w-full"
//                         >
//                             PDF preview not supported
//                         </object>
//                     </div>
//                 </div>
//             )}
//         </PageLoader>
//     );
// };

// export default SalesReports;
import { useState } from 'react';
import { useGetReports, type FilterProps, type ReportsType, downloadCsvReport, getPdfReport } from '@/api-queries/reports';
import { DataTable } from '@/components/dynamic-table/data-table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { typeHandler, type TypeHandlerReturnType } from './report-utils';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { SalesWiseStatsStrip } from './sales-wise-stats-strip';
import TableDateFilter from '@/components/table/table-date-filter';
import { useGetCompanies } from '@/api-queries/company-details';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { MultiSelect } from '@/components/ui/Multi-select';

const SalesReports = ({ type }: { type: ReportsType }) => {
    const initialFilters = {
        fromDate: '',
        toDate: '',
        companyIds: [] as string[],
        companyDebtorIds: [] as string[],
        warehouseIds: [] as string[],
    };

    const [showPreview, setShowPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<FilterProps>({ ...initialFilters, sortBy: 'asc' });

    const { data: companiesData } = useGetCompanies({ limit: 1000 });
    const { data: warehousesData } = useGetWarehouses({ limit: 1000 });
    console.log("warehouses",warehousesData)
    const { data: debtorsData } = useDebtorList({ limit: 1000 });

    const query = useGetReports({
        label: type,
        payload: {
            limit: pagination.pageSize,
            offset: pagination.pageIndex * pagination.pageSize,
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
            ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
            ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
            ...(appliedFilters?.sortBy ? { sortBy: appliedFilters?.sortBy } : {}),
            ...(appliedFilters?.companyIds?.length ? { companyIds: appliedFilters.companyIds } : {}),
            ...(appliedFilters?.companyDebtorIds?.length ? { companyDebtorIds: appliedFilters.companyDebtorIds } : {}),
            ...(appliedFilters?.warehouseIds?.length ? { warehouseIds: appliedFilters.warehouseIds } : {}),
        },
    });

    const { data: reports, isLoading } = query;
    const totalRowCount = query?.data?.count || 0;

    const commonPayload = {
        ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
        ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.sortBy ? { sortBy: appliedFilters?.sortBy } : {}),
        ...(appliedFilters?.companyIds?.length ? { companyIds: appliedFilters.companyIds } : {}),
        ...(appliedFilters?.companyDebtorIds?.length ? { companyDebtorIds: appliedFilters.companyDebtorIds } : {}),
        ...(appliedFilters?.warehouseIds?.length ? { warehouseIds: appliedFilters.warehouseIds } : {}),
    };

    async function downloadCSV() {
        await downloadCsvReport({
            label: type,
            payload: commonPayload,
        });
    }

    async function previewPDF() {
        try {
            const blob = await getPdfReport({
                label: type,
                payload: commonPayload,
            });

            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }

            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setShowPreview(true);
        } catch (error) {
            console.error(error);
        }
    }

    const { columns, title }: TypeHandlerReturnType = typeHandler(type);

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
            <div className="space-y-2 p-3">
                <DataTable
                    query={query}
                    data={reports?.data || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    {reports ? (
                        <SalesWiseStatsStrip data={reports}>
                            <h2 className="!m-0 !mb-2 text-2xl font-bold tracking-tight">
                                {title}-wise Sales
                            </h2>

                            <div className="flex w-full flex-wrap items-center gap-2">
                                <Input
                                    placeholder={`Search by ${type?.replace('WiseSales', '')} name...`}
                                    value={filters.search || ''}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            search: e.target.value,
                                        })
                                    }
                                    onKeyDown={handleKeyDown}
                                    className="!max-w-sm"
                                />

                                <TableDateFilter
                                    filters={filters}
                                    setFilters={setFilters}
                                />

                                <MultiSelect
                                    options={companiesData?.data?.map((c: any) => ({
                                        label: c.companyName,
                                        value: c.id,
                                    })) || []}
                                    value={filters.companyIds || []}
                                    onChange={(value) =>
                                        setFilters({ ...filters, companyIds: value })
                                    }
                                    placeholder="Select Companies"
                                />

                                <MultiSelect
                                    options={debtorsData?.data?.rows?.map((d: any) => ({
                                        label: d.name || d.accountNumber,
                                        value: d.id,
                                    })) || []}
                                    value={filters.companyDebtorIds || []}
                                    onChange={(value) =>
                                        setFilters({ ...filters, companyDebtorIds: value })
                                    }
                                    placeholder="Select Debtors"
                                />

                                <MultiSelect
                                    options={warehousesData?.data?.rows?.map((w: any) => ({
                                        label: w.description,
                                        value: w.id,
                                    })) || []}
                                    value={filters.warehouseIds || []}
                                    onChange={(value) =>
                                        setFilters({ ...filters, warehouseIds: value })
                                    }
                                    placeholder="Select Warehouses"
                                />

                                <FilterActionButtons
                                    onApplyFilters={handleApplyFilters}
                                    onClearClick={handleClearSearch}
                                    showClearButton={showClearButton}
                                />

                                <div className="flex gap-2">
                                    <Button onClick={downloadCSV} variant="outline">
                                        <Download className="mr-2 h-4 w-4" />
                                        CSV
                                    </Button>

                                    <Button onClick={previewPDF} variant="outline">
                                        <Download className="mr-2 h-4 w-4" />
                                        PDF
                                    </Button>
                                </div>
                            </div>
                        </SalesWiseStatsStrip>
                    ) : null}
                </DataTable>
            </div>

            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="relative h-[90vh] w-[90vw] overflow-hidden rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b p-4">
                            <h2 className="text-lg font-semibold">PDF Preview</h2>

                            <Button
                                variant="destructive"
                                onClick={() => {
                                    setShowPreview(false);
                                    URL.revokeObjectURL(pdfUrl);
                                }}
                            >
                                Close
                            </Button>
                        </div>

                        <object data={pdfUrl} type="application/pdf" className="h-full w-full">
                            PDF preview not supported
                        </object>
                    </div>
                </div>
            )}
        </PageLoader>
    );
};

export default SalesReports;