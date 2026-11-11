// import React, { useState } from 'react';
// import { useAuthUser } from '@/stores/auth-user.store';
// import useTableFilters from '@/components/list-only-table/use-table-filters';
// import { DataTable } from '@/components/dynamic-table/data-table';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { PageLoader } from '@/components/custom-components/PageLoader';
// import TableDateFilter from '@/components/table/table-date-filter';
// import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
// import { MultiSelect } from '@/components/ui/Multi-select';
// import { Download, DollarSign, CreditCard, Wallet, TrendingUp, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';
// import moment from 'moment-timezone';
// import { type ColumnDef } from '@tanstack/react-table';

// import { useGetCompanies } from '@/api-queries/company-details';
// import { useGetTenders } from '@/api-queries/point-of-sale/tenders';
// import { useGetTills } from '@/api-queries/masters/tills';
// import {
//   useGetXReport,
//   downloadXCsvReport,
//   SourceType,
//   XReportPayload,
//   XReportData,
// } from '@/api-queries/report/x-report';
// import {
//   useGetPOSReport,
//   downloadCsvReport,
//   POSReportSourceType,
//   POSReportRow,
//   POSReportPayload,
// } from '@/api-queries/report/pos-report';

// export type UtilityReportType = 'x-report' | 'pos-report';

// export interface UtilityFilterProps {
//   fromDate?: string;
//   toDate?: string;
//   companyIds?: string[];
//   terminalIds?: string[];
//   tenderTypeIds?: string[];
//   sourceTypes?: (SourceType | POSReportSourceType)[];
// }

// const sourceTypeOptions = [
//   { label: 'POS Cash Sale', value: 'POS_CASH_SALE' },
//   { label: 'Account Sale', value: 'ACCOUNT_SALE' },
//   { label: 'POS Refund', value: 'POS_REFUND' },
//   { label: 'Debtor Receipt', value: 'DEBTOR_RECEIPT' },
// ];

// const UtilityReport = ({ type = 'x-report' }: { type?: UtilityReportType }) => {
//   const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

//   const initialFilters: UtilityFilterProps = {
//     fromDate: '',
//     toDate: '',
//     companyIds: [],
//     terminalIds: [],
//     tenderTypeIds: [],
//     sourceTypes: [],
//   };

//   const {
//     filters,
//     setFilters,
//     handleFilters,
//     clearFilters,
//     appliedFilters,
//     showClearButton,
//     pagination,
//     setPagination,
//   } = useTableFilters<UtilityFilterProps>({ ...initialFilters });

//   const { data: companiesData } = useGetCompanies({ limit: 1000 });
//   const { data: tendersData } = useGetTenders({ limit: 1000 });
//   const { data: tillsData } = useGetTills({ limit: 1000 });

//   // Only X-Report still requires dates. POS listing is available without any filters.
//   const hasDates = Boolean(appliedFilters?.fromDate && appliedFilters?.toDate);
//   const canShowXReport = type === 'x-report' && hasDates;
//   const canShowPOSReport = type === 'pos-report'; // always available

//   const xPayload: XReportPayload = {
//     companyIds: appliedFilters?.companyIds || [],
//     terminalIds: appliedFilters?.terminalIds || [],
//     tenderTypeIds: appliedFilters?.tenderTypeIds || [],
//     sourceTypes: (appliedFilters?.sourceTypes as SourceType[]) || [],
//     dateFrom: appliedFilters?.fromDate || '',
//     dateTo: appliedFilters?.toDate || '',
//   };

//   const posPayload: POSReportPayload = {
//     sourceTypes: (appliedFilters?.sourceTypes as POSReportSourceType[]) || [],
//     dateFrom: appliedFilters?.fromDate || '',
//     dateTo: appliedFilters?.toDate || '',
//     limit: pagination.pageSize,
//     offset: pagination.pageIndex * pagination.pageSize,
//   };

//   // X-Report only when dates applied. POS report always enabled (even with empty filters)
//   const xReportQuery = useGetXReport(xPayload, canShowXReport);
//   const posReportQuery = useGetPOSReport(posPayload, canShowPOSReport);

//   const isLoading = type === 'x-report' ? xReportQuery.isLoading : posReportQuery.isLoading;

