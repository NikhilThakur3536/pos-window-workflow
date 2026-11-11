import { useMutation } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '../';

// --------------------------------------- UPLOAD IMPORT FILE TO S3 ---------------------------------------

export interface UploadImportFilePayload {
    importType: string;
    file: File;
}

export interface UploadImportFileResponse {
    success: boolean;
    message: string;
    data: {
        key: string;
        url: string;
        fileName: string;
    };
}

export async function uploadImportFile(
    data: UploadImportFilePayload,
): Promise<UploadImportFileResponse> {
    const formData = new FormData();

    formData.append('importType', data.importType);
    formData.append('file', data.file);

    return (
        await axiosInstance({
            url: apiUrls.import.uploadToS3.url,
            method: apiUrls.import.uploadToS3.method,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    ).data;
}

export const useUploadImportFile = () => {
    return useMutation({
        mutationFn: uploadImportFile,
    });
};