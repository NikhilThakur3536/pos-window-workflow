import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface CompanyTaxRegistrationDetails {
    id:string;
    countryId:string;
    registrationNumber:string;
    registrationType:string;
    isPrimary:boolean;
    timezone:string;
    createdAt:string;
    updatedAt:string;
}


export interface CompanyTaxRegistrationListResponse {
    success:boolean;
    message:string;
    data:{
        count:number;
        rows:CompanyTaxRegistrationDetails[];
    };
}


export interface CompanyTaxRegistrationResponse {
    success:boolean;
    message:string;
    data:CompanyTaxRegistrationDetails;
}


export interface MutateCompanyTaxRegistrationResponse {
    success:boolean;
    message:string;
    data?:CompanyTaxRegistrationDetails;
}


// ---------------------------------------
// SCHEMA
// ---------------------------------------

export const companyTaxRegistrationSchema = z.object({

    countryId:z.string(),

    registrationNumber:z.string(),

    registrationType:z.string(),

    isPrimary:z.boolean(),

    timezone:z.string(),

});


export type CompanyTaxRegistrationSchema =
    z.infer<typeof companyTaxRegistrationSchema>;


// ---------------------------------------
// LIST
// ---------------------------------------

export async function getCompanyTaxRegistrations()
:Promise<CompanyTaxRegistrationListResponse>{

    return (
        await axiosInstance({

            url:apiUrls.companyTaxRegistration.all.url,

            method:apiUrls.companyTaxRegistration.all.method,

        })
    ).data;

}


export const useGetCompanyTaxRegistrations = ()=>{

    return useQuery({

        queryKey:[
            getApiKey(apiUrls.companyTaxRegistration)
        ],

        queryFn:getCompanyTaxRegistrations,

    });

};


// ---------------------------------------
// GET BY ID
// ---------------------------------------

export async function getCompanyTaxRegistrationById(
    id:string
):Promise<CompanyTaxRegistrationResponse>{

    return (
        await axiosInstance({

            url:`${apiUrls.companyTaxRegistration.get.url}/${id}`,

            method:apiUrls.companyTaxRegistration.get.method,

        })
    ).data;

}



export const useGetCompanyTaxRegistrationById = (
    id:string
)=>
    useQuery({

        queryKey:[
            getApiKey(apiUrls.companyTaxRegistration),
            id
        ],

        queryFn:()=>getCompanyTaxRegistrationById(id),

        enabled:!!id,

    });


// ---------------------------------------
// CREATE
// ---------------------------------------

export async function createCompanyTaxRegistration(
    data:CompanyTaxRegistrationSchema
):Promise<MutateCompanyTaxRegistrationResponse>{

    return (
        await axiosInstance({

            url:apiUrls.companyTaxRegistration.create.url,

            method:apiUrls.companyTaxRegistration.create.method,

            data,

        })
    ).data;

}



export const useCreateCompanyTaxRegistration = ()=>{

    const queryClient=useQueryClient();


    return useMutation({

        mutationFn:createCompanyTaxRegistration,


        onSuccess(){

            queryClient.invalidateQueries({

                queryKey:[
                    getApiKey(apiUrls.companyTaxRegistration)
                ]

            });

        }

    });

};


// ---------------------------------------
// UPDATE
// ---------------------------------------

export async function updateCompanyTaxRegistration(
    id:string,
    data:Partial<CompanyTaxRegistrationSchema>
):Promise<MutateCompanyTaxRegistrationResponse>{

    return (
        await axiosInstance({

            url:`${apiUrls.companyTaxRegistration.update.url}/${id}`,

            method:apiUrls.companyTaxRegistration.update.method,

            data,

        })
    ).data;

}



export const useUpdateCompanyTaxRegistration = () => {

    const queryClient = useQueryClient();

    return useMutation({

        mutationFn: ({
            id,
            data
        }: {
            id: string;
            data: Partial<CompanyTaxRegistrationSchema>
        }) => updateCompanyTaxRegistration(id, data),   // ← Fixed

        onSuccess() {

            queryClient.invalidateQueries({

                queryKey: [
                    getApiKey(apiUrls.companyTaxRegistration)
                ]

            });

        }

    });

};


// ---------------------------------------
// DELETE
// ---------------------------------------

export async function deleteCompanyTaxRegistration(
    id:string
):Promise<MutateCompanyTaxRegistrationResponse>{

    return (
        await axiosInstance({

            url:`${apiUrls.companyTaxRegistration.delete.url}/${id}`,

            method:apiUrls.companyTaxRegistration.delete.method,

        })
    ).data;

}



export const useDeleteCompanyTaxRegistration = ()=>{

    const queryClient=useQueryClient();


    return useMutation({

        mutationFn:deleteCompanyTaxRegistration,


        onSuccess(){

            queryClient.invalidateQueries({

                queryKey:[
                    getApiKey(apiUrls.companyTaxRegistration)
                ]

            });

        }

    });

};