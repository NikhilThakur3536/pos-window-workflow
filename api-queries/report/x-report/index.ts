import { useMutation, useQuery } from "@tanstack/react-query";
import { apiUrls, axiosInstance } from "../..";

// -------------------------------- TYPES --------------------------------

export enum SourceType {
  POS_CASH_SALE = "POS_CASH_SALE",
  ACCOUNT_SALE = "ACCOUNT_SALE",
  POS_REFUND = "POS_REFUND",
  DEBTOR_RECEIPT = "DEBTOR_RECEIPT",
}

export interface XReportPayload {

  companyIds: string[];
  terminalIds: string[];
  tenderTypeIds: string[];
  sourceTypes:  SourceType[];
  dateFrom: string;
  dateTo: string;
}

export interface XReportCountAmount {
  count: number;
  amount: number;
}

export interface XReportSales {
  TotalSales: XReportCountAmount;
}

export interface XReportRefunds {
  TotalRefunds: XReportCountAmount;
  NettSales: XReportCountAmount;
}

export interface XReportOtherTransactions {
  CashTransferOut: XReportCountAmount;
}

export interface XReportBankable {
  BankableTotal: number;
  NonBankableTotal: number;
  TotalTenders: number;
  CashInDrawer: number;
}

export interface XReportTaxBreakdown {
  SalesAmountIncl: number;
  TotalAmountIncl: number;
  TaxOnSales: number;
  TaxTotal: number;
  TaxRate: string;
  EstimatedGP: number;
}

export interface XReportCollection {

  [key: string]: unknown;
}

export interface XReportReconciliationWarning {
  code: string;
  count: number;
}

export interface XReportAppliedFilters {
  companyIds: string[];
  terminalIds: string[];
  tenderTypeIds: string[];
  sourceTypes: string[];
  dateFrom: string;
  dateTo: string;
}

export interface XReportData {
  sales: XReportSales;

  refunds: XReportRefunds;

  otherTransactions: XReportOtherTransactions;

  bankable: XReportBankable;

  taxBreakdown: XReportTaxBreakdown;

  collections: XReportCollection[];

  reconciliationWarnings: XReportReconciliationWarning[];

  appliedFilters: XReportAppliedFilters;
}

export interface XReportResponse {
  success: boolean;
  message: string;
  data: XReportData;
}

// -------------------------------- GENERATE X-REPORT --------------------------------

export const createXReportFn = async (
  data: XReportPayload
): Promise<XReportResponse> => {
  return (
    await axiosInstance({
      url: apiUrls.company.reports.xReport.url,
      method: apiUrls.company.reports.xReport.method,
      data,
    })
  ).data;
};

export const useCreateXReport = () => {
  const {
    mutateAsync: createXReportMutation,
    error,
    isSuccess,
    isPending,
  } = useMutation({
    mutationFn: createXReportFn,

    onSuccess: (response) => {
      console.log("Successfully generated X Report");
      return response.data;
    },

    onError: (error) => {
      console.log("Error generating X Report");
      return error.message;
    },
  });

  return {
    createXReportMutation,
    error,
    isSuccess,
    isPending,
  };
};

export const useGetXReport = (payload: XReportPayload, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["x-report", payload],
    queryFn: async () => await createXReportFn(payload),
    enabled,
  });
};

export async function downloadXCsvReport(
  payload: XReportPayload & { isPdf?: boolean }
): Promise<void> {
  const isPdf = payload.isPdf === true;

  // Remove isPdf from the rest of the payload so it doesn't get spread
  const { isPdf: _ignored, ...restPayload } = payload;

  const response = await axiosInstance({
    url: apiUrls.company.reports.xReport.url,
    method: apiUrls.company.reports.xReport.method,
    data: {
      ...restPayload,
      ...(isPdf ? { isPdf: true } : { isCsv: true }),
    },
    responseType: 'blob',
    headers: {
      Accept: isPdf
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });

  const blob = new Blob([response.data], {
    type: isPdf
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = isPdf ? `X-REPORT.pdf` : `X-REPORT.xlsx`;

  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a); // good practice
}