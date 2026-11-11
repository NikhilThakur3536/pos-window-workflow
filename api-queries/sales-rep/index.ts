import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface SalesRepresentativeTarget {
  targetLevel: number;
  targetValue: number;
  commissionPercent: number;
}

export interface SalesRepresentativeItem {
  id: string;
  repNumber: number;
  isSalesManager: boolean;
  name: string;
  email: string;
  cellNumber: string;
  baseCommissionOn: string;
  comPercent: number;
  onHold: boolean;
  allowEmails: boolean;
  status: string;
  targets: SalesRepresentativeTarget[];
}

export interface SalesRepresentativeResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    rows: SalesRepresentativeItem[];
  };
}

// ---------------------------------------
// SCHEMAS
// ---------------------------------------

export const salesRepresentativeSchema = z.object({
  repNumber: z.number(),
  isSalesManager: z.boolean(),
  name: z.string(),
  email: z.string().email(),
  cellNumber: z.string(),
  baseCommissionOn: z.string(),
  comPercent: z.number(),
  onHold: z.boolean(),
  allowEmails: z.boolean(),
  status: z.string(),
  targets: z.array(
    z.object({
      targetLevel: z.number(),
      targetValue: z.number(),
      commissionPercent: z.number(),
    })
  ),
});

// ---------------------------------------
// GENERIC LIST
// ---------------------------------------

async function getSalesRepresentativeList(
  url: string,
  data: any = {}
) {
  return (
    await axiosInstance({
      url,
      method: "post",
      data,
    })
  ).data;
}

// ---------------------------------------
// SALES REPRESENTATIVE
// ---------------------------------------

export const useGetSalesRepresentativeList = (data: any = {}) =>
  useQuery({
    queryKey: [
      getApiKey(apiUrls.salesRepresentative),
      data,
    ],
    queryFn: () =>
      getSalesRepresentativeList(
        apiUrls.salesRepresentative.list.url,
        data
      ),
  });

export const useGetSalesRepresentativeById = (
  enabled: boolean,
  id?: string
) =>
  useQuery({
    enabled: enabled && !!id,
    queryKey: [
      getApiKey(apiUrls.salesRepresentative),
      id,
    ],
    queryFn: async () =>
      (
        await axiosInstance({
          url: apiUrls.salesRepresentative.getById.url,
          method: apiUrls.salesRepresentative.getById.method,
          data: {
            id,
          },
        })
      ).data,
  });

export const useCreateSalesRepresentative = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: z.infer<typeof salesRepresentativeSchema>
    ) =>
      axiosInstance({
        url: apiUrls.salesRepresentative.create.url,
        method: apiUrls.salesRepresentative.create.method,
        data,
      }),

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: [
          getApiKey(apiUrls.salesRepresentative),
        ],
      });
    },
  });
};

export const useUpdateSalesRepresentative = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Partial<
        z.infer<typeof salesRepresentativeSchema>
      > & { id: string }
    ) =>
      axiosInstance({
        url: apiUrls.salesRepresentative.update.url,
        method: apiUrls.salesRepresentative.update.method,
        data,
      }),

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: [
          getApiKey(apiUrls.salesRepresentative),
        ],
      });
    },
  });
};

export const useDeleteSalesRepresentative = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      axiosInstance({
        url: apiUrls.salesRepresentative.delete.url,
        method: apiUrls.salesRepresentative.delete.method,
        data: {
          id,
        },
      }),

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: [
          getApiKey(apiUrls.salesRepresentative),
        ],
      });
    },
  });
};