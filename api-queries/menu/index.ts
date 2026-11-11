import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- MENU & MENU ACCESS ---------------------------------------
//
// Backlog 3024. Company menu items (label / icon / href, optional parent) can be
// published to the back office, and per-user access to each menu is granted or
// revoked via the menuAccess endpoints.

export interface CompanyMenuItem {
    id: string;
    label?: string;
    icon?: string;
    href?: string;
    parentId?: string | null;
    parent?: { id?: string; label?: string } | null;
    isActive?: boolean;
    order?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CompanyMenuListResponse {
    success?: boolean;
    message: string;
    count?: number;
    data: CompanyMenuItem[];
}

export const getCompanyMenuList = async (props: { limit?: number; offset?: number }) => {
    return (
        await axiosInstance({
            url: apiUrls.companyMenu.all.url,
            method: apiUrls.companyMenu.all.method,
            data: {
                ...(props.limit != null ? { limit: props.limit } : {}),
                ...(props.offset != null ? { offset: props.offset } : {}),
            },
        })
    ).data;
};

export const useGetCompanyMenuList = (props: { limit?: number; offset?: number }) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyMenu), 'all', props],
        queryFn: async () => await getCompanyMenuList(props),
    });
};

export const getCompanyMenu = async (id: string) => {
    return (
        await axiosInstance({
            url: apiUrls.companyMenu.get.url,
            method: apiUrls.companyMenu.get.method,
            data: { id },
        })
    ).data;
};

export const useGetCompanyMenu = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyMenu), 'get', id],
        enabled: !!id,
        queryFn: async () => await getCompanyMenu(id as string),
    });
};

export const createCompanyMenuSchema = z.object({
    label: z.string().min(1, 'Label is required'),
    icon: z.string().optional(),
    href: z.string().optional(),
    parentId: z.string().nullable().optional(),
});

export type CreateCompanyMenuInput = z.infer<typeof createCompanyMenuSchema>;

export async function createCompanyMenu(data: CreateCompanyMenuInput) {
    return (
        await axiosInstance({
            url: apiUrls.companyMenu.create.url,
            method: apiUrls.companyMenu.create.method,
            data: {
                ...(data.label ? { label: data.label } : {}),
                ...(data.icon ? { icon: data.icon } : {}),
                ...(data.href ? { href: data.href } : {}),
                ...(data.parentId ? { parentId: data.parentId } : {}),
            },
        })
    ).data;
}

export const useCreateCompanyMenu = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCompanyMenu,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyMenu)] });
        },
    });
};

export const updateCompanyMenuSchema = z.object({
    id: z.string().min(1, 'Menu id is required'),
    label: z.string().optional(),
    icon: z.string().optional(),
    href: z.string().optional(),
    parentId: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
});

export type UpdateCompanyMenuInput = z.infer<typeof updateCompanyMenuSchema>;

export async function updateCompanyMenu(data: UpdateCompanyMenuInput) {
    const { id, parentId, ...body } = data;
    return (
        await axiosInstance({
            url: apiUrls.companyMenu.update.url,
            method: apiUrls.companyMenu.update.method,
            data: {
                id,
                ...body,
                ...(parentId ? { parentId } : {}),
                ...(parentId === null ? { parentId: null } : {}),
            },
        })
    ).data;
}

export const useUpdateCompanyMenu = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCompanyMenu,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyMenu)] });
        },
    });
};

export async function deleteCompanyMenu(id: string) {
    return (
        await axiosInstance({
            url: apiUrls.companyMenu.delete.url,
            method: apiUrls.companyMenu.delete.method,
            data: { id },
        })
    ).data;
}

export const useDeleteCompanyMenu = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteCompanyMenu,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyMenu)] });
        },
    });
};

// --------------------------------------- MENU ACCESS ---------------------------------------

export interface MenuAccessRecord {
    id: string;
    userId?: string;
    user?: { id?: string; firstName?: string; surname?: string; email?: string } | null;
    menuId?: string;
    menu?: CompanyMenuItem | null;
    canAccess?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface MenuAccessListResponse {
    success: boolean;
    message: string;
    data: {
        count?: number;
        rows: MenuAccessRecord[];
    };
}

export const getMenuAccessList = async (props: { userId?: string; limit?: number; offset?: number }) => {
    return (
        await axiosInstance({
            url: apiUrls.menuAccess.all.url,
            method: apiUrls.menuAccess.all.method,
            data: {
                ...(props.userId ? { userId: props.userId } : {}),
                ...(props.limit != null ? { limit: props.limit } : {}),
                ...(props.offset != null ? { offset: props.offset } : {}),
            },
        })
    ).data;
};

export const useGetMenuAccessList = (props: { userId?: string; limit?: number; offset?: number }) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.menuAccess), 'all', props],
        queryFn: async () => await getMenuAccessList(props),
    });
};

export const getMenuAccess = async (id: string) => {
    return (
        await axiosInstance({
            url: apiUrls.menuAccess.get.url,
            method: apiUrls.menuAccess.get.method,
            data: { id },
        })
    ).data;
};

export const useGetMenuAccess = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.menuAccess), 'get', id],
        enabled: !!id,
        queryFn: async () => await getMenuAccess(id as string),
    });
};

export const createMenuAccessSchema = z.object({
    userId: z.string().min(1, 'User is required'),
    menuId: z.string().min(1, 'Menu is required'),
    canAccess: z.boolean(),
});

export type CreateMenuAccessInput = z.infer<typeof createMenuAccessSchema>;

export async function createMenuAccess(data: CreateMenuAccessInput) {
    return (
        await axiosInstance({
            url: apiUrls.menuAccess.create.url,
            method: apiUrls.menuAccess.create.method,
            data,
        })
    ).data;
}

export const useCreateMenuAccess = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createMenuAccess,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.menuAccess)] });
        },
    });
};

export const updateMenuAccessSchema = z.object({
    id: z.string().min(1, 'Menu access id is required'),
    canAccess: z.boolean(),
});

export type UpdateMenuAccessInput = z.infer<typeof updateMenuAccessSchema>;

export async function updateMenuAccess(data: UpdateMenuAccessInput) {
    return (
        await axiosInstance({
            url: apiUrls.menuAccess.update.url,
            method: apiUrls.menuAccess.update.method,
            data,
        })
    ).data;
}

export const useUpdateMenuAccess = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateMenuAccess,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.menuAccess)] });
        },
    });
};

export async function deleteMenuAccess(id: string) {
    return (
        await axiosInstance({
            url: apiUrls.menuAccess.delete.url,
            method: apiUrls.menuAccess.delete.method,
            data: { id },
        })
    ).data;
}

export const useDeleteMenuAccess = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteMenuAccess,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.menuAccess)] });
        },
    });
};