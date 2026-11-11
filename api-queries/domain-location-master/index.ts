import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface DomainLocationItem {
    id:string;
    name:string;
    code:string;
    timezone:string;
    domainId:string;
    countryId?:string;
    stateId?:string;
    districtId?:string;
    cityId?:string;
}


export interface DomainLocationResponse {
    success:boolean;
    message:string;
    data:{
        count:number;
        rows:DomainLocationItem[];
    };
}


// ---------------------------------------
// SCHEMAS
// ---------------------------------------

export const countrySchema=z.object({
    name:z.string(),
    code:z.string(),
    timezone:z.string(),
    domainId:z.string(),
});

export const regionSchema=z.object({
    name:z.string(),
    code:z.string(),
    timezone:z.string(),
    domainId:z.string(),
});

export const stateSchema=z.object({
    name:z.string(),
    code:z.string(),
    countryId:z.string(),
    timezone:z.string(),
    domainId:z.string(),
});

export const districtSchema=z.object({
    name:z.string(),
    code:z.string(),
    stateId:z.string(),
    timezone:z.string(),
    domainId:z.string(),
});

export const citySchema=z.object({
    name:z.string(),
    code:z.string(),
    districtId:z.string(),
    timezone:z.string(),
    domainId:z.string(),
});

export const areaSchema=z.object({
    name:z.string(),
    code:z.string(),
    cityId:z.string(),
    timezone:z.string(),
    domainId:z.string(),
});


// ---------------------------------------
// GENERIC LIST
// ---------------------------------------

async function getDomainLocationList(
    url:string,
    data:any={}
){
    return (
        await axiosInstance({
            url,
            method:"post",
            data,
        })
    ).data;
}


// ---------------------------------------
// COUNTRY
// ---------------------------------------

export const useGetDomainCountries=(data:any={})=>
    useQuery({
        queryKey:[
            getApiKey(apiUrls.domainLocation.country),
            data
        ],
        queryFn:()=>getDomainLocationList(
            apiUrls.domainLocation.country.list.url,
            data
        ),
    });



export const useCreateDomainCountry=()=>{

    const queryClient=useQueryClient();

    return useMutation({

        mutationFn:(data:z.infer<typeof countrySchema>)=>
            axiosInstance({
                url:apiUrls.domainLocation.country.create.url,
                method:apiUrls.domainLocation.country.create.method,
                data,
            }),

        onSuccess(){
            queryClient.invalidateQueries({
                queryKey:[
                    getApiKey(apiUrls.domainLocation.country)
                ]
            });
        }
    });
};


// ---------------------------------------
// REGION
// ---------------------------------------

export const useCreateDomainRegion=()=>{

    const queryClient=useQueryClient();

    return useMutation({

        mutationFn:(data:z.infer<typeof regionSchema>)=>
            axiosInstance({
                url:apiUrls.domainLocation.region.create.url,
                method:apiUrls.domainLocation.region.create.method,
                data,
            }),

        onSuccess(){
            queryClient.invalidateQueries({
                queryKey:[
                    getApiKey(apiUrls.domainLocation.region)
                ]
            });
        }
    });
};


// ---------------------------------------
// STATE
// ---------------------------------------

export const useCreateDomainState=()=>{

    const queryClient=useQueryClient();

    return useMutation({

        mutationFn:(data:z.infer<typeof stateSchema>)=>
            axiosInstance({
                url:apiUrls.domainLocation.state.create.url,
                method:apiUrls.domainLocation.state.create.method,
                data,
            }),

        onSuccess(){
            queryClient.invalidateQueries({
                queryKey:[
                    getApiKey(apiUrls.domainLocation.state)
                ]
            });
        }
    });
};


// ---------------------------------------
// DISTRICT
// ---------------------------------------

export const useCreateDomainDistrict=()=>{

    const queryClient=useQueryClient();

    return useMutation({

        mutationFn:(data:z.infer<typeof districtSchema>)=>
            axiosInstance({
                url:apiUrls.domainLocation.district.create.url,
                method:apiUrls.domainLocation.district.create.method,
                data,
            }),

        onSuccess(){
            queryClient.invalidateQueries({
                queryKey:[
                    getApiKey(apiUrls.domainLocation.district)
                ]
            });
        }
    });
};


// ---------------------------------------
// CITY
// ---------------------------------------

export const useCreateDomainCity=()=>{

    const queryClient=useQueryClient();

    return useMutation({

        mutationFn:(data:z.infer<typeof citySchema>)=>
            axiosInstance({
                url:apiUrls.domainLocation.city.create.url,
                method:apiUrls.domainLocation.city.create.method,
                data,
            }),

        onSuccess(){
            queryClient.invalidateQueries({
                queryKey:[
                    getApiKey(apiUrls.domainLocation.city)
                ]
            });
        }
    });
};


// ---------------------------------------
// AREA
// ---------------------------------------

export const useCreateDomainArea=()=>{

    const queryClient=useQueryClient();

    return useMutation({

        mutationFn:(data:z.infer<typeof areaSchema>)=>
            axiosInstance({
                url:apiUrls.domainLocation.area.create.url,
                method:apiUrls.domainLocation.area.create.method,
                data,
            }),

        onSuccess(){
            queryClient.invalidateQueries({
                queryKey:[
                    getApiKey(apiUrls.domainLocation.area)
                ]
            });
        }
    });
};