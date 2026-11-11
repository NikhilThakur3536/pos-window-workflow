import { useQuery } from "@tanstack/react-query";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface LocationItem {
    id:string;
    name:string;
    code?:string;
    status?:string;
}


export interface LocationListResponse {
    success:boolean;
    message:string;
    data:{
        count:number;
        rows:LocationItem[];
    };
}


export type LocationFilterProps = {
    status?:string;
    limit?:number;
    offset?:number;
    countryId?:string;
    stateId?:string;
    regionId?:string;
    cityId?:string;
};


// ---------------------------------------
// COUNTRY
// ---------------------------------------

export async function getCountries(
    data:LocationFilterProps
):Promise<LocationListResponse>{

    return (
        await axiosInstance({

            url:apiUrls.locationMaster.country.list.url,

            method:apiUrls.locationMaster.country.list.method,

            data,

        })
    ).data;

}


export const useGetCountries = (
    data:LocationFilterProps={}
)=>
    useQuery({

        queryKey:[
            getApiKey(apiUrls.locationMaster.country),
            data
        ],

        queryFn:()=>getCountries(data),

    });


// ---------------------------------------
// STATE
// ---------------------------------------

export async function getStates(
    data:LocationFilterProps={}
):Promise<LocationListResponse>{

    return (
        await axiosInstance({

            url:apiUrls.locationMaster.state.list.url,

            method:apiUrls.locationMaster.state.list.method,

            data,

        })
    ).data;

}


export const useGetStates = (
    data:LocationFilterProps={}
)=>
    useQuery({

        queryKey:[
            getApiKey(apiUrls.locationMaster.state),
            data
        ],

        queryFn:()=>getStates(data),

    });


// ---------------------------------------
// REGION
// ---------------------------------------

export async function getRegions(
    data:LocationFilterProps={}
):Promise<LocationListResponse>{

    return (
        await axiosInstance({

            url:apiUrls.locationMaster.region.list.url,

            method:apiUrls.locationMaster.region.list.method,

            data,

        })
    ).data;

}


export const useGetRegions = (
    data:LocationFilterProps={}
)=>
    useQuery({

        queryKey:[
            getApiKey(apiUrls.locationMaster.region),
            data
        ],

        queryFn:()=>getRegions(data),

    });


// ---------------------------------------
// CITY
// ---------------------------------------

export async function getCities(
    data:LocationFilterProps={}
):Promise<LocationListResponse>{

    return (
        await axiosInstance({

            url:apiUrls.locationMaster.city.list.url,

            method:apiUrls.locationMaster.city.list.method,

            data,

        })
    ).data;

}


export const useGetCities = (
    data:LocationFilterProps={}
)=>
    useQuery({

        queryKey:[
            getApiKey(apiUrls.locationMaster.city),
            data
        ],

        queryFn:()=>getCities(data),

    });


// ---------------------------------------
// AREA
// ---------------------------------------

export async function getAreas(
    data:LocationFilterProps={}
):Promise<LocationListResponse>{

    return (
        await axiosInstance({

            url:apiUrls.locationMaster.area.list.url,

            method:apiUrls.locationMaster.area.list.method,

            data,

        })
    ).data;

}


export const useGetAreas = (
    data:LocationFilterProps={}
)=>
    useQuery({

        queryKey:[
            getApiKey(apiUrls.locationMaster.area),
            data
        ],

        queryFn:()=>getAreas(data),

    });


// ---------------------------------------
// DISTRICT
// ---------------------------------------

export async function getDistricts(
    data:LocationFilterProps={}
):Promise<LocationListResponse>{

    return (
        await axiosInstance({

            url:apiUrls.locationMaster.district.list.url,

            method:apiUrls.locationMaster.district.list.method,

            data,

        })
    ).data;

}


export const useGetDistricts = (
    data:LocationFilterProps={}
)=>
    useQuery({

        queryKey:[
            getApiKey(apiUrls.locationMaster.district),
            data
        ],

        queryFn:()=>getDistricts(data),

    });


// ---------------------------------------
// SUB REGION
// ---------------------------------------

export async function getSubRegions(
    data:LocationFilterProps={}
):Promise<LocationListResponse>{

    return (
        await axiosInstance({

            url:apiUrls.locationMaster.subRegion.list.url,

            method:apiUrls.locationMaster.subRegion.list.method,

            data,

        })
    ).data;

}


export const useGetSubRegions = (
    data:LocationFilterProps={}
)=>
    useQuery({

        queryKey:[
            getApiKey(apiUrls.locationMaster.subRegion),
            data
        ],

        queryFn:()=>getSubRegions(data),

    });