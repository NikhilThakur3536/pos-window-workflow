import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

export interface TaxAgencyDetails {
    id:string;
    code:number;
    description:string;
    status:string;
    timezone:string;
    domainId:string;
    companyId:string;
}

export interface TaxAgencyListResponse {
    success:boolean;
    message:string;
    data:{
        count:number;
        rows:TaxAgencyDetails[];
    };
}

export const taxAgencySchema = z.object({
    code:z.number(),
    description:z.string(),
    timezone:z.string(),
    domainId:z.string(),
    companyId:z.string(),
});

export type TaxAgencySchema = z.infer<typeof taxAgencySchema>;

export async function getTaxAgencies(params:any) {
    return (
        await axiosInstance({
            url:apiUrls.taxAgency.all.url,
            method:apiUrls.taxAgency.all.method,
            params,
        })
    ).data;
}

export const useGetTaxAgencies = (params:any)=>
    useQuery({
        queryKey:[getApiKey(apiUrls.taxAgency),params],
        queryFn:()=>getTaxAgencies(params),
    });


export async function getTaxAgency(id:string){
    return (
        await axiosInstance({
            url:`${apiUrls.taxAgency.get.url}/${id}`,
            method:apiUrls.taxAgency.get.method,
        })
    ).data;
}

export const useGetTaxAgency=(id:string)=>
    useQuery({
        queryKey:[getApiKey(apiUrls.taxAgency),id],
        queryFn:()=>getTaxAgency(id),
        enabled:!!id,
    });


export async function createTaxAgency(data:TaxAgencySchema){
    return (
        await axiosInstance({
            url:apiUrls.taxAgency.create.url,
            method:apiUrls.taxAgency.create.method,
            data,
        })
    ).data;
}

export const useCreateTaxAgency=()=>{
    const queryClient=useQueryClient();

    return useMutation({
        mutationFn:createTaxAgency,
        onSuccess(){
            queryClient.invalidateQueries({
                queryKey:[getApiKey(apiUrls.taxAgency)]
            });
        }
    });
};


export async function updateTaxAgency(
    id:string,
    data:Partial<TaxAgencySchema>
){
    return (
        await axiosInstance({
            url:`${apiUrls.taxAgency.update.url}/${id}`,
            method:apiUrls.taxAgency.update.method,
            data,
        })
    ).data;
}


export const useUpdateTaxAgency = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data
        }: {
            id: string;
            data: Partial<TaxAgencySchema>
        }) => updateTaxAgency(id, data),  

        onSuccess() {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.taxAgency)]
            });
        }
    });
};


export async function deleteTaxAgency(id:string){
    return (
        await axiosInstance({
            url:`${apiUrls.taxAgency.delete.url}/${id}`,
            method:apiUrls.taxAgency.delete.method,
        })
    ).data;
}

export const useDeleteTaxAgency=()=>{
    const queryClient=useQueryClient();

    return useMutation({
        mutationFn:deleteTaxAgency,
        onSuccess(){
            queryClient.invalidateQueries({
                queryKey:[getApiKey(apiUrls.taxAgency)]
            });
        }
    });
};