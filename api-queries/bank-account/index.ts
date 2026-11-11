import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface BankAccountTypeDetails {
  id: string;
  code: string;
  description: string;
  status: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetBankAccountTypeListResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    rows: BankAccountTypeDetails[];
  };
}

export interface GetBankAccountTypeResponse {
  success: boolean;
  message: string;
  data: BankAccountTypeDetails;
}

export interface MutateBankAccountTypeResponse {
  success: boolean;
  message: string;
  data?: BankAccountTypeDetails;
}

// ---------------------------------------
// LIST
// ---------------------------------------

export type BankAccountTypeFilterProps = {
  status?: string;
  limit?: number;
  offset?: number;
};

export async function getBankAccountTypes(
  props: BankAccountTypeFilterProps
): Promise<GetBankAccountTypeListResponse> {
  return (
    await axiosInstance({
      url: apiUrls.bankAccountType.all.url,
      method: apiUrls.bankAccountType.all.method,
      data: props,
    })
  ).data;
}

export const useGetBankAccountTypes = (
  props: BankAccountTypeFilterProps
) =>
  useQuery({
    queryKey: [getApiKey(apiUrls.bankAccountType), props],
    queryFn: () => getBankAccountTypes(props),
  });

// ---------------------------------------
// GET
// ---------------------------------------

export async function getBankAccountTypeById(
  bankAccountTypeId: string
): Promise<GetBankAccountTypeResponse> {
  return (
    await axiosInstance({
      url: apiUrls.bankAccountType.get.url,
      method: apiUrls.bankAccountType.get.method,
      data: { bankAccountTypeId },
    })
  ).data;
}

export const useGetBankAccountTypeById = (
  bankAccountTypeId: string
) =>
  useQuery({
    queryKey: [getApiKey(apiUrls.bankAccountType), bankAccountTypeId],
    queryFn: () => getBankAccountTypeById(bankAccountTypeId),
    enabled: !!bankAccountTypeId,
  });

// ---------------------------------------
// CREATE
// ---------------------------------------

export const bankAccountTypeCreateSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  timezone: z.string().min(1),
});

export type BankAccountTypeCreateSchema = z.infer<
  typeof bankAccountTypeCreateSchema
>;

export async function createBankAccountType(
  data: BankAccountTypeCreateSchema
): Promise<MutateBankAccountTypeResponse> {
  return (
    await axiosInstance({
      url: apiUrls.bankAccountType.create.url,
      method: apiUrls.bankAccountType.create.method,
      data,
    })
  ).data;
}

export const useCreateBankAccountType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBankAccountType,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [getApiKey(apiUrls.bankAccountType)],
      });
    },
  });
};

// ---------------------------------------
// UPDATE
// ---------------------------------------

export const bankAccountTypeUpdateSchema = z.object({
  bankAccountTypeId: z.string(),
  code: z.string().optional(),
  description: z.string().optional(),
  timezone: z.string().optional(),
});

export type BankAccountTypeUpdateSchema = z.infer<
  typeof bankAccountTypeUpdateSchema
>;

export async function updateBankAccountType(
  data: BankAccountTypeUpdateSchema
): Promise<MutateBankAccountTypeResponse> {
  return (
    await axiosInstance({
      url: apiUrls.bankAccountType.update.url,
      method: apiUrls.bankAccountType.update.method,
      data,
    })
  ).data;
}

export const useUpdateBankAccountType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBankAccountType,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [getApiKey(apiUrls.bankAccountType)],
      });
    },
  });
};

// ---------------------------------------
// DELETE
// ---------------------------------------

export async function deleteBankAccountType(
  bankAccountTypeId: string
): Promise<MutateBankAccountTypeResponse> {
  return (
    await axiosInstance({
      url: apiUrls.bankAccountType.delete.url,
      method: apiUrls.bankAccountType.delete.method,
      data: { bankAccountTypeId },
    })
  ).data;
}

export const useDeleteBankAccountType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBankAccountType,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [getApiKey(apiUrls.bankAccountType)],
      });
    },
  });
};