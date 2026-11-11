import { apiUrls, axiosInstance } from '..';

// --------------------------------------- IMAGES (products + categories) ---------------------------------------
//
// Product images follow a two-phase contract:
//   1. Upload files to /api/company/productImages/upload. When the product does not exist yet
//      the upload is sent WITHOUT companyStockDetailId; the returned { imageUrl, imageKey, ... }
//      rows are then attached as the `productImages` array on create (POST companyStockDetails) or
//      via /api/company/companyStockDetails/update { id, productImages }. When the product already
//      exists, the same upload endpoint is called WITH companyStockDetailId (and optional isPrimary)
//      so the image is attached immediately.
//   2. List / reorder / delete are handled by /api/company/productImages/{list,update-order,delete}.
//
// Category images mirror that with /api/company/categoryImages/* and a scopeType of
// CATEGORY or SUBCATEGORY plus the scopeId of the category/subcategory.

export interface ScopedImage {
    id?: string;
    imageKey?: string;
    imageUrl?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    sortOrder?: number;
    isPrimary?: boolean;
}

// --------------------------------------- Types ---------------------------------------

export type CategoryImageScopeType = 'CATEGORY' | 'SUBCATEGORY';

export interface UploadProductImageInput {
    file: File;
    /** Present when attaching directly to an existing product. */
    companyStockDetailId?: string;
    isPrimary?: boolean;
}

export interface UploadCategoryImageInput {
    scopeType: CategoryImageScopeType;
    scopeId: string;
    file: File;
    isPrimary?: boolean;
}

export interface ProductImageOrderItem {
    id: string;
    isPrimary?: boolean;
}

export interface ImagesResponse {
    success?: boolean;
    message?: string;
    data?: unknown;
    [key: string]: unknown;
}

// --------------------------------------- Normalization ---------------------------------------
//
// The backend shape is not pinned beyond the curls, so each response is read defensively:
// an array, a { rows } object, or a single image object are all accepted.

const asString = (v: unknown): string | undefined => (v === undefined || v === null ? undefined : String(v));
const asNumber = (v: unknown): number | undefined => (v === undefined || v === null ? undefined : Number(v));

const pickImage = (raw: Record<string, unknown>): ScopedImage | null => {
    if (!raw || typeof raw !== 'object') return null;
    return {
        id: asString(raw.id) ?? asString(raw.imageId) ?? asString(raw.productImageId),
        imageKey: asString(raw.imageKey) ?? asString(raw.key),
        imageUrl: asString(raw.imageUrl) ?? asString(raw.url) ?? asString(raw.previewUrl),
        fileName: asString(raw.fileName) ?? asString(raw.name),
        mimeType: asString(raw.mimeType) ?? asString(raw.contentType),
        fileSize: asNumber(raw.fileSize) ?? asNumber(raw.size),
        sortOrder: asNumber(raw.sortOrder),
        isPrimary: raw.isPrimary === true || raw.isPrimary === 'true',
    };
};

export const normalizeImagesResponse = (body: unknown): ScopedImage[] => {
    if (!body) return [];
    const data = (body as ImagesResponse)?.data;
    const target: unknown = data ?? body;
    if (Array.isArray(target)) {
        return (target as Record<string, unknown>[]).map(pickImage).filter(Boolean) as ScopedImage[];
    }
    if (target && typeof target === 'object') {
        const record = target as Record<string, unknown>;
        const rows = record.rows ?? record.list ?? record.images ?? record.items;
        if (Array.isArray(rows)) {
            return (rows as Record<string, unknown>[]).map(pickImage).filter(Boolean) as ScopedImage[];
        }
        const single = pickImage(record);
        if (single) return [single];
    }
    return [];
};

const imagePayloadFields = (img: ScopedImage, index: number): Record<string, unknown> => ({
    imageUrl: img.imageUrl,
    imageKey: img.imageKey,
    fileName: img.fileName,
    mimeType: img.mimeType,
    fileSize: img.fileSize,
    sortOrder: img.sortOrder ?? index,
    isPrimary: img.isPrimary === true,
});