//   const handleApplyFilters = () => {
//     handleFilters(filters);
//   };

//   const handleClearSearch = () => {
//     clearFilters();
//   };

//   async function downloadCSV() {
//     try {
//       if (type === 'x-report') {
//         await downloadXCsvReport(xPayload);
//       } else {
//         await downloadCsvReport(posPayload);
//       }
//     } catch (error) {
//       console.error('Error downloading CSV report:', error);
//     }
//   }

//   const posReportColumns: ColumnDef<POSReportRow>[] = [
//     {
//       accessorKey: 'sequenceNo',
//       header: 'Seq / Ref No',
//       cell: ({ row }) => (
//         <div>
//           <div className="font-semibold">{row.original.sequenceNo || '-'}</div>
//           <div className="text-xs text-gray-500">
//             {row.original.referenceNumber || row.original.sourceDocumentId || '-'}
//           </div>
//         </div>
//       ),
//     },
//     {
//       accessorKey: 'sourceType',
//       header: 'Source Type',
//       cell: ({ row }) => (
//         <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
//           {row.original.sourceType?.replace(/_/g, ' ')}
//         </span>
//       ),
//     },
//     {
//       accessorKey: 'tenderType',
//       header: 'Tender Type',
//       cell: ({ row }) => row.original.tenderType || '-',
//     },
//     {
//       accessorKey: 'amount',
//       header: 'Amount',
//       cell: ({ row }) => (
//         <div className="font-medium">
//           {currencySymbol} {Number(row.original.amount || 0).toFixed(2)}
//         </div>
//       ),
//     },
//     {
//       accessorKey: 'signedAmount',
//       header: 'Signed Amount',
//       cell: ({ row }) => {
//         const val = Number(row.original.signedAmount || 0);
//         return (
//           <div className={`font-semibold ${val < 0 ? 'text-red-600' : 'text-green-600'}`}>
//             {currencySymbol} {val.toFixed(2)}
//           </div>
//         );
//       },
//     },
//     {
//       accessorKey: 'remarks',
//       header: 'Remarks',
//       cell: ({ row }) => row.original.remarks || '-',
//     },
//     {
//       accessorKey: 'createdAt',
//       header: 'Date & Time',
//       cell: ({ row }) =>
//         row.original.createdAt
//           ? moment(row.original.createdAt).format('DD MMM YYYY, hh:mm A')
//           : '-',
//     },
//   ];

//   const renderFilterBar = () => (
//     <div className="flex w-full flex-wrap items-center gap-2">
//       <TableDateFilter filters={filters} setFilters={setFilters} />

//       <MultiSelect
//         options={sourceTypeOptions}
//         value={filters.sourceTypes || []}
//         onChange={(val) => setFilters({ ...filters, sourceTypes: val as any })}
//         placeholder="Source Types"
//       />

//       {type === 'x-report' && (
//         <>
//           <MultiSelect
//             options={
//               companiesData?.data?.map((c: any) => ({
//                 label: c.companyName,
//                 value: c.id,
//               })) || []
//             }
//             value={filters.companyIds || []}
//             onChange={(val) => setFilters({ ...filters, companyIds: val })}
//             placeholder="Select Companies"
//           />

//           <MultiSelect
//             options={
//               tillsData?.data?.rows?.map((t: any) => ({
//                 label: t.name || `Till ${t.tillNumber}`,
//                 value: t.terminalId || t.id,
//               })) || []
//             }
//             value={filters.terminalIds || []}
//             onChange={(val) => setFilters({ ...filters, terminalIds: val })}
//             placeholder="Select Terminals / Tills"
//           />

//           <MultiSelect
//             options={
//               tendersData?.data?.rows?.map((t: any) => ({
//                 label: t.description || t.code,
//                 value: t.id,
//               })) || []
//             }
//             value={filters.tenderTypeIds || []}
//             onChange={(val) => setFilters({ ...filters, tenderTypeIds: val })}
//             placeholder="Select Tender Types"
//           />
//         </>
//       )}

//       <FilterActionButtons
//         onApplyFilters={handleApplyFilters}
//         onClearClick={handleClearSearch}
//         showClearButton={showClearButton}
//       />

