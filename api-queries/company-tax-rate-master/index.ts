import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface CompanyTaxRateLocation {
    countryId:string;
    priority:number;
}

export interface CompanyTaxRateDetails {
    id:string;
    type:string;
    internalTaxId:number;
    taxRateId:number;
    name:string;
    description:string;
    taxRatePercent:number;
    taxOnly:boolean;
    default:boolean;
    priorityRate:boolean;
    userSelectable:boolean;
    startDate?:string;
    endDate?:string | null;

    taxAgencyId:string;
    taxInputControlAccountId:string;
    taxOutputControlAccountId:string;

    positionTaxReportInput:string;
    positionTaxReportOutput:string;

    timezone:string;

    locations?:CompanyTaxRateLocation[];

    taxAgency?:any;
    taxInputAccount?:any;
    taxOutputAccount?:any;
    taxReportInputPosition?:any;
    taxReportOutputPosition?:any;
}


export interface CompanyTaxRateListResponse {
    success:boolean;
    message:string;
    data:{
        count:number;
        rows:CompanyTaxRateDetails[];
    };
}


export interface CompanyTaxRateResponse {
    success:boolean;
    message:string;
    data:CompanyTaxRateDetails;
}


export interface MutateCompanyTaxRateResponse {
    success:boolean;
    message:string;
    data?:CompanyTaxRateDetails;
}


// ---------------------------------------
// SCHEMA
// ---------------------------------------

export const companyTaxRateSchema = z.object({

    type:z.string(),

    internalTaxId:z.number(),

    taxRateId:z.number().optional(),

    name:z.string(),

    description:z.string(),

    taxRatePercent:z.number(),

    taxOnly:z.boolean(),

    default:z.boolean(),

    priorityRate:z.boolean(),

    userSelectable:z.boolean(),

    startDate:z.string().optional(),

    endDate:z.string().nullable().optional(),

    taxAgencyId:z.string(),

    taxInputControlAccountId:z.string(),

    taxOutputControlAccountId:z.string(),

    positionTaxReportInput:z.string(),

    positionTaxReportOutput:z.string(),

    timezone:z.string(),

    locations:z.array(
        z.object({
            countryId:z.string(),
            priority:z.number(),
        })
    ).optional(),

});


export type CompanyTaxRateSchema =
    z.infer<typeof companyTaxRateSchema>;


// ---------------------------------------
// LIST
// ---------------------------------------

export async function getCompanyTaxRates(
    params?:any
):Promise<CompanyTaxRateListResponse>{

    return (
        await axiosInstance({

            url:apiUrls.companyTaxRate.all.url,

            method:apiUrls.companyTaxRate.all.method,

            params,

        })
    ).data;
}



export const useGetCompanyTaxRates = (
    params?:any
)=>
    useQuery({

        queryKey:[
            getApiKey(apiUrls.companyTaxRate),
            params
        ],

        queryFn:()=>getCompanyTaxRates(params),

    });


// ---------------------------------------
// GET BY ID
// ---------------------------------------

export async function getCompanyTaxRateById(
    id:string
):Promise<CompanyTaxRateResponse>{

    return (
        await axiosInstance({

            url:`${apiUrls.companyTaxRate.get.url}/${id}`,

            method:apiUrls.companyTaxRate.get.method,

        })
    ).data;

}



export const useGetCompanyTaxRateById = (
    id:string
)=>
    useQuery({

        queryKey:[
            getApiKey(apiUrls.companyTaxRate),
            id
        ],

        queryFn:()=>getCompanyTaxRateById(id),

        enabled:!!id,

    });


// ---------------------------------------
// CREATE
// ---------------------------------------

export async function createCompanyTaxRate(
    data:CompanyTaxRateSchema
):Promise<MutateCompanyTaxRateResponse>{

    return (
        await axiosInstance({

            url:apiUrls.companyTaxRate.create.url,

            method:apiUrls.companyTaxRate.create.method,

            data,

        })
    ).data;

}



export const useCreateCompanyTaxRate = ()=>{

    const queryClient=useQueryClient();


    return useMutation({

        mutationFn:createCompanyTaxRate,


        onSuccess(){

            queryClient.invalidateQueries({

                queryKey:[
                    getApiKey(apiUrls.companyTaxRate)
                ]

            });

        }

    });

};


// ---------------------------------------
// UPDATE
// ---------------------------------------

export async function updateCompanyTaxRate(
    id:string,
    data:Partial<CompanyTaxRateSchema>
):Promise<MutateCompanyTaxRateResponse>{

    return (
        await axiosInstance({

            url:`${apiUrls.companyTaxRate.update.url}/${id}`,

            method:apiUrls.companyTaxRate.update.method,

            data,

        })
    ).data;

}



export const useUpdateCompanyTaxRate = () => {

    const queryClient = useQueryClient();

    return useMutation({

        mutationFn: ({
            id,
            data
        }: {
            id: string;
            data: Partial<CompanyTaxRateSchema>
        }) => updateCompanyTaxRate(id, data),   // ← Fixed

        onSuccess() {

            queryClient.invalidateQueries({

                queryKey: [
                    getApiKey(apiUrls.companyTaxRate)
                ]

            });

        }

    });

};


// ---------------------------------------
// DELETE
// ---------------------------------------

export async function deleteCompanyTaxRate(
    id:string
):Promise<MutateCompanyTaxRateResponse>{

    return (
        await axiosInstance({

            url:`${apiUrls.companyTaxRate.delete.url}/${id}`,

            method:apiUrls.companyTaxRate.delete.method,

        })
    ).data;

}



export const useDeleteCompanyTaxRate = ()=>{

    const queryClient=useQueryClient();


    return useMutation({

        mutationFn:deleteCompanyTaxRate,


        onSuccess(){

            queryClient.invalidateQueries({

                queryKey:[
                    getApiKey(apiUrls.companyTaxRate)
                ]

            });

        }

    });

};