import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance, apiUrls } from '..';
import { getApiKey } from '@/utils/helpers';

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface CompanyDefaultSettingsOnes {
  id: string;
  key?: string;
  value: boolean;
  status: string;
  settingOne:{
    name:string
  }

  createdAt?: string;
  updatedAt?: string;
}

/* -------------------------------------------------------------------------- */
/*                                    LIST                                    */
/* -------------------------------------------------------------------------- */

export interface GetCompanyDefaultSettingsOnesListPayload {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface GetCompanyDefaultSettingsOnesListResponse {
  success: boolean;
  data: {
    count: number;
    rows: CompanyDefaultSettingsOnes[];
  };
}

export const getCompanyDefaultSettingsOnesListFn = async (
  data: GetCompanyDefaultSettingsOnesListPayload
): Promise<GetCompanyDefaultSettingsOnesListResponse> => {
  return (
    await axiosInstance({
      url: apiUrls.companies.companyDefaultSettingsOnes.list.url,
      method: apiUrls.companies.companyDefaultSettingsOnes.list.method,
      data,
    })
  ).data;
};

export const useGetCompanyDefaultSettingsOnesList = (
  enabled = true,
  props?: GetCompanyDefaultSettingsOnesListPayload
) => {
  return useQuery({
    queryKey: [
      getApiKey(apiUrls.companies.companyDefaultSettingsOnes.list),
      props,
    ],
    queryFn: () => getCompanyDefaultSettingsOnesListFn(props!),
    enabled,
  });
};

/* -------------------------------------------------------------------------- */
/*                                    EDIT                                    */
/* -------------------------------------------------------------------------- */

export interface UpdateCompanyDefaultSettingsOnesPayload {
  id: string;
  value: boolean;
  status?: string;
}

export interface UpdateCompanyDefaultSettingsOnesResponse {
  success: boolean;
  data: CompanyDefaultSettingsOnes;
}

export const updateCompanyDefaultSettingsOnesFn = async (
  data: UpdateCompanyDefaultSettingsOnesPayload
): Promise<UpdateCompanyDefaultSettingsOnesResponse> => {
  return (
    await axiosInstance({
      url: apiUrls.companies.companyDefaultSettingsOnes.edit.url,
      method: apiUrls.companies.companyDefaultSettingsOnes.edit.method,
      data,
    })
  ).data;
};

export const useUpdateCompanyDefaultSettingsOnes = () => {
  const queryClient = useQueryClient();

  const {
    mutateAsync: updateCompanyDefaultSettingsOnesMutation,
    isPending,
    isSuccess,
    error,
  } = useMutation({
    mutationFn: updateCompanyDefaultSettingsOnesFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          getApiKey(apiUrls.companies.companyDefaultSettingsOnes.list),
        ],
      });
    },
  });

  return {
    updateCompanyDefaultSettingsOnesMutation,
    isPending,
    isSuccess,
    error,
  };
};  