//       {/* CSV download available for POS always, for X-Report only when dates present */}
//       {(type === 'pos-report' || hasDates) && (
//         <div className="ml-auto flex gap-2">
//           <Button onClick={downloadCSV} variant="outline">
//             <Download className="mr-2 h-4 w-4" />
//             CSV
//           </Button>
//         </div>
//       )}
//     </div>
//   );

//   const renderXReportContent = () => {
//     const xData: XReportData | undefined = xReportQuery.data?.data;

//     const sales = xData?.sales?.TotalSales || { count: 0, amount: 0 };
//     const refunds = xData?.refunds?.TotalRefunds || { count: 0, amount: 0 };
//     const nettSales = xData?.refunds?.NettSales || { count: 0, amount: 0 };
//     const bankable = xData?.bankable || {
//       BankableTotal: 0,
//       NonBankableTotal: 0,
//       TotalTenders: 0,
//       CashInDrawer: 0,
//     };
//     const tax = xData?.taxBreakdown || {
//       SalesAmountIncl: 0,
//       TotalAmountIncl: 0,
//       TaxOnSales: 0,
//       TaxTotal: 0,
//       TaxRate: '0%',
//       EstimatedGP: 0,
//     };
//     const otherTx = xData?.otherTransactions?.CashTransferOut || { count: 0, amount: 0 };
//     const warnings = xData?.reconciliationWarnings || [];

//     return (
//       <div className="space-y-4">
//         <Card className="border border-gray-200 bg-white p-4 shadow-sm">
//           <div className="space-y-3">
//             <h2 className="text-xl font-bold tracking-tight text-gray-900">X-Report Summary</h2>
//             {renderFilterBar()}
//           </div>
//         </Card>

//         {warnings.length > 0 && (
//           <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
//             <div className="flex items-center gap-2 font-semibold">
//               <AlertTriangle className="h-5 w-5 text-amber-600" />
//               Reconciliation Warnings Detected
//             </div>
//             <ul className="mt-2 list-inside list-disc text-sm">
//               {warnings.map((w, idx) => (
//                 <li key={idx}>
//                   Code: <span className="font-semibold">{w.code}</span> (Count: {w.count})
//                 </li>
//               ))}
//             </ul>
//           </div>
//         )}

//         <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
//           <Card className="border border-gray-200 bg-white shadow-sm">
//             <CardHeader className="flex flex-row items-center justify-between pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
//               <DollarSign className="h-4 w-4 text-green-600" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-gray-900">
//                 {currencySymbol} {Number(sales.amount || 0).toFixed(2)}
//               </div>
//               <p className="mt-1 text-xs text-gray-500">{sales.count || 0} Transactions</p>
//             </CardContent>
//           </Card>

//           <Card className="border border-gray-200 bg-white shadow-sm">
//             <CardHeader className="flex flex-row items-center justify-between pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Total Refunds</CardTitle>
//               <RefreshCw className="h-4 w-4 text-red-600" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-red-600">
//                 {currencySymbol} {Number(refunds.amount || 0).toFixed(2)}
//               </div>
//               <p className="mt-1 text-xs text-gray-500">{refunds.count || 0} Refunds</p>
//             </CardContent>
//           </Card>

//           <Card className="border border-gray-200 bg-white shadow-sm">
//             <CardHeader className="flex flex-row items-center justify-between pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Nett Sales</CardTitle>
//               <TrendingUp className="h-4 w-4 text-blue-600" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-gray-900">
//                 {currencySymbol} {Number(nettSales.amount || 0).toFixed(2)}
//               </div>
//               <p className="mt-1 text-xs text-gray-500">{nettSales.count || 0} Nett Transactions</p>
//             </CardContent>
//           </Card>

//           <Card className="border border-gray-200 bg-white shadow-sm">
//             <CardHeader className="flex flex-row items-center justify-between pb-2">
//               <CardTitle className="text-sm font-medium text-gray-600">Cash In Drawer</CardTitle>
//               <Wallet className="h-4 w-4 text-purple-600" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-purple-700">
//                 {currencySymbol} {Number(bankable.CashInDrawer || 0).toFixed(2)}
//               </div>
//               <p className="mt-1 text-xs text-gray-500">Drawer Total</p>
//             </CardContent>
//           </Card>
//         </div>

