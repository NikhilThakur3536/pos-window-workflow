import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- PRODUCT PUBLICATION ---------------------------------------
//
// Backlog 3024. A store (or the company) requests that a product becomes
// saleable / orderable. The request is captured as a DRAFT, submitted
// (PENDING_APPROVAL) and then APPROVED or REJECTED by a supervisor.
//
// All endpoints live under /api/company/productPublication/ and are POST.

export const PUBLICATION_SCOPE_TYPES = ['COMPANY', 'STORE'] as const;
export type PublicationScopeType = (typeof PUBLICATION_SCOPE_TYPES)[number];

export const PUBLICATION_APPROVAL_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'] as const;
export type PublicationApprovalStatus = (typeof PUBLICATION_APPROVAL_STATUSES)[number];

export const PUBLICATION_DECISIONS = ['APPROVE', 'REJECT'] as const;
export type PublicationDecision = (typeof PUBLICATION_DECISIONS)[number];

export interface PublicationProductRef {
    id?: string;
    itemCode?: string;
    description?: string;
    generalCode?: string | null;
}

export interface PublicationStoreRef {
    id?: string;
    accountNumber?: string | null;
    name?: string | null;
}

export interface PublicationUserRef {
    id?: string;
    firstName?: string | null;
    surname?: string | null;
    email?: string | null;
    staffNumber?: number | null;
}

export interface ProductPublicationRecord {
    id: string;
    domainId?: string;
    companyId?: string;
    companyStockDetailId?: string;
    scopeType?: PublicationScopeType;
    scopeId?: string;
    // What the request asked for, and what the product is currently set to.
    requestedIsSaleable?: boolean;
    requestedIsOrderable?: boolean;
    isSaleable?: boolean;
    isOrderable?: boolean;
    approvalStatus?: PublicationApprovalStatus;
    // Approval depth required before the request can be decided.
    minimumApproverLevel?: number;
    reason?: string | null;
    requestedBy?: string | null;
    requestedAt?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    rejectedBy?: string | null;
    rejectedAt?: string | null;
    rejectionReason?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    product?: PublicationProductRef | null;
    store?: PublicationStoreRef | null;
    requestedByUser?: PublicationUserRef | null;
    approvedByUser?: PublicationUserRef | null;
    rejectedByUser?: PublicationUserRef | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface PublicationListResponse {
    success: boolean;
    message: string;
    data: {
        count?: number;
        rows: ProductPublicationRecord[];
    };
}

export const getProductPublicationList = async (
    props: { approvalStatus?: PublicationApprovalStatus; limit?: number; offset?: number },
): Promise<PublicationListResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.productPublication.list.url,
            method: apiUrls.productPublication.list.method,
            data: {
                ...(props.approvalStatus ? { approvalStatus: props.approvalStatus } : {}),
                ...(props.limit != null ? { limit: props.limit } : {}),
                ...(props.offset != null ? { offset: props.offset } : {}),
            },
        })
    ).data;
};

export const useGetProductPublicationList = (
    props: { approvalStatus?: PublicationApprovalStatus; limit?: number; offset?: number },
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.productPublication), 'list', props],
        queryFn: async () => await getProductPublicationList(props),
    });
};

export const createProductPublicationSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    scopeType: z.enum(PUBLICATION_SCOPE_TYPES),
    scopeId: z.string().optional(),
    requestedIsSaleable: z.boolean(),
    requestedIsOrderable: z.boolean(),
    reason: z.string().optional(),
});

export type CreateProductPublicationInput = z.infer<typeof createProductPublicationSchema>;

export async function createProductPublication(data: CreateProductPublicationInput) {
    return (
        await axiosInstance({
            url: apiUrls.productPublication.create.url,
            method: apiUrls.productPublication.create.method,
            data,
        })
    ).data;
}

export const useCreateProductPublication = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createProductPublication,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.productPublication)] });
        },
    });
};

export const submitProductPublicationSchema = z.object({
    id: z.string().min(1, 'Publication id is required'),
});

export type SubmitProductPublicationInput = z.infer<typeof submitProductPublicationSchema>;

export async function submitProductPublication(data: SubmitProductPublicationInput) {
    return (
        await axiosInstance({
            url: apiUrls.productPublication.submit.url,
            method: apiUrls.productPublication.submit.method,
            data,
        })
    ).data;
}

export const useSubmitProductPublication = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: submitProductPublication,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.productPublication)] });
        },
    });
};

export const decideProductPublicationSchema = z.object({
    id: z.string().min(1, 'Publication id is required'),
    decision: z.enum(PUBLICATION_DECISIONS),
    reason: z.string().optional(),
    responseNote: z.string().optional(),
});

export type DecideProductPublicationInput = z.infer<typeof decideProductPublicationSchema>;

export async function decideProductPublication(data: DecideProductPublicationInput) {
    return (
        await axiosInstance({
            url: apiUrls.productPublication.decide.url,
            method: apiUrls.productPublication.decide.method,
            data: { id: data.id, decision: data.decision },
        })
    ).data;
}

export const useDecideProductPublication = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: decideProductPublication,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.productPublication)] });
        },
    });
};

export const resolveProductPublicationSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    companyDebtorId: z.string().min(1, 'Store is required'),
});

export type ResolveProductPublicationInput = z.infer<typeof resolveProductPublicationSchema>;

export async function resolveProductPublication(data: ResolveProductPublicationInput) {
    return (
        await axiosInstance({
            url: apiUrls.productPublication.resolve.url,
            method: apiUrls.productPublication.resolve.method,
            data,
        })
    ).data;
}

export const useResolveProductPublication = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resolveProductPublication,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.productPublication)] });
        },
    });
};

export const getProductPublication = async (id: string) => {
    return (
        await axiosInstance({
            url: apiUrls.productPublication.get.url,
            method: apiUrls.productPublication.get.method,
            data: { id },
        })
    ).data;
};

export const useGetProductPublication = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.productPublication), 'get', id],
        enabled: !!id,
        queryFn: async () => await getProductPublication(id as string),
    });
};

export const updateProductPublicationSchema = z.object({
    id: z.string().min(1, 'Publication id is required'),
    reason: z.string().optional(),
    responseNote: z.string().optional(),
});

export type UpdateProductPublicationInput = z.infer<typeof updateProductPublicationSchema>;

export async function updateProductPublication(data: UpdateProductPublicationInput) {
    return (
        await axiosInstance({
            url: apiUrls.productPublication.update.url,
            method: apiUrls.productPublication.update.method,
            data,
        })
    ).data;
}

export const useUpdateProductPublication = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProductPublication,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.productPublication)] });
        },
    });
};

export const deleteProductPublicationSchema = z.object({
    id: z.string().min(1, 'Publication id is required'),
});

export type DeleteProductPublicationInput = z.infer<typeof deleteProductPublicationSchema>;

export async function deleteProductPublication(data: DeleteProductPublicationInput) {
    return (
        await axiosInstance({
            url: apiUrls.productPublication.delete.url,
            method: apiUrls.productPublication.delete.method,
            data,
        })
    ).data;
}

export const useDeleteProductPublication = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteProductPublication,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.productPublication)] });
        },
    });
};