// --------------------------------------- Product images ---------------------------------------

export async function uploadProductImage(data: UploadProductImageInput): Promise<ImagesResponse> {
    const formData = new FormData();
    formData.append('images', data.file);
    if (data.companyStockDetailId) formData.append('companyStockDetailId', data.companyStockDetailId);
    if (data.isPrimary !== undefined) formData.append('isPrimary', String(data.isPrimary));
    return (
        await axiosInstance({
            url: apiUrls.productImages.upload.url,
            method: apiUrls.productImages.upload.method,
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    ).data;
}

export async function listProductImages(
    companyStockDetailId: string,
): Promise<ImagesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.productImages.list.url,
            method: apiUrls.productImages.list.method,
            data: { companyStockDetailId },
        })
    ).data;
}

export async function updateProductImageOrder(
    companyStockDetailId: string,
    productImages: ProductImageOrderItem[],
): Promise<ImagesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.productImages.updateOrder.url,
            method: apiUrls.productImages.updateOrder.method,
            data: { companyStockDetailId, productImages },
        })
    ).data;
}

export async function deleteProductImage(id: string): Promise<ImagesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.productImages.delete.url,
            method: apiUrls.productImages.delete.method,
            data: { id },
        })
    ).data;
}

// Attach previously uploaded (orphan) images to an existing product.
export async function attachProductImagesToStock(
    companyStockDetailId: string,
    productImages: ScopedImage[],
): Promise<ImagesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stocks.updateImages.url,
            method: apiUrls.stocks.updateImages.method,
            data: {
                id: companyStockDetailId,
                productImages: productImages.map((img, i) => imagePayloadFields(img, i)),
            },
        })
    ).data;
}

// --------------------------------------- Category images ---------------------------------------

export async function uploadCategoryImage(data: UploadCategoryImageInput): Promise<ImagesResponse> {
    const formData = new FormData();
    formData.append('scopeType', data.scopeType);
    formData.append('scopeId', data.scopeId);
    formData.append('images', data.file);
    if (data.isPrimary !== undefined) formData.append('isPrimary', String(data.isPrimary));
    return (
        await axiosInstance({
            url: apiUrls.categoryImages.upload.url,
            method: apiUrls.categoryImages.upload.method,
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    ).data;
}

export async function listCategoryImages(
    scopeType: CategoryImageScopeType,
    scopeId: string,
): Promise<ImagesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.categoryImages.list.url,
            method: apiUrls.categoryImages.list.method,
            data: { scopeType, scopeId },
        })
    ).data;
}

export async function updateCategoryImageOrder(
    scopeType: CategoryImageScopeType,
    scopeId: string,
    categoryImages: ProductImageOrderItem[],
): Promise<ImagesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.categoryImages.updateOrder.url,
            method: apiUrls.categoryImages.updateOrder.method,
            data: { scopeType, scopeId, categoryImages },
        })
    ).data;
}

export async function getCategoryImage(id: string): Promise<ImagesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.categoryImages.get.url,
            method: apiUrls.categoryImages.get.method,
            data: { id },
        })
    ).data;
}

export async function deleteCategoryImage(id: string): Promise<ImagesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.categoryImages.delete.url,
            method: apiUrls.categoryImages.delete.method,
            data: { id },
        })
    ).data;
}

// --------------------------------------- Validation ---------------------------------------

export const IMAGE_MAX_FILES = 10;
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
export const IMAGE_ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/heic';

export const validateImages = (files: File[], currentCount: number): string | null => {
    if (currentCount + files.length > IMAGE_MAX_FILES) return `You can attach up to ${IMAGE_MAX_FILES} images.`;
    for (const file of files) {
        if (!IMAGE_ACCEPTED.includes(file.type as (typeof IMAGE_ACCEPTED)[number]))
            return `${file.name} is not a supported image format.`;
        if (file.size > IMAGE_MAX_BYTES) return `${file.name} is larger than 10 MB.`;
    }
    return null;
};