//         <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
//           <Card className="border border-gray-200 bg-white shadow-sm">
//             <CardHeader className="border-b pb-3">
//               <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
//                 <CreditCard className="h-5 w-5 text-gray-600" />
//                 Bankable & Tender Breakdown
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-3 pt-4">
//               <div className="flex justify-between border-b pb-2 text-sm">
//                 <span className="text-gray-600">Bankable Total:</span>
//                 <span className="font-semibold text-gray-900">
//                   {currencySymbol} {Number(bankable.BankableTotal || 0).toFixed(2)}
//                 </span>
//               </div>
//               <div className="flex justify-between border-b pb-2 text-sm">
//                 <span className="text-gray-600">Non-Bankable Total:</span>
//                 <span className="font-semibold text-gray-900">
//                   {currencySymbol} {Number(bankable.NonBankableTotal || 0).toFixed(2)}
//                 </span>
//               </div>
//               <div className="flex justify-between border-b pb-2 text-sm">
//                 <span className="text-gray-600">Total Tenders:</span>
//                 <span className="font-semibold text-gray-900">
//                   {currencySymbol} {Number(bankable.TotalTenders || 0).toFixed(2)}
//                 </span>
//               </div>
//               <div className="flex justify-between text-sm">
//                 <span className="text-gray-600">Cash Transfer Out:</span>
//                 <span className="font-semibold text-gray-900">
//                   {currencySymbol} {Number(otherTx.amount || 0).toFixed(2)} ({otherTx.count || 0} Tx)
//                 </span>
//               </div>
//             </CardContent>
//           </Card>

//           <Card className="border border-gray-200 bg-white shadow-sm">
//             <CardHeader className="border-b pb-3">
//               <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
//                 <TrendingUp className="h-5 w-5 text-gray-600" />
//                 Tax & Profit Breakdown
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-3 pt-4">
//               <div className="flex justify-between border-b pb-2 text-sm">
//                 <span className="text-gray-600">Sales Amount (Incl. Tax):</span>
//                 <span className="font-semibold text-gray-900">
//                   {currencySymbol} {Number(tax.SalesAmountIncl || 0).toFixed(2)}
//                 </span>
//               </div>
//               <div className="flex justify-between border-b pb-2 text-sm">
//                 <span className="text-gray-600">Tax on Sales:</span>
//                 <span className="font-semibold text-gray-900">
//                   {currencySymbol} {Number(tax.TaxOnSales || 0).toFixed(2)}
//                 </span>
//               </div>
//               <div className="flex justify-between border-b pb-2 text-sm">
//                 <span className="text-gray-600">Tax Rate / Tax Total:</span>
//                 <span className="font-semibold text-gray-900">
//                   {tax.TaxRate || '0%'} ({currencySymbol} {Number(tax.TaxTotal || 0).toFixed(2)})
//                 </span>
//               </div>
//               <div className="flex justify-between text-sm">
//                 <span className="text-gray-600">Estimated Gross Profit (GP):</span>
//                 <span className="font-semibold text-green-700">
//                   {currencySymbol} {Number(tax.EstimatedGP || 0).toFixed(2)}
//                 </span>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     );
//   };

//   const renderPOSReportContent = () => {
//     const posData = posReportQuery.data?.data;
//     const rows = posData?.rows || [];
//     const totalRowCount = posData?.count || 0;
//     const totalAmount = posData?.totalAmount || 0;
//     const transactionCount = posData?.transactionCount || 0;

//     return (
//       <DataTable
//         query={posReportQuery}
//         data={rows}
//         columns={posReportColumns}
//         pagination={pagination}
//         setPagination={setPagination}
//         totalRowCount={totalRowCount}
//       >
//         <Card className="mb-3 border border-gray-200 bg-white p-3 shadow-sm">
//           <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
//             <div>
//               <h2 className="text-xl font-bold tracking-tight text-gray-900">POS Detailed Tender Report</h2>
//               <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
//                 <span>
//                   Total Records: <strong className="text-gray-800">{totalRowCount}</strong>
//                 </span>
//                 <span>
//                   Transactions: <strong className="text-gray-800">{transactionCount}</strong>
//                 </span>
//                 <span>
//                   Total Amount:{' '}
//                   <strong className="text-green-600">
//                     {currencySymbol} {Number(totalAmount).toFixed(2)}
//                   </strong>
//                 </span>
//               </div>
//             </div>

