import { apiUrls, axiosInstance } from "..";
import { useMutation } from '@tanstack/react-query';

export enum DocumentType {
    CASH_SALE = 'CASH_SALE',
    DEBTOR_INVOICE = 'DEBTOR_INVOICE',
    CREDITOR_GRV = 'CREDITOR_GRV',
    DEBTOR_GRV = 'DEBTOR_GRV',
    GOODS_RECEIVING_CLAIM = 'GOODS_RECEIVING_CLAIM',
    CREDIT_NOTE = 'CREDIT_NOTE',
    DEBIT_NOTE = 'DEBIT_NOTE',
    QUOTATION = 'QUOTATION',
    SALE_ORDER = 'SALE_ORDER',
    SUPPLIER_QUOTATION = 'SUPPLIER_QUOTATION',
    SUPPLIER_INVOICE = 'SUPPLIER_INVOICE',
}

export interface documentPrintPayload {
    documentType: DocumentType;
    documentId: string;
    printType: 'ORIGINAL' | 'DUPLICATE';
}

export const documentPrintFn = async (data: documentPrintPayload) => {
    return (
        await axiosInstance({
            url: apiUrls.DocumentPrint.url,
            method: apiUrls.DocumentPrint.method,
            data,
            responseType: 'blob',
        })
    ).data;
};

export const useDocumentPrint = () => {
    return useMutation({
        mutationFn: documentPrintFn,
    });
};

export const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
