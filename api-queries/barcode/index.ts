import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '../';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- LABEL TEMPLATES ---------------------------------------

export type LabelType = 'PRICE';
export type LabelStatus = 'ACTIVE' | 'INACTIVE';
export type QueueStatus = 'PENDING' | 'PRINTED';

export interface LabelTemplate {
    id: string;
    name: string;
    labelType: LabelType;
    pricingTypeId: string;
    CompanyStockPricingType:{
        name:string
    }
    paperWidth: number;
    paperHeight: number;
    templateJson: {
        elements: Record<string, any>[];
    };
    status: LabelStatus;
    createdAt: string;
    updatedAt: string;
}

// --------------------------------------- CREATE ---------------------------------------

export interface CreateLabelTemplatePayload {
    name: string;
    labelType: LabelType;
    pricingTypeId: string;
    paperWidth: number;
    paperHeight: number;
    templateJson: {
        elements: Record<string, any>[];
    };
}

export async function createLabelTemplate(
    data: CreateLabelTemplatePayload,
) {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.create.url,
            method: apiUrls.labelTemplate.create.method,
            data,
        })
    ).data;
}

export const useCreateLabelTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createLabelTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.labelTemplate)],
            });
        },
    });
};

export interface UpdateLabelTemplatePayload {
    id: string;
    name: string;
    labelType: LabelType;
    pricingTypeId: string;
    paperWidth: number;
    paperHeight: number;
    templateJson: {
        elements: Record<string, any>[];
    };
}

export async function updateLabelTemplate(
    data: UpdateLabelTemplatePayload,
) {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.edit.url,
            method: apiUrls.labelTemplate.edit.method,
            data,
        })
    ).data;
}

export const useUpdateLabelTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateLabelTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.labelTemplate)],
            });

            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.labelTemplate.all)],
            });
        },
    });
};

// --------------------------------------- ALL ---------------------------------------

export interface GetAllLabelTemplatesPayload {
    labelType?: LabelType;
    status?: LabelStatus;
    search?:string;
}

export async function getAllLabelTemplates(
    data: GetAllLabelTemplatesPayload,
) {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.all.url,
            method: apiUrls.labelTemplate.all.method,
            data,
        })
    ).data;
}

export const useGetAllLabelTemplates = (
    data: GetAllLabelTemplatesPayload,
    enabled = true,
) => {
    const { labelType, status,search } = data || {};

    return useQuery({
        queryKey: [
            getApiKey(apiUrls.labelTemplate.all),
            labelType ?? null,
            status ?? null,
            search??null
        ],
        queryFn: () => getAllLabelTemplates({ labelType, status,search }),
        enabled,
    });
};

// --------------------------------------- GET ---------------------------------------

export interface GetLabelTemplatePayload {
    id: string;
}

export async function getLabelTemplate(
    data: GetLabelTemplatePayload,
) {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.get.url,
            method: apiUrls.labelTemplate.get.method,
            data,
        })
    ).data;
}

export const useGetLabelTemplate = (
    data: GetLabelTemplatePayload,
    enabled = true,
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.labelTemplate.get), data],
        queryFn: () => getLabelTemplate(data),
        enabled,
    });
};

// --------------------------------------- DELETE ---------------------------------------

export interface DeleteLabelTemplatePayload {
    id: string;
}

export async function deleteLabelTemplate(
    data: DeleteLabelTemplatePayload,
) {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.delete.url,
            method: apiUrls.labelTemplate.delete.method,
            data,
        })
    ).data;
}

export const useDeleteLabelTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteLabelTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.labelTemplate)],
            });
        },
    });
};

// --------------------------------------- PREVIEW ---------------------------------------

export interface PreviewLabelPayload {
    templateId: string;
    companyStockDetailIds: string[];
}

export async function previewLabel(
    data: PreviewLabelPayload,
) {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.preview.url,
            method: apiUrls.labelTemplate.preview.method,
            data,
            responseType: 'blob',
        })
    ).data;
}

export const usePreviewLabel = () => {
    return useMutation({
        mutationFn: previewLabel,
    });
};

// --------------------------------------- PRINT ---------------------------------------

export interface PrintLabelPayload {
    templateId: string;
    companyStockDetailIds: string[];
    copies: number;
}

export async function printLabel(data: PrintLabelPayload) {
    const response = await axiosInstance({
        url: apiUrls.labelTemplate.print.url,
        method: apiUrls.labelTemplate.print.method,
        data,
    });

    if (response.headers['content-type']?.includes('application/json')) {
        return response.data;
    } else {
        return response.data;
    }
}

export const usePrintLabel = () => {
    return useMutation({
        mutationFn: printLabel,
    });
};

// --------------------------------------- PENDING LABELS ---------------------------------------

export interface PendingLabelsPayload {
    status: QueueStatus;
    companyStockDetailId: string;
}

export async function getPendingLabels(
    data: PendingLabelsPayload,
) {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.pendingLabels.url,
            method: apiUrls.labelTemplate.pendingLabels.method,
            data,
        })
    ).data;
}

export const useGetPendingLabels = (
    data: PendingLabelsPayload,
    enabled = true,
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.labelTemplate.pendingLabels), data],
        queryFn: () => getPendingLabels(data),
        enabled,
    });
};

// --------------------------------------- PRINT PENDING ---------------------------------------

export interface PrintPendingPayload {
    templateId: string;
    queueIds: string[];
}

export async function printPendingLabels(
    data: PrintPendingPayload,
) {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.printPending.url,
            method: apiUrls.labelTemplate.printPending.method,
            data,
        })
    ).data;
}

export const usePrintPendingLabels = () => {
    return useMutation({
        mutationFn: printPendingLabels,
    });
};

// --------------------------------------- PRINT BY BARCODE ---------------------------------------

export interface PrintByBarcodePayload {
    barcode: string;
}

export async function printLabelByBarcode(
    data: PrintByBarcodePayload,
) {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.printByBarcode.url,
            method: apiUrls.labelTemplate.printByBarcode.method,
            data,
            responseType: 'blob',
        })
    ).data;
}

export const usePrintLabelByBarcode = () => {
    return useMutation({
        mutationFn: printLabelByBarcode,
    });
};

export interface PrintUpdatedLabelsPayload {
    templateId: string;
    copies: number;
    startDate: string;
    endDate: string;
}

export async function printUpdatedLabels(
    data: PrintUpdatedLabelsPayload,
) {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.printUpdatedLabels.url,
            method: apiUrls.labelTemplate.printUpdatedLabels.method,
            data,
        })
    ).data;
}

export const usePrintUpdatedLabels = () => {
    return useMutation({
        mutationFn: printUpdatedLabels,
    });
};

// --------------------------------------- GENERATE IMPORT BATCH LABELS ---------------------------------------

export interface GenerateImportBatchLabelsPayload {
    importBatchId: string;
    labelTemplateId: string;
    numberOfCopies: number;
}

export interface GenerateImportBatchLabelsResponse {
    url: string; // or pdfUrl if that's what your API returns
    zpl:string;
}

export async function generateImportBatchLabels(
    data: GenerateImportBatchLabelsPayload,
): Promise<GenerateImportBatchLabelsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.labelTemplate.generateImportBatchLabels.url,
            method: apiUrls.labelTemplate.generateImportBatchLabels.method,
            data,
        })
    ).data;
}

export const useGenerateImportBatchLabels = () => {
    return useMutation({
        mutationFn: generateImportBatchLabels,
    });
};