//             <div>{renderFilterBar()}</div>
//           </div>
//         </Card>
//       </DataTable>
//     );
//   };

//   const renderPromptSelectDates = () => (
//     <div className="space-y-4">
//       <Card className="border border-gray-200 bg-white p-4 shadow-sm">
//         <div className="space-y-3">
//           <h2 className="text-xl font-bold tracking-tight text-gray-900">X-Report Summary</h2>
//           {renderFilterBar()}
//         </div>
//       </Card>

//       <Card className="flex flex-col items-center justify-center border border-dashed border-gray-300 bg-gray-50/50 p-12 text-center shadow-none">
//         <Calendar className="mb-3 h-10 w-10 text-blue-500" />
//         <h3 className="text-lg font-semibold text-gray-900">Please Select Date Range</h3>
//         <p className="mt-1 text-sm text-gray-500">
//           Select <strong>From Date</strong> and <strong>To Date</strong> in the filters above, then
//           click <strong>Apply Filters</strong> to generate the X-Report.
//         </p>
//       </Card>
//     </div>
//   );

//   return (
//     <PageLoader isLoading={isLoading}>
//       <div className="space-y-4 p-3">
//         {type === 'pos-report'
//           ? renderPOSReportContent()
//           : !hasDates
//             ? renderPromptSelectDates()
//             : renderXReportContent()}
//       </div>
//     </PageLoader>
//   );
// };

// export default UtilityReport;
import React, { useState } from 'react';
import { useAuthUser } from '@/stores/auth-user.store';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { DataTable } from '@/components/dynamic-table/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/custom-components/PageLoader';
import TableDateFilter from '@/components/table/table-date-filter';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { MultiSelect } from '@/components/ui/Multi-select';
import {
  Download,
  DollarSign,
  CreditCard,
  Wallet,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Calendar,
  FileText,
  Printer,
  Loader2,
} from 'lucide-react';
import moment from 'moment-timezone';
import { type ColumnDef } from '@tanstack/react-table';

import { useGetCompanies } from '@/api-queries/company-details';
import { useGetTenders } from '@/api-queries/point-of-sale/tenders';
import { useGetTills } from '@/api-queries/masters/tills';
import {
  useGetXReport,
  downloadXCsvReport,
  SourceType,
  XReportPayload,
  XReportData,
} from '@/api-queries/report/x-report';
import {
  useGetPOSReport,
  downloadCsvReport,
  POSReportSourceType,
  POSReportRow,
  POSReportPayload,
} from '@/api-queries/report/pos-report';

export type UtilityReportType = 'x-report' | 'pos-report';

export interface UtilityFilterProps {
  fromDate?: string;
  toDate?: string;
  companyIds?: string[];
  terminalIds?: string[];
  tenderTypeIds?: string[];
  sourceTypes?: (SourceType | POSReportSourceType)[];
}

const deviceType = process.env.NEXT_PUBLIC_APP_TYPE;

const allSourceTypeOptions = [
  { label: 'POS Cash Sale', value: 'POS_CASH_SALE' },
  { label: 'Account Sale', value: 'ACCOUNT_SALE' },
  { label: 'POS Refund', value: 'POS_REFUND' },
  { label: 'Debtor Receipt', value: 'DEBTOR_RECEIPT' },
];

const sourceTypeOptions =
  deviceType === 'WAREHOUSE-USER'
    ? allSourceTypeOptions
    : allSourceTypeOptions.filter(
        (opt) => opt.value === 'POS_CASH_SALE' || opt.value === 'POS_REFUND',
      );

