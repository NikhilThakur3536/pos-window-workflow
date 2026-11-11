import { apiUrls, axiosInstance } from "@/api-queries";
import { useMutation, useQuery } from "@tanstack/react-query";


// -------------------------------- TYPES --------------------------------



export type POSReportSourceType =
  | "POS_CASH_SALE"
  | "ACCOUNT_SALE"
  | "POS_REFUND"
  | "DEBTOR_RECEIPT";

export interface POSReportPayload {

  sourceTypes: POSReportSourceType[];
  dateFrom: string;
  dateTo: string;
  limit: number;
  offset: number;
}

export interface POSReportRow {
  id: string;
  companyId: string;
  sourceType: POSReportSourceType;
  sourceDocumentId: string;
  sequenceNo: number;
  terminalId: string | null;
  tenderTypeId: string | null;
  tenderType: string;
  amount: number;
  referenceNumber: string | null;
  remarks: string | null;
  createdAt: string;
  signedAmount: number;
}

export interface POSReportData {
  rows: POSReportRow[];
  count: number;
  transactionCount: number;
  totalAmount: number;
}

export interface POSReportResponse {
  success: boolean;
  message: string;
  data: POSReportData;
}

// -------------------------------- POS REPORT --------------------------------

export const createPOSReportFn = async (
  data: POSReportPayload
): Promise<POSReportResponse> => {
  return (
    await axiosInstance({
      url: apiUrls.company.reports.posReports.url,
      method: apiUrls.company.reports.posReports.method,
      data,
    })
  ).data;
};

export const useCreatePOSReport = () => {
  const {
    mutateAsync: createPOSReportMutation,
    error,
    isSuccess,
    isPending,
  } = useMutation({
    mutationFn: createPOSReportFn,

    onSuccess: (response) => {
      console.log("Successfully generated POS Report");
      return response.data;
    },

    onError: (error) => {
      console.log("Error generating POS Report");
      return error.message;
    },
  });

  return {
    createPOSReportMutation,
    error,
    isSuccess,
    isPending,
  };
};

export const useGetPOSReport = (payload: POSReportPayload, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["pos-report", payload],
    queryFn: async () => await createPOSReportFn(payload),
    enabled,
  });
};

export async function downloadCsvReport(
  payload: POSReportPayload & { isPdf?: boolean }
): Promise<void> {
  const isPdf = payload.isPdf === true;

  // Remove isPdf from the rest of the payload so it doesn't get spread
  const { isPdf: _ignored, ...restPayload } = payload;

  const response = await axiosInstance({
    url: apiUrls.company.reports.posReports.url,
    method: apiUrls.company.reports.posReports.method,
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
  a.download = isPdf ? `POS-REPORT.pdf` : `POS-REPORT.xlsx`;

  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a); // good practice
}



