import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- TILL SHORTCUTS ---------------------------------------
//
// Backlog 3024. Keyboard shortcuts published to a till. Two flavours:
//   - MENU: pressing keyCombo opens a back-office menu item (menuId required).
//   - EXTERNAL: pressing keyCombo launches an external program on the till
//     workstation (programPath / programParameters, optionally with the current
//     domain context passed to it).

export const SHORTCUT_TYPES = ['MENU', 'EXTERNAL'] as const;
export type ShortcutType = (typeof SHORTCUT_TYPES)[number];

export interface ShortcutRecord {
    id: string;
    type?: ShortcutType;
    keyCombo?: string;
    menuId?: string | null;
    menu?: { id?: string; label?: string; href?: string } | null;
    tillId?: string | null;
    till?: { id?: string; name?: string; description?: string } | null;
    description?: string;
    programPath?: string;
    programParameters?: string;
    sendDomainContext?: boolean;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ShortcutListResponse {
    success: boolean;
    message: string;
    data: ShortcutRecord[];
}

export const getShortcutsList = async (props: { type?: ShortcutType; limit?: number; offset?: number }) => {
    return (
        await axiosInstance({
            url: apiUrls.shortcuts.list.url,
            method: apiUrls.shortcuts.list.method,
            data: {
                ...(props.type ? { type: props.type } : {}),
                ...(props.limit != null ? { limit: props.limit } : {}),
                ...(props.offset != null ? { offset: props.offset } : {}),
            },
        })
    ).data;
};

export const useGetShortcutsList = (props: { type?: ShortcutType; limit?: number; offset?: number }) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.shortcuts), 'list', props],
        queryFn: async () => await getShortcutsList(props),
    });
};

// Keyboard definition served by /shortcuts/keys - used to build the Key Combo
// dropdown in the shortcut form. It is a keyboard layout, not the shortcut list.
export interface ShortcutKeyOption {
    code: string;
    label: string;
}

export interface ShortcutKeyGroup {
    group: string;
    keys: ShortcutKeyOption[];
}

export interface ShortcutModifier {
    code: string;
    label: string;
    aliases: string[];
}

export interface ShortcutKeysDefinition {
    format: string;
    separator: string;
    caseSensitive: boolean;
    canonicalExample: string;
    modifiers: ShortcutModifier[];
    keyGroups: ShortcutKeyGroup[];
    rules: string[];
    bareKeysAllowed: string[];
    reservedCombos: string[];
}

export interface ShortcutKeysResponse {
    success: boolean;
    message: string;
    data: ShortcutKeysDefinition;
}

export const getShortcutKeys = async () => {
    return (
        await axiosInstance({
            url: apiUrls.shortcuts.keys.url,
            method: apiUrls.shortcuts.keys.method,
            data: { status: 'ACTIVE', limit: 50, offset: 0 },
        })
    ).data;
};

export const useGetShortcutKeys = () => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.shortcuts), 'keys'],
        queryFn: async () => await getShortcutKeys(),
    });
};

export const getShortcut = async (id: string) => {
    return (
        await axiosInstance({
            url: apiUrls.shortcuts.get.url,
            method: apiUrls.shortcuts.get.method,
            data: { id },
        })
    ).data;
};

export const useGetShortcut = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.shortcuts), 'get', id],
        enabled: !!id,
        queryFn: async () => await getShortcut(id as string),
    });
};

export const createShortcutSchema = z.object({
    type: z.enum(SHORTCUT_TYPES),
    keyCombo: z.string().min(1, 'Key combination is required'),
    menuId: z.string().optional(),
    tillId: z.string().optional(),
    description: z.string().optional(),
    programPath: z.string().optional(),
    programParameters: z.string().optional(),
    sendDomainContext: z.boolean().optional(),
});

export type CreateShortcutInput = z.infer<typeof createShortcutSchema>;

export async function createShortcut(data: CreateShortcutInput) {
    const { type, keyCombo } = data;
    return (
        await axiosInstance({
            url: apiUrls.shortcuts.create.url,
            method: apiUrls.shortcuts.create.method,
            data: {
                type,
                keyCombo,
                ...(data.menuId ? { menuId: data.menuId } : {}),
                ...(data.tillId ? { tillId: data.tillId } : {}),
                ...(data.description ? { description: data.description } : {}),
                ...(data.programPath ? { programPath: data.programPath } : {}),
                ...(data.programParameters ? { programParameters: data.programParameters } : {}),
                ...(data.sendDomainContext !== undefined && data.sendDomainContext !== null
                    ? { sendDomainContext: data.sendDomainContext }
                    : {}),
            },
        })
    ).data;
}

export const useCreateShortcut = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createShortcut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.shortcuts)] });
        },
    });
};

export const updateShortcutSchema = z.object({
    id: z.string().min(1, 'Shortcut id is required'),
    keyCombo: z.string().optional(),
    menuId: z.string().nullable().optional(),
    tillId: z.string().nullable().optional(),
    description: z.string().optional(),
    programPath: z.string().optional(),
    programParameters: z.string().optional(),
    sendDomainContext: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

export type UpdateShortcutInput = z.infer<typeof updateShortcutSchema>;

export async function updateShortcut(data: UpdateShortcutInput) {
    const { id, menuId, tillId, ...body } = data;
    return (
        await axiosInstance({
            url: apiUrls.shortcuts.update.url,
            method: apiUrls.shortcuts.update.method,
            data: {
                id,
                ...body,
                ...(menuId ? { menuId } : {}),
                ...(tillId ? { tillId } : {}),
            },
        })
    ).data;
}

export const useUpdateShortcut = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateShortcut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.shortcuts)] });
        },
    });
};