const UtilityReport = ({ type = 'x-report' }: { type?: UtilityReportType }) => {
  const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

  const defaultToDate = moment().format('YYYY-MM-DD');
  const defaultFromDate = moment().subtract(1, 'months').format('YYYY-MM-DD');

  const initialFilters: UtilityFilterProps = {
    fromDate: defaultFromDate,
    toDate: defaultToDate,
    companyIds: [],
    terminalIds: [],
    tenderTypeIds: [],
    sourceTypes: [],
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
  } = useTableFilters<UtilityFilterProps>({ ...initialFilters });

  const { data: companiesData } = useGetCompanies({ limit: 1000 });
  const { data: tendersData } = useGetTenders({ isParentNull: true, isDiscountParent: false });
  const { data: tillsData } = useGetTills({ limit: 1000 });

  const hasDates = Boolean(appliedFilters?.fromDate && appliedFilters?.toDate);
  const canShowXReport = type === 'x-report';
  const canShowPOSReport = type === 'pos-report';

  // NEW: tracks whether a PDF is currently being fetched/prepared for printing
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  const xPayload: XReportPayload = {
    companyIds: appliedFilters?.companyIds || [],
    terminalIds: appliedFilters?.terminalIds || [],
    tenderTypeIds: appliedFilters?.tenderTypeIds || [],
    sourceTypes: (appliedFilters?.sourceTypes as SourceType[]) || [],
    dateFrom: appliedFilters?.fromDate || '',
    dateTo: appliedFilters?.toDate || '',
  };

  const posPayload: POSReportPayload = {
    sourceTypes: (appliedFilters?.sourceTypes as POSReportSourceType[]) || [],
    dateFrom: appliedFilters?.fromDate || '',
    dateTo: appliedFilters?.toDate || '',
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
  };

  const xReportQuery = useGetXReport(xPayload, canShowXReport);
  const posReportQuery = useGetPOSReport(posPayload, canShowPOSReport);

  const isLoading = type === 'x-report' ? xReportQuery.isLoading : posReportQuery.isLoading;

  const handleApplyFilters = () => {
    handleFilters(filters);
  };

  const handleClearSearch = () => {
    clearFilters();
  };

  async function downloadCSV() {
    try {
      if (type === 'x-report') {
        await downloadXCsvReport(xPayload);
      } else {
        await downloadCsvReport(posPayload);
      }
    } catch (error) {
      console.error('Error downloading CSV report:', error);
    }
  }

  const isElectron =
    typeof window !== 'undefined' && Boolean((window as any)?.electronAPI?.printLabel);

  async function printPDF() {
    setIsPreparingPrint(true);

    try {
      const blob =
        type === 'x-report'
        //@ts-ignore
          ? await downloadXCsvReport({ ...xPayload, isPdf: true, returnBlob: true })
          //@ts-ignore
          : await downloadCsvReport({ ...posPayload, isPdf: true, returnBlob: true });

      if (isElectron) {
        //@ts-ignore
        await printPDFViaElectron(blob);
      } else {
        //@ts-ignore
        await printPDFViaBrowser(blob);
      }
    } catch (error) {
      console.error('Error preparing PDF for print:', error);
    } finally {
      setIsPreparingPrint(false);
    }
  }

  async function printPDFViaElectron(blob: Blob) {
    const arrayBuffer = await blob.arrayBuffer();

    const success = await (window as any).electronAPI.printLabel({
      type: 'pdf-buffer',
      buffer: arrayBuffer,
      copies: 1,
      silent: false,
    });

    if (!success) {
      throw new Error('Electron print-label IPC call returned failure');
    }
  }

  function printPDFViaBrowser(blob: Blob) {
    return new Promise<void>((resolve) => {
      const blobUrl = URL.createObjectURL(blob);
      const printFrame = document.createElement('iframe');

      const cleanup = () => {
        if (printFrame.parentNode) {
          printFrame.parentNode.removeChild(printFrame);
        }
        URL.revokeObjectURL(blobUrl);
      };

      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.src = blobUrl;

      printFrame.onload = () => {
        // PDF is loaded and ready — resolve so the caller can clear the
        // loading state, then trigger the print dialog.
        resolve();

        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (err) {
          console.error('Error opening print dialog:', err);
        }

        // Clean up once the print dialog has been dismissed (best-effort;
        // not all browsers fire onafterprint inside an iframe reliably,
        // so we also fall back to a timeout).
        if (printFrame.contentWindow) {
          printFrame.contentWindow.onafterprint = cleanup;
        }
        setTimeout(cleanup, 60000);
      };

      document.body.appendChild(printFrame);
    });
  }

  const posReportColumns: ColumnDef<POSReportRow>[] = [
    {
      accessorKey: 'sequenceNo',
      header: 'Seq / Ref No',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold">{row.original.sequenceNo || '-'}</div>
          <div className="text-xs text-gray-500">
            {row.original.referenceNumber || row.original.sourceDocumentId || '-'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'sourceType',
      header: 'Source Type',
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
          {row.original.sourceType?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'tenderType',
      header: 'Tender Type',
      cell: ({ row }) => row.original.tenderType || '-',
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="font-medium">
          {currencySymbol} {Number(row.original.amount || 0).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'signedAmount',
      header: 'Signed Amount',
      cell: ({ row }) => {
        const val = Number(row.original.signedAmount || 0);
        return (
          <div className={`font-semibold ${val < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {currencySymbol} {val.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: ({ row }) => row.original.remarks || '-',
    },
    {
      accessorKey: 'createdAt',
      header: 'Date & Time',
      cell: ({ row }) =>
        row.original.createdAt
          ? moment(row.original.createdAt).format('DD MMM YYYY, hh:mm A')
          : '-',
    },
  ];

  const renderFilterBar = () => (
    <div className="flex w-full flex-wrap items-center gap-2">
      <TableDateFilter filters={filters} setFilters={setFilters} />

      <MultiSelect
        options={sourceTypeOptions}
        value={filters.sourceTypes || []}
        onChange={(val) => setFilters({ ...filters, sourceTypes: val as any })}
        placeholder="Source Types"
      />

      {type === 'x-report' && (
        <>
          {deviceType === 'WAREHOUSE-USER' && (
            <>
              <MultiSelect
                options={
                  companiesData?.data?.map((c: any) => ({
                    label: c.companyName,
                    value: c.id,
                  })) || []
                }
                value={filters.companyIds || []}
                onChange={(val) => setFilters({ ...filters, companyIds: val })}
                placeholder="Select Companies"
              />

              <MultiSelect
                options={
                  tillsData?.data?.rows?.map((t: any) => ({
                    label: t.name || `Till ${t.tillNumber}`,
                    value: t.terminalId || t.id,
                  })) || []
                }
                value={filters.terminalIds || []}
                onChange={(val) => setFilters({ ...filters, terminalIds: val })}
                placeholder="Select Terminals / Tills"
              />
            </>
          )}
          <MultiSelect
            options={
              tendersData?.data?.rows?.map((t: any) => ({
                label: t.description || t.code,
                value: t.id,
              })) || []
            }
            value={filters.tenderTypeIds || []}
            onChange={(val) => setFilters({ ...filters, tenderTypeIds: val })}
            placeholder="Select Tender Types"
          />
        </>
      )}

      <FilterActionButtons
        onApplyFilters={handleApplyFilters}
        onClearClick={handleClearSearch}
        showClearButton={showClearButton}
      />

      <div className="ml-auto flex gap-2">
        <Button onClick={downloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
        <Button onClick={printPDF} variant="outline" disabled={isPreparingPrint}>
          {isPreparingPrint ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing PDF...
            </>
          ) : (
            <>
              <Printer className="mr-2 h-4 w-4" />
              Print PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderXReportContent = () => {
    const xData: XReportData | undefined = xReportQuery.data?.data;

    const sales = xData?.sales?.TotalSales || { count: 0, amount: 0 };
    const refunds = xData?.refunds?.TotalRefunds || { count: 0, amount: 0 };
    const nettSales = xData?.refunds?.NettSales || { count: 0, amount: 0 };
    const bankable = xData?.bankable || {
      BankableTotal: 0,
      NonBankableTotal: 0,
      TotalTenders: 0,
      CashInDrawer: 0,
    };
    const tax = xData?.taxBreakdown || {
      SalesAmountIncl: 0,
      TotalAmountIncl: 0,
      TaxOnSales: 0,
      TaxTotal: 0,
      TaxRate: '0%',
      EstimatedGP: 0,
    };
    const otherTx = xData?.otherTransactions?.CashTransferOut || { count: 0, amount: 0 };
    const warnings = xData?.reconciliationWarnings || [];

    return (
      <div className="space-y-4">
        <Card className="border border-gray-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">X-Report Summary</h2>
            {renderFilterBar()}
          </div>
        </Card>

        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Reconciliation Warnings Detected
            </div>
            <ul className="mt-2 list-inside list-disc text-sm">
              {warnings.map((w, idx) => (
                <li key={idx}>
                  Code: <span className="font-semibold">{w.code}</span> (Count: {w.count})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {currencySymbol} {Number(sales.amount || 0).toFixed(2)}
              </div>
              <p className="mt-1 text-xs text-gray-500">{sales.count || 0} Transactions</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Refunds</CardTitle>
              <RefreshCw className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {currencySymbol} {Number(refunds.amount || 0).toFixed(2)}
              </div>
              <p className="mt-1 text-xs text-gray-500">{refunds.count || 0} Refunds</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Nett Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {currencySymbol} {Number(nettSales.amount || 0).toFixed(2)}
              </div>
              <p className="mt-1 text-xs text-gray-500">{nettSales.count || 0} Nett Transactions</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cash In Drawer</CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">
                {currencySymbol} {Number(bankable.CashInDrawer || 0).toFixed(2)}
              </div>
              <p className="mt-1 text-xs text-gray-500">Drawer Total</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <CreditCard className="h-5 w-5 text-gray-600" />
                Bankable & Tender Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between border-b pb-2 text-sm">
                <span className="text-gray-600">Bankable Total:</span>
                <span className="font-semibold text-gray-900">
                  {currencySymbol} {Number(bankable.BankableTotal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 text-sm">
                <span className="text-gray-600">Non-Bankable Total:</span>
                <span className="font-semibold text-gray-900">
                  {currencySymbol} {Number(bankable.NonBankableTotal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 text-sm">
                <span className="text-gray-600">Total Tenders:</span>
                <span className="font-semibold text-gray-900">
                  {currencySymbol} {Number(bankable.TotalTenders || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cash Transfer Out:</span>
                <span className="font-semibold text-gray-900">
                  {currencySymbol} {Number(otherTx.amount || 0).toFixed(2)} ({otherTx.count || 0} Tx)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <TrendingUp className="h-5 w-5 text-gray-600" />
                Tax & Profit Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between border-b pb-2 text-sm">
                <span className="text-gray-600">Sales Amount (Incl. Tax):</span>
                <span className="font-semibold text-gray-900">
                  {currencySymbol} {Number(tax.SalesAmountIncl || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 text-sm">
                <span className="text-gray-600">Tax on Sales:</span>
                <span className="font-semibold text-gray-900">
                  {currencySymbol} {Number(tax.TaxOnSales || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 text-sm">
                <span className="text-gray-600">Tax Rate / Tax Total:</span>
                <span className="font-semibold text-gray-900">
                  {tax.TaxRate || '0%'} ({currencySymbol} {Number(tax.TaxTotal || 0).toFixed(2)})
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Gross Profit (GP):</span>
                <span className="font-semibold text-green-700">
                  {currencySymbol} {Number(tax.EstimatedGP || 0).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderPOSReportContent = () => {
    const posData = posReportQuery.data?.data;
    const rows = posData?.rows || [];
    const totalRowCount = posData?.count || 0;
    const totalAmount = posData?.totalAmount || 0;
    const transactionCount = posData?.transactionCount || 0;

    return (
      <DataTable
        query={posReportQuery}
        data={rows}
        columns={posReportColumns}
        pagination={pagination}
        setPagination={setPagination}
        totalRowCount={totalRowCount}
      >
        <Card className="mb-3 border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">POS Detailed Tender Report</h2>
              <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                <span>
                  Total Records: <strong className="text-gray-800">{totalRowCount}</strong>
                </span>
                <span>
                  Transactions: <strong className="text-gray-800">{transactionCount}</strong>
                </span>
                <span>
                  Total Amount:{' '}
                  <strong className="text-green-600">
                    {currencySymbol} {Number(totalAmount).toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>

            <div>{renderFilterBar()}</div>
          </div>
        </Card>
      </DataTable>
    );
  };

  return (
    <PageLoader isLoading={isLoading}>
      <div className="space-y-4 p-3">
        {type === 'pos-report' ? renderPOSReportContent() : renderXReportContent()}
      </div>
    </PageLoader>
  );
};

export default UtilityReport;